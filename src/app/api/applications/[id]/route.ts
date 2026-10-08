import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { getSession } from "@/lib/server-auth";

export const runtime = "nodejs";

const fileLimit = 400_000;

function parseFile(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const file = value as { name?: unknown; dataUrl?: unknown };
  if (typeof file.name !== "string" || typeof file.dataUrl !== "string") throw new Error("Fichier invalide.");
  const match = /^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/=]+)$/.exec(file.dataUrl);
  if (!match) throw new Error("Type de fichier non autorisé.");
  const content = Buffer.from(match[2], "base64");
  if (!content.length || content.length > fileLimit) throw new Error("Chaque fichier doit faire au maximum 400 Ko.");
  return { name: file.name.slice(0, 255), contentType: match[1], content };
}

function parsePaymentUrl(value: unknown) {
  const paymentUrl = typeof value === "string" ? value.trim() : "";
  if (!paymentUrl) return "";
  if (paymentUrl.length > 2048) throw new Error("Le lien de paiement est trop long.");
  let parsed: URL;
  try {
    parsed = new URL(paymentUrl);
  } catch {
    throw new Error("Saisissez un lien de paiement HTTPS valide.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Le lien de paiement doit être une adresse HTTPS sécurisée.");
  }
  return paymentUrl;
}

