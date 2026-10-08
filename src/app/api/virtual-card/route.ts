import { randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { retryTransientDatabaseRead } from "@/lib/db-retry";
import { getSession } from "@/lib/server-auth";
import { validateWithdrawalDetails } from "@/lib/withdrawal-details";

export const runtime = "nodejs";

const themes = new Set(["ocean", "jade", "coral", "midnight", "slate"]);

function formatCardNumber(cardNumber: string | null | undefined) {
  const digits = (cardNumber ?? "4023000000000000").replace(/\D/g, "").slice(0, 16).padEnd(16, "0");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function generateCardNumber() {
  const prefix = "4023";
  const tail = Array.from({ length: 12 }, () => String(randomInt(0, 10))).join("");
  return `${prefix}${tail}`;
}

function generateExpiry() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 5);
  return {
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()).slice(-2),
  };
}

function generateCvv() {
  return String(randomInt(100, 1000)).padStart(3, "0");
}

function toCard(row: {
  id: string;
  display_name: string;
  theme: string;
  card_number?: string | null;
  expiry_month?: string | null;
  expiry_year?: string | null;
  cvv?: string | null;
  balance?: string | number | null;
  created_at: Date;
}) {
  const expiry = generateExpiry();
  return {
    id: row.id,
    reference: row.id.replaceAll("-", "").slice(-8).toUpperCase(),
    displayName: row.display_name,
    theme: row.theme,
    cardNumber: formatCardNumber(row.card_number),
    expiryMonth: row.expiry_month || expiry.month,
    expiryYear: row.expiry_year || expiry.year,
    cvv: row.cvv || "123",
    balance: Number(row.balance ?? 0),
    createdAt: new Date(row.created_at).toISOString(),
    fee: 0,
    paymentEnabled: false,
  };
}

