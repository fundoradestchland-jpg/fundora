import { NextResponse } from "next/server";
import { authenticate, setSessionCookie } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.email !== "string" || typeof body.password !== "string" || body.password.length < 1) {
      return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 400 });
    }

    const session = await authenticate(body.email, body.password);
    if (!session) return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });

    await setSessionCookie(session);
    return NextResponse.json({ user: { email: session.email, name: session.name, role: session.role, user: session.user } });
  } catch {
    return NextResponse.json({ error: "La connexion est indisponible pour le moment." }, { status: 503 });
  }
}