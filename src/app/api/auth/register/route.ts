import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { hashPassword, sessionFromUser, setSessionCookie } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (fullName.length < 2 || fullName.length > 200) {
      return NextResponse.json({ error: "Saisissez un nom complet valide." }, { status: 400 });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Saisissez une adresse e-mail valide." }, { status: 400 });
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre." }, { status: 400 });
    }

    const id = randomUUID();
    const result = await database.query(
      `INSERT INTO fundora_users (id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'applicant')
       ON CONFLICT DO NOTHING
       RETURNING id, email, full_name, role`,
      [id, email, hashPassword(password), fullName]
    );
    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: "Cette adresse e-mail possède déjà un compte." }, { status: 409 });

    const session = sessionFromUser(user);
    if (!session) return NextResponse.json({ error: "L’inscription est indisponible pour le moment." }, { status: 503 });
    await setSessionCookie(session);

    return NextResponse.json({
      user: { email: session.email, name: session.name, role: session.role, user: session.user },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "L’inscription est indisponible pour le moment." }, { status: 503 });
  }
}