function toWithdrawal(row: {
  id: string;
  amount: string | number;
  status: string;
  beneficiary_name?: string | null;
  bank_name?: string | null;
  withdrawal_method?: string | null;
  created_at: Date;
}) {
  return {
    id: row.id,
    amount: Number(row.amount),
    status: row.status,
    beneficiaryName: row.beneficiary_name || "",
    bankName: row.bank_name || "",
    method: row.withdrawal_method || "",
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function toCredit(row: { id: string; amount: string | number; transfer_reference: string; created_at: Date }) {
  return {
    id: row.id,
    amount: Number(row.amount),
    reference: row.transfer_reference,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (session.role !== "applicant") return NextResponse.json({ error: "Accès demandeur requis." }, { status: 403 });

  try {
    const result = await retryTransientDatabaseRead(() => database.query(
      `SELECT card.id, card.user_id, card.display_name, card.theme, card.card_number,
        card.expiry_month, card.expiry_year, card.cvv,
         COALESCE((SELECT SUM(amount) FROM fundora_card_credits WHERE card_id = card.id), 0)
         - COALESCE((SELECT SUM(amount) FROM fundora_card_withdrawals WHERE card_id = card.id AND status IN ('pending', 'completed')), 0) AS balance
        , card.created_at
       FROM fundora_virtual_cards AS card WHERE user_id = $1 LIMIT 1`,
      [session.userId]
    ));

    const card = result.rows[0] ? toCard(result.rows[0]) : null;
    const withdrawals = card ? await retryTransientDatabaseRead(() => database.query(
      "SELECT id, amount, status, beneficiary_name, bank_name, withdrawal_method, created_at FROM fundora_card_withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
      [session.userId]
    )) : { rows: [] };
    const credits = card ? await retryTransientDatabaseRead(() => database.query(
      "SELECT id, amount, transfer_reference, created_at FROM fundora_card_credits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
      [session.userId]
    )) : { rows: [] };

    return NextResponse.json({
      card: card ? { ...card, withdrawals: withdrawals.rows.map((row) => toWithdrawal(row)), credits: credits.rows.map((row) => toCredit(row)) } : null,
    });
  } catch {
    return NextResponse.json({ error: "Impossible de charger votre carte." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (session.role !== "applicant") return NextResponse.json({ error: "Accès demandeur requis." }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action === "withdraw" ? "withdraw" : "create";

    if (action === "withdraw") {
      const amount = Number(body.amount);
      const withdrawalDetailId = typeof body.withdrawalDetailId === "string" ? body.withdrawalDetailId : "";

      if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
        return NextResponse.json({ error: "Le montant du retrait est invalide." }, { status: 400 });
      }
      if (!withdrawalDetailId) {
        return NextResponse.json({ error: "Sélectionnez des coordonnées de retrait enregistrées." }, { status: 400 });
      }

      const client = await database.connect();
      try {
        await client.query("BEGIN");
        const cardRow = await client.query(
          "SELECT id, display_name, theme, card_number, expiry_month, expiry_year, cvv, created_at FROM fundora_virtual_cards WHERE user_id = $1 FOR UPDATE",
          [session.userId]
        );
        const savedCard = cardRow.rows[0];
        if (!savedCard) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Créez d’abord votre carte gratuite." }, { status: 404 });
        }

        const detailsResult = await client.query(
          `SELECT id, method, beneficiary_name, bank_name, iban, bic, paypal_email,
            mobile_money_provider, mobile_money_phone
           FROM fundora_withdrawal_details
           WHERE id = $1 AND user_id = $2
           FOR SHARE`,
          [withdrawalDetailId, session.userId]
        );
        const savedDetails = detailsResult.rows[0];
        if (!savedDetails) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Ces coordonnées de retrait sont introuvables. Actualisez la page et réessayez." }, { status: 400 });
        }
        const detailsError = validateWithdrawalDetails({
          method: savedDetails.method,
          name: savedDetails.beneficiary_name,
          bankName: savedDetails.bank_name,
          iban: savedDetails.iban,
          bic: savedDetails.bic,
          paypalEmail: savedDetails.paypal_email,
          mobileMoneyProvider: savedDetails.mobile_money_provider,
          mobileMoneyPhone: savedDetails.mobile_money_phone,
        });
        if (detailsError) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Ces coordonnées de retrait sont incomplètes. Modifiez-les dans les paramètres." }, { status: 400 });
        }
        const balanceResult = await client.query(
          `SELECT COALESCE((SELECT SUM(amount) FROM fundora_card_credits WHERE card_id = $1), 0)
           - COALESCE((SELECT SUM(amount) FROM fundora_card_withdrawals WHERE card_id = $1 AND status IN ('pending', 'completed')), 0) AS balance`,
          [savedCard.id]
        );
        const availableBalance = Number(balanceResult.rows[0].balance);
        if (amount > availableBalance) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Le montant demandé dépasse votre solde disponible." }, { status: 400 });
        }

        await client.query(
          `INSERT INTO fundora_card_withdrawals
           (id, user_id, card_id, amount, status, beneficiary_name, bank_name, iban, bic, withdrawal_method, paypal_email, mobile_money_provider, mobile_money_phone, withdrawal_details_id)
           VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id, amount, status, beneficiary_name, bank_name, withdrawal_method, created_at`,
          [randomUUID(), session.userId, savedCard.id, amount, savedDetails.beneficiary_name, savedDetails.bank_name, savedDetails.iban, savedDetails.bic, savedDetails.method, savedDetails.paypal_email, savedDetails.mobile_money_provider, savedDetails.mobile_money_phone, savedDetails.id]
        );
        const withdrawals = await client.query(
          "SELECT id, amount, status, beneficiary_name, bank_name, withdrawal_method, created_at FROM fundora_card_withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
          [session.userId]
        );
        const credits = await client.query(
          "SELECT id, amount, transfer_reference, created_at FROM fundora_card_credits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
          [session.userId]
        );
        const updated = { ...savedCard, balance: availableBalance - amount };
        await client.query("COMMIT");
        return NextResponse.json({ card: { ...toCard(updated), withdrawals: withdrawals.rows.map((row) => toWithdrawal(row)), credits: credits.rows.map((row) => toCredit(row)) } });
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    }

    const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 60) : session.name.slice(0, 60);
    const theme = typeof body.theme === "string" && themes.has(body.theme) ? body.theme : "ocean";
    const expiry = generateExpiry();
    const cardNumber = generateCardNumber();
    const cvv = generateCvv();

    const inserted = await database.query(
      `INSERT INTO fundora_virtual_cards (
        id, user_id, display_name, theme, card_number, expiry_month, expiry_year, cvv
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO NOTHING
      RETURNING id, display_name, theme, card_number, expiry_month, expiry_year, cvv, created_at`,
      [
        randomUUID(),
        session.userId,
        displayName || session.name.slice(0, 60),
        theme,
        cardNumber,
        expiry.month,
        expiry.year,
        cvv,
      ]
    );

    const cardResult = await database.query(
      `SELECT card.id, card.user_id, card.display_name, card.theme, card.card_number,
        card.expiry_month, card.expiry_year, card.cvv,
         COALESCE((SELECT SUM(amount) FROM fundora_card_credits WHERE card_id = card.id), 0)
         - COALESCE((SELECT SUM(amount) FROM fundora_card_withdrawals WHERE card_id = card.id AND status IN ('pending', 'completed')), 0) AS balance
        , card.created_at
       FROM fundora_virtual_cards AS card WHERE user_id = $1 LIMIT 1`,
      [session.userId]
    );
    const card = cardResult.rows[0];

    return NextResponse.json({ card: { ...toCard(card), withdrawals: [], credits: [] }, created: Boolean(inserted.rows[0]) }, { status: inserted.rows[0] ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: "Impossible de créer votre carte pour le moment." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (session.role !== "applicant") return NextResponse.json({ error: "Accès demandeur requis." }, { status: 403 });

  try {
    const body = await request.json();
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const theme = typeof body.theme === "string" ? body.theme : "";

    if (displayName.length < 2 || displayName.length > 60 || !themes.has(theme)) {
      return NextResponse.json({ error: "Nom ou couleur non valide." }, { status: 400 });
    }

    const result = await database.query(
      `UPDATE fundora_virtual_cards
       SET display_name=$2,
           theme=$3,
           updated_at=NOW()
       WHERE user_id=$1
          RETURNING id, display_name, theme, card_number, expiry_month, expiry_year, cvv, created_at`,
          [session.userId, displayName, theme]
    );

    if (!result.rows[0]) return NextResponse.json({ error: "Créez d’abord votre carte gratuite." }, { status: 404 });
    const balance = await database.query(
      `SELECT COALESCE((SELECT SUM(amount) FROM fundora_card_credits WHERE card_id = $1), 0)
       - COALESCE((SELECT SUM(amount) FROM fundora_card_withdrawals WHERE card_id = $1 AND status IN ('pending', 'completed')), 0) AS balance`,
      [result.rows[0].id]
    );
    const withdrawals = await database.query(
      "SELECT id, amount, status, beneficiary_name, bank_name, withdrawal_method, created_at FROM fundora_card_withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
      [session.userId]
    );
    const credits = await database.query("SELECT id, amount, transfer_reference, created_at FROM fundora_card_credits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5", [session.userId]);
    return NextResponse.json({ card: { ...toCard({ ...result.rows[0], balance: balance.rows[0].balance }), withdrawals: withdrawals.rows.map((row) => toWithdrawal(row)), credits: credits.rows.map((row) => toCredit(row)) } });
  } catch {
    return NextResponse.json({ error: "Impossible d’enregistrer les préférences." }, { status: 503 });
  }
}