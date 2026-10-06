"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  getRequestSnapshot,
  getServerRequestSnapshot,
  subscribeToRequestUpdates,
  writeRequests,
  type FundoraRequest,
} from "@/lib/fundora-requests";

const profileEmails: Record<string, string> = {
  anna: "anna.mueller@email.de",
  yann: "yann.martin@email.de",
};

export function RequestWorkflowPanel({ user }: { user: string }) {
  const [uploadError, setUploadError] = useState("");
  const requestSnapshot = useSyncExternalStore(subscribeToRequestUpdates, getRequestSnapshot, getServerRequestSnapshot);
  const requests = useMemo(() => {
    try {
      return JSON.parse(requestSnapshot) as FundoraRequest[];
    } catch {
      return [];
    }
  }, [requestSnapshot]);
  const profileEmail = profileEmails[user.toLowerCase()];

  const userRequests = requests.filter((request) =>
    profileEmail ? request.email.trim().toLowerCase() === profileEmail : true
  );

  const uploadResponse = async (request: FundoraRequest, taskId: string, file: File) => {
    if (file.size > 400_000) {
      setUploadError("Le fichier doit faire 400 Ko maximum.");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
      reader.readAsDataURL(file);
    });

    const next = requests.map((item) => item.id !== request.id ? item : {
      ...item,
      tasks: item.tasks.map((task) => task.id !== taskId ? task : {
        ...task,
        status: "Envoyé" as const,
        reviewNote: "",
        responseFileName: file.name,
        responseDataUrl: dataUrl,
      }),
    });
    writeRequests(next);
  };

  return (
    <section className="panel workflow-panel">
      <div className="panel-header">
        <h3>Mes dossiers, documents et tâches</h3>
        <span>{userRequests.length} demande(s)</span>
      </div>

      {userRequests.length === 0 ? (
        <div className="workflow-empty">
          <strong>Aucun dossier reçu sur ce compte</strong>
          <span>Une fois votre demande envoyée, son suivi et les documents publiés par Fundora apparaîtront ici.</span>
        </div>
      ) : userRequests.map((request) => (
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
                  <a href={document.dataUrl} download={document.name}>{document.name}</a>
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
                    <label className="workflow-upload"><span>Renvoyer le document complété</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadResponse(request, task.id, file);
                      event.target.value = "";
                    }} /></label>
                  )}
                  {task.responseFileName && <a className="workflow-response-link" href={task.responseDataUrl} download={task.responseFileName}>Réponse envoyée : {task.responseFileName}</a>}
                </div>
              ))}
            </div>
          )}
          <small className="workflow-payment-note">Les frais affichés sont des montants annoncés ; aucun paiement n’est traité dans cette version.</small>
        </article>
      ))}
      {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
    </section>
  );
}