export async function PATCH(request: Request, context: RouteContext<"/api/applications/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const { id } = await context.params;
  const client = await database.connect();

  try {
    const body = await request.json();
    await client.query("BEGIN");
    const result = await client.query("SELECT id, user_id FROM fundora_applications WHERE id = $1 FOR UPDATE", [id]);
    const application = result.rows[0];
    if (!application || (session.role !== "admin" && application.user_id !== session.userId)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
    }

    if (session.role === "admin" && body.operation === "review") {
      const statuses: Record<string, string> = { "En attente": "pending", "Validée": "approved", "Refusée": "rejected" };
      if (!statuses[body.status]) throw new Error("Statut de dossier invalide.");
      const amount = body.approvedAmount === "" || body.approvedAmount == null ? null : Number(body.approvedAmount);
      if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new Error("Montant approuvé invalide.");
      await client.query(
        "UPDATE fundora_applications SET status=$2, amount_approved=$3, review_note=$4, updated_at=NOW() WHERE id=$1",
        [id, statuses[body.status], amount, String(body.reviewNote ?? "").slice(0, 4000)]
      );
    } else if (session.role === "admin" && body.operation === "document-review") {
      const statuses: Record<string, string> = { "À vérifier": "pending", "Validé": "approved", "À corriger": "needs_correction" };
      if (!statuses[body.status] || typeof body.documentId !== "string") throw new Error("Révision de document invalide.");
      const updated = await client.query(
        "UPDATE fundora_application_documents SET status=$3, review_note=$4, updated_at=NOW() WHERE id=$1 AND application_id=$2",
        [body.documentId, id, statuses[body.status], String(body.note ?? "").slice(0, 2000)]
      );
      if (!updated.rowCount) throw new Error("Document introuvable.");
    } else if (session.role === "admin" && body.operation === "publish-task") {
      if (typeof body.title !== "string" || !body.title.trim()) throw new Error("Titre de tâche requis.");
      const fee = Number(body.fee);
      if (!Number.isFinite(fee) || fee < 0) throw new Error("Frais invalides.");
      const paymentUrl = parsePaymentUrl(body.paymentUrl);
      if (fee > 0 && !paymentUrl) throw new Error("Ajoutez un lien de paiement sécurisé si des frais sont demandés.");
      const file = parseFile(body.file);
      await client.query(
        `INSERT INTO fundora_application_tasks
          (id, application_id, title, instructions, fee_amount, payment_url, published_file_name, published_storage_key, published_file_data, published_content_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [randomUUID(), id, body.title.trim().slice(0, 200), String(body.instructions ?? "").slice(0, 4000), fee, paymentUrl, file?.name ?? null, file ? `postgres:${id}:${file.name}` : null, file?.content ?? null, file?.contentType ?? "application/octet-stream"]
      );
    } else if (session.role === "admin" && body.operation === "task-review") {
      if (typeof body.taskId !== "string" || !["Validé", "À corriger"].includes(body.status)) throw new Error("Révision de tâche invalide.");
      const status = body.status === "Validé" ? "approved" : "needs_correction";
      const updated = await client.query(
        "UPDATE fundora_application_tasks SET status=$3, review_note=$4, updated_at=NOW() WHERE id=$1 AND application_id=$2 AND status='submitted'",
        [body.taskId, id, status, String(body.note ?? "").slice(0, 2000)]
      );
      if (!updated.rowCount) throw new Error("Réponse à vérifier introuvable.");
      await client.query(
        "UPDATE fundora_task_submissions SET status=$2, review_note=$3, reviewed_at=NOW() WHERE id=(SELECT id FROM fundora_task_submissions WHERE task_id=$1 AND submission_type='work' ORDER BY submitted_at DESC LIMIT 1)",
        [body.taskId, status, String(body.note ?? "").slice(0, 2000)]
      );
    } else if (session.role === "admin" && body.operation === "payment-proof-review") {
      if (typeof body.taskId !== "string" || !["Validé", "À corriger"].includes(body.status)) {
        throw new Error("Révision de preuve de paiement invalide.");
      }
      const status = body.status === "Validé" ? "approved" : "needs_correction";
      const updated = await client.query(
        `UPDATE fundora_task_submissions
         SET status=$3, review_note=$4, reviewed_at=NOW()
         WHERE id=(
           SELECT submission.id
           FROM fundora_task_submissions AS submission
           JOIN fundora_application_tasks AS task ON task.id=submission.task_id
           WHERE submission.task_id=$1 AND task.application_id=$2
             AND submission.submission_type='payment_proof'
           ORDER BY submission.submitted_at DESC
           LIMIT 1
         )`,
        [body.taskId, id, status, String(body.note ?? "").slice(0, 2000)]
      );
      if (!updated.rowCount) throw new Error("Preuve de paiement introuvable.");
      await client.query(
        "UPDATE fundora_application_tasks SET fee_status=$3, updated_at=NOW() WHERE id=$1 AND application_id=$2",
        [body.taskId, id, status === "approved" ? "paid" : "pending"]
      );
    } else if (session.role === "applicant" && body.operation === "submit-task") {
      if (typeof body.taskId !== "string") throw new Error("Tâche invalide.");
      const taskResult = await client.query(
        "SELECT id FROM fundora_application_tasks WHERE id=$1 AND application_id=$2 AND status IN ('todo','needs_correction')",
        [body.taskId, id]
      );
      if (!taskResult.rowCount) throw new Error("Cette tâche n’accepte pas de nouveau document.");
      const file = parseFile(body.file);
      if (!file) throw new Error("Document à envoyer requis.");
      await client.query(
        "INSERT INTO fundora_task_submissions (id, task_id, file_name, content_type, file_size_bytes, storage_key, file_data, submission_type) VALUES ($1,$2,$3,$4,$5,$6,$7,'work')",
        [randomUUID(), body.taskId, file.name, file.contentType, file.content.length, `postgres:${body.taskId}:${file.name}`, file.content]
      );
      await client.query("UPDATE fundora_application_tasks SET status='submitted', review_note='', updated_at=NOW() WHERE id=$1", [body.taskId]);
    } else if (session.role === "applicant" && body.operation === "submit-payment-proof") {
      if (typeof body.taskId !== "string") throw new Error("Tâche invalide.");
      const taskResult = await client.query(
        "SELECT id FROM fundora_application_tasks WHERE id=$1 AND application_id=$2 AND fee_amount > 0 AND payment_url <> '' AND fee_status <> 'paid'",
        [body.taskId, id]
      );
      if (!taskResult.rowCount) throw new Error("Aucun lien de paiement n’est disponible pour cette tâche.");
      const file = parseFile(body.file);
      if (!file) throw new Error("Preuve de paiement à envoyer requise.");
      const previousProof = await client.query(
        "SELECT id FROM fundora_task_submissions WHERE task_id=$1 AND submission_type='payment_proof' ORDER BY submitted_at DESC LIMIT 1",
        [body.taskId]
      );
      if (previousProof.rowCount) {
        await client.query(
          "UPDATE fundora_task_submissions SET status='needs_correction', review_note='Nouvelle preuve envoyée par le demandeur.', reviewed_at=NOW() WHERE id=$1",
          [previousProof.rows[0].id]
        );
      }
      await client.query(
        "INSERT INTO fundora_task_submissions (id, task_id, file_name, content_type, file_size_bytes, storage_key, file_data, submission_type) VALUES ($1,$2,$3,$4,$5,$6,$7,'payment_proof')",
        [randomUUID(), body.taskId, file.name, file.contentType, file.content.length, `postgres:${body.taskId}:payment-proof:${file.name}`, file.content]
      );
      await client.query(
        "UPDATE fundora_application_tasks SET fee_status='pending', updated_at=NOW() WHERE id=$1 AND application_id=$2",
        [body.taskId, id]
      );
    } else {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Opération non autorisée." }, { status: 403 });
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    const message = error instanceof Error ? error.message : "Mise à jour impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    client.release();
  }
}