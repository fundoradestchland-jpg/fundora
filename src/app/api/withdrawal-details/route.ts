import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { retryTransientDatabaseRead } from "@/lib/db-retry";
import { getSession } from "@/lib/server-auth";
import { validateWithdrawalDetails } from "@/lib/withdrawal-details";

export const runtime = "nodejs";

function readDetails(body: Record<string, unknown>) {
  const method = typeof body.method === "string" ? body.method : "";
  const text = (key: string) => {
    const value = body[key];
    return typeof value === "string" ? value.trim() : "";
  };
  return {
    method,
    name: text("name"),
    bankName: method === "bank_transfer" ? text("bankName") : "",
    iban: method === "bank_transfer" ? text("iban") : "",
    bic: method === "bank_transfer" ? text("bic") : "",
    paypalEmail: method === "paypal" ? text("paypalEmail") : "",
    mobileMoneyProvider: method === "mobile_money" ? text("mobileMoneyProvider") : "",
    mobileMoneyPhone: method === "mobile_money" ? text("mobileMoneyPhone") : "",
  };
}

function toDetail(row: {
  id: string;
  method: string;
  beneficiary_name: string;
  bank_name: string;
  iban: string;
  bic: string;
  paypal_email: string;
  mobile_money_provider: string;
  mobile_money_phone: string;
  created_at: Date | string;
}) {
  return {
    id: row.id,
    method: row.method,
    name: row.beneficiary_name,
    bankName: row.bank_name,
    iban: row.iban,
    bic: row.bic,
    paypalEmail: row.paypal_email,
    mobileMoneyProvider: row.mobile_money_provider,
    mobileMoneyPhone: row.mobile_money_phone,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function getApplicantSession() {
  const session = await getSession();
  if (!session) return { response: NextResponse.json({ error: "Connexion requise." }, { status: 401 }) };
  if (session.role !== "applicant") {
    return { response: NextResponse.json({ error: "Accès demandeur requis." }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const auth = await getApplicantSession();
  if ("response" in auth) return auth.response;

  try {
    const result = await retryTransientDatabaseRead(() => database.query(
      `SELECT id, method, beneficiary_name, bank_name, iban, bic, paypal_email,
        mobile_money_provider, mobile_money_phone, created_at
       FROM fundora_withdrawal_details
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [auth.session.userId]
    ));
    return NextResponse.json({ details: result.rows.map((row) => toDetail(row)) });
  } catch {
    return NextResponse.json({ error: "Impossible de charger vos coordonnées de retrait." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await getApplicantSession();
  if ("response" in auth) return auth.response;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Coordonnées de retrait invalides." }, { status: 400 });
    }
    const details = readDetails(body as Record<string, unknown>);
    const validationError = validateWithdrawalDetails(details);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const result = await database.query(
      `INSERT INTO fundora_withdrawal_details (
        id, user_id, method, beneficiary_name, bank_name, iban, bic,
        paypal_email, mobile_money_provider, mobile_money_phone
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, method, beneficiary_name, bank_name, iban, bic, paypal_email,
        mobile_money_provider, mobile_money_phone, created_at`,
      [
        randomUUID(),
        auth.session.userId,
        details.method,
        details.name,
        details.bankName,
        details.iban,
        details.bic,
        details.paypalEmail,
        details.mobileMoneyProvider,
        details.mobileMoneyPhone,
      ]
    );
    return NextResponse.json({ detail: toDetail(result.rows[0]) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossible d’enregistrer ces coordonnées." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await getApplicantSession();
  if ("response" in auth) return auth.response;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Coordonnées de retrait invalides." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const id = typeof input.id === "string" ? input.id : "";
    const details = readDetails(input);
    if (!id) return NextResponse.json({ error: "Coordonnées de retrait introuvables." }, { status: 400 });
    const validationError = validateWithdrawalDetails(details);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const result = await database.query(
      `UPDATE fundora_withdrawal_details
       SET method = $3, beneficiary_name = $4, bank_name = $5, iban = $6, bic = $7,
         paypal_email = $8, mobile_money_provider = $9, mobile_money_phone = $10,
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, method, beneficiary_name, bank_name, iban, bic, paypal_email,
         mobile_money_provider, mobile_money_phone, created_at`,
      [
        id,
        auth.session.userId,
        details.method,
        details.name,
        details.bankName,
        details.iban,
        details.bic,
        details.paypalEmail,
        details.mobileMoneyProvider,
        details.mobileMoneyPhone,
      ]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Coordonnées de retrait introuvables." }, { status: 404 });
    return NextResponse.json({ detail: toDetail(result.rows[0]) });
  } catch {
    return NextResponse.json({ error: "Impossible de modifier ces coordonnées." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const auth = await getApplicantSession();
  if ("response" in auth) return auth.response;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Coordonnées de retrait invalides." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const id = typeof input.id === "string" ? input.id : "";
    if (!id) return NextResponse.json({ error: "Coordonnées de retrait introuvables." }, { status: 400 });

    const result = await database.query(
      "DELETE FROM fundora_withdrawal_details WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, auth.session.userId]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Coordonnées de retrait introuvables." }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Impossible de supprimer ces coordonnées." }, { status: 503 });
  }
}
