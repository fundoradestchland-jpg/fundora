import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { retryTransientDatabaseRead } from "@/lib/db-retry";
import { getSession } from "@/lib/server-auth";

export const runtime = "nodejs";

const maxFileBytes = 400_000;
const loanDocumentLabels: Record<string, string> = {
  identity: "Pièce d’identité",
  income_expenses: "Justificatifs de revenus et de dépenses",
  bank_statements: "Relevés bancaires",
};

function parseFile(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const file = value as { name?: unknown; dataUrl?: unknown; documentType?: unknown };
  if (typeof file.name !== "string" || typeof file.dataUrl !== "string") throw new Error("Fichier invalide.");
  const match = /^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/=]+)$/.exec(file.dataUrl);
  if (!match) throw new Error("Type de fichier non autorisé.");
  const content = Buffer.from(match[2], "base64");
  if (!content.length || content.length > maxFileBytes) throw new Error("Chaque fichier doit faire au maximum 400 Ko.");
  return {
    name: file.name.slice(0, 255),
    documentType: typeof file.documentType === "string" ? file.documentType : "",
    contentType: match[1],
    content,
  };
}

function fileUrl(content: Buffer | null, contentType: string) {
  return content ? `data:${contentType};base64,${content.toString("base64")}` : "";
}

