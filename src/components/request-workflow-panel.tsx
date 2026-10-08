"use client";

import { useState } from "react";
import { useFundoraRequests } from "@/lib/request-api";

export function RequestWorkflowPanel() {
  const [uploadFeedback, setUploadFeedback] = useState<Record<string, { message: string; isError: boolean }>>({});
  const [uploading, setUploading] = useState("");
  const { requests, loading, error, mutate } = useFundoraRequests();

  const uploadTaskFile = async (
    requestId: string,
    taskId: string,
    file: File,
    operation: "submit-task" | "submit-payment-proof"
  ) => {
    const key = `${taskId}:${operation}`;
    if (file.size > 400_000) {
      setUploadFeedback((current) => ({ ...current, [key]: { message: "Le fichier doit faire 400 Ko maximum.", isError: true } }));
      return;
    }

    setUploading(key);
    setUploadFeedback((current) => ({ ...current, [key]: { message: "", isError: false } }));
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
        reader.readAsDataURL(file);
      });
      await mutate(requestId, operation, { taskId, file: { name: file.name, dataUrl } });
      setUploadFeedback((current) => ({
        ...current,
        [key]: {
          message: operation === "submit-task"
            ? "Votre document de travail a été envoyé."
            : "Votre preuve de paiement a été envoyée à l’administration.",
          isError: false,
        },
      }));
    } catch (reason) {
      setUploadFeedback((current) => ({
        ...current,
        [key]: { message: reason instanceof Error ? reason.message : "Envoi du fichier impossible.", isError: true },
      }));
    } finally {
      setUploading("");
    }
  };

  return (
    <section className="panel workflow-panel" id="demandes">
      <div className="panel-header">
        <h3>Mes dossiers, documents et tâches</h3>
        <span>{requests.length} demande(s)</span>
      </div>

      {loading ? <div className="workflow-empty"><strong>Chargement de vos dossiers…</strong></div> : error ? (
        <div className="workflow-empty"><strong>Connexion requise</strong><span>{error}</span></div>
      ) : requests.length === 0 ? (
        <div className="workflow-empty">
          <strong>Aucun dossier reçu sur ce compte</strong>
          <span>Une fois votre demande envoyée, son suivi et les documents publiés par Fundora apparaîtront ici.</span>
        </div>
      ) : requests.map((request) => (
        <article className="workflow-request" key={request.id}>
          <header className="workflow-request-header">
            <div>
              <span className={`request-kind-mark ${request.kind === "Don" ? "donation" : "loan"}`}>{request.kind}</span>
              <h4>{request.subject}</h4>
              <small>Réf. {request.id.slice(0, 8).toUpperCase()} · {new Date(request.createdAt).toLocaleDateString("fr-FR")}</small>
            </div>
            <span className={`review-badge ${request.status.toLowerCase().replace("é", "e")}`}>{request.status}</span>
          </header>

          <div className="workflow-amount-row">
            <span>Montant demandé <strong>{request.amountRequested} €</strong></span>
            {request.approvedAmount && <span>Montant approuvé <strong>{request.approvedAmount} €</strong></span>}
          </div>
          {request.reviewNote && <p className="workflow-review-note">{request.reviewNote}</p>}

          {request.documents.length > 0 && (
            <div className="workflow-subsection">
              <h5>Pièces transmises</h5>
              {request.documents.map((document) => (
                <div className="workflow-document-row" key={document.id}>
                  <strong>{document.name}</strong>
                  <a href={document.dataUrl} target="_blank" rel="noopener noreferrer">Voir</a>
                  <a href={document.dataUrl} download={document.name}>Télécharger</a>
                  <span className={`review-badge ${document.status === "Validé" ? "validee" : document.status === "À corriger" ? "refusee" : "en-attente"}`}>{document.status}</span>
                  {document.note && <small>{document.note}</small>}
                </div>
              ))}
            </div>
          )}

          {request.tasks.length > 0 && (
            <div className="workflow-subsection">
              <h5>Documents, contrats et tâches publiés</h5>
              {request.tasks.map((task) => (
                <div className="workflow-task" key={task.id}>
                  <div className="workflow-task-heading">
                    <div><strong>{task.title}</strong><span>{task.instructions || "Consultez le document et suivez les instructions de Fundora."}</span></div>
                    <span className={`review-badge ${task.status === "Validé" ? "validee" : task.status === "À corriger" ? "refusee" : task.status === "Envoyé" ? "en-attente" : "a-faire"}`}>{task.status}</span>
                  </div>
                  {task.reviewNote && <small className="workflow-review-note">{task.reviewNote}</small>}
                  {task.fileName && <a className="workflow-download" href={task.fileDataUrl} download={task.fileName}>Télécharger le document · {task.fileName}</a>}
                  <div className="workflow-fee-row"><span>Frais annoncés</span><strong>{task.fee.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong></div>
                  {(task.status === "À faire" || task.status === "À corriger") && (
                    <label className="workflow-upload"><span>Envoyer le travail demandé (PDF ou image, 400 Ko maximum)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={Boolean(uploading)} onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadTaskFile(request.id, task.id, file, "submit-task");
                      event.target.value = "";
                    }} /></label>
                  )}
                  {task.responseFileName && <a className="workflow-response-link" href={task.responseDataUrl} download={task.responseFileName}>Réponse envoyée : {task.responseFileName}</a>}
                  {uploadFeedback[`${task.id}:submit-task`]?.message && (
                    <p className={uploadFeedback[`${task.id}:submit-task`]?.isError ? "form-error" : "workflow-upload-feedback"} role={uploadFeedback[`${task.id}:submit-task`]?.isError ? "alert" : "status"}>
                      {uploadFeedback[`${task.id}:submit-task`]?.message}
                    </p>
                  )}
                  {task.paymentUrl && task.fee > 0 && (
                    <div className="workflow-payment-action">
                      {task.paymentProofStatus === "Validé" ? (
                        <p className="workflow-payment-success" role="status">
                          Paiement validé par l’administration · {task.fee.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                        </p>
                      ) : task.paymentProofStatus === "À vérifier" ? (
                        <p className="workflow-payment-pending" role="status">
                          Votre preuve de paiement a été reçue. Le paiement est en attente de validation par l’administration.
                        </p>
                      ) : (
                        <>
                          <strong>Étape 1 · Régler les frais</strong>
                          <p>Après le règlement, revenez ici pour envoyer votre reçu ou une capture de la confirmation.</p>
                          <a className="primary-button" href={task.paymentUrl} target="_blank" rel="noopener noreferrer">
                            Payer {task.fee.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                          </a>
                          <small>Le paiement est effectué par le prestataire externe. Fundora ne reçoit pas les données de votre carte via ce lien.</small>
                          <strong>Étape 2 · Envoyer la preuve de paiement</strong>
                        </>
                      )}
                      {task.paymentProofFileName && (
                        <a className="workflow-response-link" href={task.paymentProofDataUrl} download={task.paymentProofFileName}>
                          Preuve envoyée : {task.paymentProofFileName}
                        </a>
                      )}
                      {task.paymentProofNote && task.paymentProofStatus === "À corriger" && (
                        <p className="workflow-payment-correction" role="alert">{task.paymentProofNote}</p>
                      )}
                      {task.paymentProofStatus !== "Validé" && task.paymentProofStatus !== "À vérifier" && (
                        <label className="workflow-upload">
                          <span>{task.paymentProofFileName ? "Envoyer une nouvelle preuve de paiement (PDF ou image, 400 Ko maximum)" : "Joindre le reçu ou une capture de confirmation (PDF ou image, 400 Ko maximum)"}</span>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={Boolean(uploading)} onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadTaskFile(request.id, task.id, file, "submit-payment-proof");
                            event.target.value = "";
                          }} />
                        </label>
                      )}
                      {uploadFeedback[`${task.id}:submit-payment-proof`]?.message && (
                        <p className={uploadFeedback[`${task.id}:submit-payment-proof`]?.isError ? "form-error" : "workflow-upload-feedback"} role={uploadFeedback[`${task.id}:submit-payment-proof`]?.isError ? "alert" : "status"}>
                          {uploadFeedback[`${task.id}:submit-payment-proof`]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <small className="workflow-payment-note">Les frais affichés sont annoncés par l’administration. Le lien de paiement, lorsqu’il est fourni, ouvre le service sécurisé du prestataire.</small>
        </article>
      ))}
    </section>
  );
}