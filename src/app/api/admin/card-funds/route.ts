import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { getSession } from "@/lib/server-auth";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Connexion requise." }, { status: 401 }) };
  if (session.role !== "admin") return { error: NextResponse.json({ error: "Accès administration requis." }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const access = await requireAdmin();
  if (access.error) return access.error;

  try {
    const [users, withdrawals] = await Promise.all([
      database.query(`
        SELECT users.id, users.full_name AS name, users.email, card.id AS card_id,
          COALESCE((SELECT SUM(amount) FROM fundora_card_credits WHERE card_id = card.id), 0)
          - COALESCE((SELECT SUM(amount) FROM fundora_card_withdrawals WHERE card_id = card.id AND status IN ('pending', 'completed')), 0) AS balance
        FROM fundora_users AS users
        LEFT JOIN fundora_virtual_cards AS card ON card.user_id = users.id
        WHERE users.role = 'applicant'
        ORDER BY users.full_name
      `),
      database.query(`
        SELECT withdrawal.id, withdrawal.user_id, users.full_name AS name, users.email,
          withdrawal.amount, withdrawal.status, withdrawal.beneficiary_name, withdrawal.bank_name,
          withdrawal.iban, withdrawal.bic, withdrawal.withdrawal_method, withdrawal.paypal_email,
          withdrawal.mobile_money_provider, withdrawal.mobile_money_phone, withdrawal.created_at
        FROM fundora_card_withdrawals AS withdrawal
        JOIN fundora_users AS users ON users.id = withdrawal.user_id
        WHERE withdrawal.status = 'pending'
        ORDER BY withdrawal.created_at ASC
      `),
    ]);
    return NextResponse.json({
      users: users.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        cardId: row.card_id,
        balance: Number(row.balance ?? 0),
      })),
      withdrawals: withdrawals.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        email: row.email,
        amount: Number(row.amount),
        status: row.status,
        beneficiaryName: row.beneficiary_name,
        bankName: row.bank_name,
        iban: row.iban,
        bic: row.bic,
        method: row.withdrawal_method,
        paypalEmail: row.paypal_email,
        mobileMoneyProvider: row.mobile_money_provider,
        mobileMoneyPhone: row.mobile_money_phone,
        createdAt: new Date(row.created_at).toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les soldes et retraits." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;

  const client = await database.connect();
  try {
    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const amount = Number(body.amount);
    const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 120) : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    if (!userId || !Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100 || !reference) {
      return NextResponse.json({ error: "Indiquez un utilisateur, un montant valide et la référence réelle du virement." }, { status: 400 });
    }

    await client.query("BEGIN");
    const card = await client.query("SELECT id FROM fundora_virtual_cards WHERE user_id = $1 FOR UPDATE", [userId]);
    if (!card.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Cet utilisateur doit d’abord créer sa carte virtuelle." }, { status: 404 });
    }
    await client.query(
      `INSERT INTO fundora_card_credits (id, user_id, card_id, amount, transfer_reference, note, credited_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), userId, card.rows[0].id, amount, reference, note, access.session.userId]
    );
    await client.query("COMMIT");
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Cette référence de virement a déjà été enregistrée." }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible d’enregistrer ce versement." }, { status: 400 });
  } finally {
    client.release();
  }
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;

  const client = await database.connect();
  try {
    const body = await request.json();
    const withdrawalId = typeof body.withdrawalId === "string" ? body.withdrawalId : "";
    const status = body.status;
    if (!withdrawalId || !["completed", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Traitement du retrait invalide." }, { status: 400 });
    }

    await client.query("BEGIN");
    const withdrawal = await client.query(
      "SELECT id, card_id FROM fundora_card_withdrawals WHERE id = $1 FOR UPDATE",
      [withdrawalId]
    );
    if (!withdrawal.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Demande de retrait introuvable." }, { status: 404 });
    }
    await client.query("SELECT id FROM fundora_virtual_cards WHERE id = $1 FOR UPDATE", [withdrawal.rows[0].card_id]);
    const updated = await client.query(
      "UPDATE fundora_card_withdrawals SET status = $2, processed_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING id",
      [withdrawalId, status]
    );
    if (!updated.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Impossible de traiter ce retrait." }, { status: 400 });
  } finally {
    client.release();
  }
}
