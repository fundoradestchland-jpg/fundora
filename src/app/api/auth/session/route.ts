import { NextResponse } from "next/server";
import { getSession } from "@/lib/server-auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: { email: session.email, name: session.name, role: session.role, user: session.user } });
  } catch {
    return NextResponse.json({ error: "La vérification de session est indisponible." }, { status: 503 });
  }
}