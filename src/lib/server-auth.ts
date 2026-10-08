import { cookies } from "next/headers";
import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { database } from "@/lib/db";
import { retryTransientDatabaseRead } from "@/lib/db-retry";
import { userSlug } from "@/lib/format";
import { sessionCookieName } from "@/lib/session-cookie";

export { sessionCookieName };
const sessionDurationSeconds = 60 * 60 * 8;

export type FundoraSession = {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "applicant";
  user: string;
  expiresAt: number;
};

type StoredUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  password_hash?: string;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function hashPassword(password: string, salt = randomUUID()) {
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, savedHash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !savedHash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(savedHash, "base64url");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function sessionFromUser(user: StoredUser, expiresAt = Date.now() + sessionDurationSeconds * 1000): FundoraSession | null {
  if (user.role !== "admin" && user.role !== "applicant") return null;
  return {
    userId: user.id,
    email: user.email,
    name: user.full_name,
    role: user.role,
    user: userSlug(user.email, user.id),
    expiresAt,
  };
}

export async function authenticate(email: string, password: string): Promise<FundoraSession | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await retryTransientDatabaseRead(() => database.query(
    "SELECT id, email, full_name, role, password_hash FROM fundora_users WHERE LOWER(email) = $1 LIMIT 1",
    [normalizedEmail]
  ));
  const user = result.rows[0] as StoredUser | undefined;
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) return null;
  return sessionFromUser(user);
}

export function createSessionToken(session: FundoraSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function getSession(): Promise<FundoraSession | null> {
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let cookieSession: FundoraSession;
  try {
    cookieSession = JSON.parse(Buffer.from(payload, "base64url").toString()) as FundoraSession;
  } catch {
    return null;
  }
  if (cookieSession.expiresAt < Date.now() || !cookieSession.userId) return null;

  const result = await retryTransientDatabaseRead(() => database.query(
    "SELECT id, email, full_name, role FROM fundora_users WHERE id = $1 LIMIT 1",
    [cookieSession.userId]
  ));
  const user = result.rows[0] as StoredUser | undefined;
  if (!user) return null;
  return sessionFromUser(user, cookieSession.expiresAt);
}

export async function setSessionCookie(session: FundoraSession) {
  (await cookies()).set(sessionCookieName, createSessionToken(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionDurationSeconds,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(sessionCookieName);
}
