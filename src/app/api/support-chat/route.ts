import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { getSession } from "@/lib/server-auth";

export const runtime = "nodejs";

const maxMessageLength = 2000;

function databaseError(error: unknown, operation: string) {
  const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
  console.error("Support chat failed", { operation, code: code ?? "chat_error" });
  if (code === "42P01") {
    return NextResponse.json(
      { error: "La messagerie n’est pas encore configurée sur cette base. L’administrateur doit appliquer les migrations de la base de données." },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { error: "La messagerie est momentanément indisponible. Réessayez plus tard." },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

    if (session.role === "admin") {
      const contacts = await database.query(`
        SELECT
          applicant.id,
          applicant.full_name AS name,
          applicant.email,
          latest.message AS last_message,
          latest.created_at AS last_message_at,
          (
            SELECT COUNT(*)::int
            FROM fundora_support_messages AS unread
            WHERE unread.applicant_id = applicant.id
              AND unread.sender_id = applicant.id
              AND unread.read_at IS NULL
          ) AS unread_count
        FROM fundora_users AS applicant
        LEFT JOIN LATERAL (
          SELECT message, created_at
          FROM fundora_support_messages
          WHERE applicant_id = applicant.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS latest ON TRUE
        WHERE applicant.role = 'applicant'
        ORDER BY latest.created_at DESC NULLS LAST, LOWER(applicant.full_name)
        LIMIT 200
      `);

      const applicantId = new URL(request.url).searchParams.get("applicantId");
      if (!applicantId) return NextResponse.json({ contacts: contacts.rows, messages: [] });

      const contact = contacts.rows.find((item) => item.id === applicantId);
      if (!contact) return NextResponse.json({ error: "Compte demandeur introuvable." }, { status: 404 });

      const result = await database.query(`
        SELECT message.id, message.sender_id, sender.full_name AS sender_name,
          sender.role AS sender_role, message.message, message.created_at
        FROM fundora_support_messages AS message
        JOIN fundora_users AS sender ON sender.id = message.sender_id
        WHERE message.applicant_id = $1
        ORDER BY message.created_at DESC
        LIMIT 100
      `, [applicantId]);

      await database.query(
        "UPDATE fundora_support_messages SET read_at = NOW() WHERE applicant_id = $1 AND sender_id = $1 AND read_at IS NULL",
        [applicantId]
      );

      return NextResponse.json({
        contacts: contacts.rows,
        messages: result.rows.reverse(),
        selectedContact: { id: contact.id, name: contact.name, email: contact.email },
      });
    }

    const result = await database.query(`
      SELECT message.id, message.sender_id, sender.full_name AS sender_name,
        sender.role AS sender_role, message.message, message.created_at
      FROM fundora_support_messages AS message
      JOIN fundora_users AS sender ON sender.id = message.sender_id
      WHERE message.applicant_id = $1
      ORDER BY message.created_at DESC
      LIMIT 100
    `, [session.userId]);

    await database.query(
      "UPDATE fundora_support_messages SET read_at = NOW() WHERE applicant_id = $1 AND sender_id <> $1 AND read_at IS NULL",
      [session.userId]
    );

    return NextResponse.json({ contacts: [], messages: result.rows.reverse() });
  } catch (error) {
    return databaseError(error, "GET");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > maxMessageLength) {
      return NextResponse.json(
        { error: `Votre message doit contenir entre 1 et ${maxMessageLength} caractères.` },
        { status: 400 }
      );
    }

    let applicantId: string;
    if (session.role === "admin") {
      if (typeof body.applicantId !== "string") {
        return NextResponse.json({ error: "Choisissez un compte demandeur." }, { status: 400 });
      }
      const recipient = await database.query(
        "SELECT id FROM fundora_users WHERE id = $1 AND role = 'applicant' LIMIT 1",
        [body.applicantId]
      );
      if (!recipient.rowCount) return NextResponse.json({ error: "Compte demandeur introuvable." }, { status: 404 });
      applicantId = body.applicantId;
    } else {
      applicantId = session.userId;
    }

    const result = await database.query(`
      INSERT INTO fundora_support_messages (id, applicant_id, sender_id, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id, sender_id, message, created_at
    `, [randomUUID(), applicantId, session.userId, message]);

    return NextResponse.json({
      message: {
        ...result.rows[0],
        sender_name: session.name,
        sender_role: session.role,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Le contenu du message est invalide." }, { status: 400 });
    }
    return databaseError(error, "POST");
  }
}