function toClientRequest(row: Record<string, unknown>, documents: Record<string, unknown>[], tasks: Record<string, unknown>[]) {
  return {
    id: row.id,
    kind: row.kind === "donation" ? "Don" : "Prêt",
    createdAt: new Date(String(row.created_at)).toISOString(),
    fullName: row.applicant_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    country: row.country,
    subject: row.subject,
    amountRequested: String(row.amount_requested),
    details: row.details,
    status: row.status === "approved" ? "Validée" : row.status === "rejected" ? "Refusée" : "En attente",
    reviewNote: row.review_note,
    approvedAmount: row.amount_approved == null ? "" : String(row.amount_approved),
    documents: documents.filter((document) => document.application_id === row.id).map((document) => ({
      id: document.id,
      name: document.file_name,
      size: Number(document.file_size_bytes),
      dataUrl: fileUrl(document.file_data as Buffer | null, String(document.content_type)),
      status: document.status === "approved" ? "Validé" : document.status === "needs_correction" ? "À corriger" : "À vérifier",
      note: document.review_note,
    })),
    tasks: tasks.filter((task) => task.application_id === row.id).map((task) => ({
      id: task.id,
      title: task.title,
      instructions: task.instructions,
      fee: Number(task.fee_amount),
      paymentUrl: typeof task.payment_url === "string" ? task.payment_url : "",
      fileName: task.published_file_name ?? "",
      fileDataUrl: fileUrl(task.published_file_data as Buffer | null, String(task.published_content_type)),
      status: task.status === "approved" ? "Validé" : task.status === "needs_correction" ? "À corriger" : task.status === "submitted" ? "Envoyé" : "À faire",
      reviewNote: task.review_note,
      responseFileName: task.submission_file_name ?? "",
      responseDataUrl: fileUrl(task.submission_file_data as Buffer | null, String(task.submission_content_type ?? "application/octet-stream")),
      paymentProofFileName: task.payment_proof_file_name ?? "",
      paymentProofDataUrl: fileUrl(task.payment_proof_file_data as Buffer | null, String(task.payment_proof_content_type ?? "application/octet-stream")),
      paymentProofStatus: task.payment_proof_status === "approved"
        ? "Validé"
        : task.payment_proof_status === "needs_correction"
          ? "À corriger"
          : task.payment_proof_status === "submitted"
            ? "À vérifier"
            : "Aucune",
      paymentProofNote: task.payment_proof_note ?? "",
    })),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  try {
    const applications = await retryTransientDatabaseRead(async () => {
      const applicationQuery = session.role === "admin"
        ? database.query("SELECT * FROM fundora_applications ORDER BY created_at DESC LIMIT 300")
        : database.query("SELECT * FROM fundora_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [session.userId]);
      const applicationResult = await applicationQuery;
      const applicationIds = applicationResult.rows.map((row) => row.id);
      if (applicationIds.length === 0) return [];

      const [documentResult, taskResult] = await Promise.all([
        database.query(
          "SELECT * FROM fundora_application_documents WHERE application_id = ANY($1::uuid[]) ORDER BY created_at",
          [applicationIds]
        ),
        database.query(`
          SELECT task.*,
            work_submission.file_name AS submission_file_name,
            work_submission.file_data AS submission_file_data,
            work_submission.content_type AS submission_content_type,
            proof_submission.file_name AS payment_proof_file_name,
            proof_submission.file_data AS payment_proof_file_data,
            proof_submission.content_type AS payment_proof_content_type,
            proof_submission.status AS payment_proof_status,
            proof_submission.review_note AS payment_proof_note
          FROM fundora_application_tasks AS task
          LEFT JOIN LATERAL (
            SELECT file_name, file_data, content_type, status, review_note FROM fundora_task_submissions
            WHERE task_id = task.id AND submission_type = 'work'
            ORDER BY submitted_at DESC LIMIT 1
          ) AS work_submission ON TRUE
          LEFT JOIN LATERAL (
            SELECT file_name, file_data, content_type, status, review_note FROM fundora_task_submissions
            WHERE task_id = task.id AND submission_type = 'payment_proof'
            ORDER BY submitted_at DESC LIMIT 1
          ) AS proof_submission ON TRUE
          WHERE task.application_id = ANY($1::uuid[])
          ORDER BY task.created_at
        `, [applicationIds]),
      ]);

      return applicationResult.rows.map((row) => toClientRequest(row, documentResult.rows, taskResult.rows));
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Applications GET failed", (error as NodeJS.ErrnoException).code ?? "query_error");
    return NextResponse.json({ error: "Impossible de lire les demandes." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "applicant") {
    return NextResponse.json({ error: "Connectez-vous à un compte demandeur." }, { status: 401 });
  }

  const client = await database.connect();
  try {
    const body = await request.json();
    const kind = body.kind === "Don" ? "donation" : body.kind === "Prêt" ? "loan" : null;
    const amount = Number(body.amountRequested);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!kind || typeof body.fullName !== "string" || !body.fullName.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        typeof body.subject !== "string" || !body.subject.trim() || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Les informations du dossier sont invalides." }, { status: 400 });
    }

    const documents: NonNullable<ReturnType<typeof parseFile>>[] = [];
    if (Array.isArray(body.documents)) {
      for (const file of body.documents as unknown[]) {
        const parsedFile = parseFile(file);
        if (parsedFile) documents.push(parsedFile);
      }
    }
    if (kind === "loan") {
      const submittedDocumentTypes = new Set(documents.map((document) => document.documentType));
      if (Object.keys(loanDocumentLabels).some((documentType) => !submittedDocumentTypes.has(documentType)) ||
          documents.length !== Object.keys(loanDocumentLabels).length) {
        return NextResponse.json({ error: "Joignez les trois justificatifs obligatoires : pièce d’identité, revenus et dépenses, relevés bancaires." }, { status: 400 });
      }
    }
    const applicationId = randomUUID();
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO fundora_applications
        (id, user_id, kind, applicant_name, email, phone, city, country, subject, amount_requested, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [applicationId, session.userId, kind, body.fullName.trim().slice(0, 200), email, String(body.phone ?? "").slice(0, 80), String(body.city ?? "").slice(0, 120), String(body.country ?? "").slice(0, 120), body.subject.trim().slice(0, 200), amount, String(body.details ?? "").slice(0, 10000)]
    );

    for (const document of documents) {
      await client.query(
        `INSERT INTO fundora_application_documents
          (id, application_id, file_name, content_type, file_size_bytes, storage_key, file_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          randomUUID(),
          applicationId,
          kind === "loan" ? `${loanDocumentLabels[document.documentType]} - ${document.name}` : document.name,
          document.contentType,
          document.content.length,
          `postgres:${applicationId}:${document.name}`,
          document.content,
        ]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ id: applicationId }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    const message = error instanceof Error ? error.message : "Échec de l’enregistrement.";
    return NextResponse.json({ error: message.includes("400 Ko") || message.includes("fichier") ? message : "Impossible d’enregistrer la demande." }, { status: 400 });
  } finally {
    client.release();
  }
}