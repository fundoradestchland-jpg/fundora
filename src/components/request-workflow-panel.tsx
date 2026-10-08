"use client";

import { useEffect, useState } from "react";
import { useFundoraRequests } from "@/lib/request-api";

export function RequestWorkflowPanel() {
  const [uploadFeedback, setUploadFeedback] = useState<Record<string, { message: string; isError: boolean }>>({});
  const [uploading, setUploading] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | undefined>>({});
  const { requests, loading, error, mutate, refresh } = useFundoraRequests();

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh()
        .then(() => setUploadFeedback((current) => ({
          ...current,
          refresh: { message: "", isError: false },
        })))
        .catch((reason: unknown) => {
          setUploadFeedback((current) => ({
            ...current,
            refresh: {
              message: reason instanceof Error ? reason.message : "Actualisation des dossiers impossible.",
              isError: true,
            },
          }));
        });
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const selectTaskFile = (taskId: string, operation: "submit-task" | "submit-payment-proof", file?: File) => {
    const key = `${taskId}:${operation}`;
    if (file && file.size > 400_000) {
      setSelectedFiles((current) => ({ ...current, [key]: undefined }));
      setUploadFeedback((current) => ({
        ...current,
        [key]: { message: "Le fichier doit faire 400 Ko maximum.", isError: true },
      }));
      return;
    }
    setSelectedFiles((current) => ({ ...current, [key]: file }));
    setUploadFeedback((current) => ({ ...current, [key]: { message: "", isError: false } }));
  };

  const uploadTaskFile = async (
    requestId: string,
    taskId: string,
    operation: "submit-task" | "submit-payment-proof"
  ) => {
    const key = `${taskId}:${operation}`;
    const file = selectedFiles[key];
    if (!file) {
      setUploadFeedback((current) => ({
        ...current,
        [key]: { message: "Choisissez un fichier avant de l’envoyer.", isError: true },
      }));
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
      setSelectedFiles((current) => ({ ...current, [key]: undefined }));
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
        <div className="workflow-panel-actions">
          <span>{requests.length} demande(s)</span>
          <button
            className="workflow-refresh-button"
            type="button"
            onClick={() => void refresh()
              .then(() => setUploadFeedback((current) => ({
                ...current,
                refresh: { message: "Dossiers actualisés.", isError: false },
              })))
              .catch((reason: unknown) => {
                setUploadFeedback((current) => ({
                  ...current,
                  refresh: {
                    message: reason instanceof Error ? reason.message : "Actualisation des dossiers impossible.",
                    isError: true,
                  },
                }));
              })}
          >
            Actualiser
          </button>
        </div>
      </div>
      {uploadFeedback.refresh?.message && (
        <p className={uploadFeedback.refresh.isError ? "workflow-feedback-error" : "workflow-upload-feedback"} role="status">{uploadFeedback.refresh.message}</p>
      )}

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
                  <a className="workflow-file-action secondary" href={document.dataUrl} target="_blank" rel="noopener noreferrer">Voir</a>
                  <a className="workflow-file-action" href={document.dataUrl} download={document.name}>Télécharger</a>
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
                  {task.fileName && (
                    <div className="workflow-file-links">
                      <strong>{task.fileName}</strong>
                      <a className="workflow-file-action secondary" href={task.fileDataUrl} target="_blank" rel="noopener noreferrer">Voir le document</a>
                      <a className="workflow-file-action" href={task.fileDataUrl} download={task.fileName}>Télécharger</a>
                    </div>
                  )}
                  <div className="workflow-fee-row"><span>Frais annoncés</span><strong>{task.fee.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong></div>
                  {(task.status === "À faire" || task.status === "À corriger") && (
                    <div className="workflow-upload-card">
                      <div className="workflow-upload-copy">
                        <strong>Envoyer le travail demandé</strong>
                        <span>Choisissez votre document terminé (PDF, JPG ou PNG · 400 Ko maximum), puis envoyez-le à l’administration.</span>
                      </div>
                      <label className="workflow-file-picker">
                        <span>{selectedFiles[`${task.id}:submit-task`]?.name ?? "Choisir mon document"}</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={Boolean(uploading)} onChange={(event) => {
                          selectTaskFile(task.id, "submit-task", event.target.files?.[0]);
                          event.target.value = "";
                        }} />
                      </label>
                      <button
                        className="workflow-submit-button"
                        type="button"
                        disabled={Boolean(uploading) || !selectedFiles[`${task.id}:submit-task`]}
                        onClick={() => void uploadTaskFile(request.id, task.id, "submit-task")}
                      >
                        {uploading === `${task.id}:submit-task` ? "Envoi en cours…" : "Envoyer mon travail"}
                      </button>
                    </div>
                  )}
                  {task.responseFileName && (
                    <div className="workflow-file-links workflow-submitted-file">
                      <strong>Réponse envoyée : {task.responseFileName}</strong>
                      <a className="workflow-file-action secondary" href={task.responseDataUrl} target="_blank" rel="noopener noreferrer">Voir ma réponse</a>
                      <a className="workflow-file-action" href={task.responseDataUrl} download={task.responseFileName}>Télécharger</a>
                    </div>
                  )}
                  {task.status === "Validé" && (
                    <p className="workflow-task-approved" role="status">
                      <strong>Travail validé par l’administration</strong>
                      <span>Votre document a été vérifié et accepté.</span>
                    </p>
                  )}
                  {task.status === "Envoyé" && (
                    <p className="workflow-task-pending" role="status">
                      Votre document a été reçu et attend la vérification de l’administration.
                    </p>
                  )}
                  {task.status === "À corriger" && (
                    <p className="workflow-task-correction" role="alert">
                      Une correction est demandée. Consultez la note de l’administration puis envoyez une nouvelle version.
                    </p>
                  )}
                  {uploadFeedback[`${task.id}:submit-task`]?.message && (
                    <p className={uploadFeedback[`${task.id}:submit-task`]?.isError ? "workflow-feedback-error" : "workflow-upload-feedback"} role={uploadFeedback[`${task.id}:submit-task`]?.isError ? "alert" : "status"}>
                      {uploadFeedback[`${task.id}:submit-task`]?.message}
                    </p>
                  )}
                  {task.paymentUrl && task.fee > 0 && (
                    <div className="workflow-payment-action">
                      {task.paymentProofStatus === "Validé" ? (
                        <div className="workflow-payment-success" role="status">
                          <strong>Paiement validé par l’administration</strong>
                          <span>Déjà payé · {task.fee.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                        </div>
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
                        <div className="workflow-file-links workflow-submitted-file">
                          <strong>Preuve envoyée : {task.paymentProofFileName}</strong>
                          <a className="workflow-file-action secondary" href={task.paymentProofDataUrl} target="_blank" rel="noopener noreferrer">Voir ma preuve</a>
                          <a className="workflow-file-action" href={task.paymentProofDataUrl} download={task.paymentProofFileName}>Télécharger</a>
                        </div>
                      )}
                      {task.paymentProofNote && task.paymentProofStatus === "À corriger" && (
                        <p className="workflow-payment-correction" role="alert">{task.paymentProofNote}</p>
                      )}
                      {task.paymentProofStatus !== "Validé" && task.paymentProofStatus !== "À vérifier" && (
                        <div className="workflow-upload-card payment-proof-upload">
                          <div className="workflow-upload-copy">
                            <strong>{task.paymentProofFileName ? "Envoyer une nouvelle preuve de paiement" : "Envoyer ma preuve de paiement"}</strong>
                            <span>Joignez votre reçu ou une capture de confirmation (PDF, JPG ou PNG · 400 Ko maximum), puis envoyez-le à l’administration.</span>
                          </div>
                          <label className="workflow-file-picker">
                            <span>{selectedFiles[`${task.id}:submit-payment-proof`]?.name ?? "Choisir mon justificatif de paiement"}</span>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={Boolean(uploading)} onChange={(event) => {
                              selectTaskFile(task.id, "submit-payment-proof", event.target.files?.[0]);
                              event.target.value = "";
                            }} />
                          </label>
                          <button
                            className="workflow-submit-button"
                            type="button"
                            disabled={Boolean(uploading) || !selectedFiles[`${task.id}:submit-payment-proof`]}
                            onClick={() => void uploadTaskFile(request.id, task.id, "submit-payment-proof")}
                          >
                            {uploading === `${task.id}:submit-payment-proof` ? "Envoi en cours…" : "Envoyer la preuve"}
                          </button>
                        </div>
                      )}
                      {uploadFeedback[`${task.id}:submit-payment-proof`]?.message && (
                        <p className={uploadFeedback[`${task.id}:submit-payment-proof`]?.isError ? "workflow-feedback-error" : "workflow-upload-feedback"} role={uploadFeedback[`${task.id}:submit-payment-proof`]?.isError ? "alert" : "status"}>
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