"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { getAdminSessionSnapshot, getServerAdminSessionSnapshot, subscribeToAdminSession } from "@/lib/admin-session";
import {
  createId,
  getRequestSnapshot,
  getServerRequestSnapshot,
  subscribeToRequestUpdates,
  writeRequests,
  type FundoraRequest,
  type RequestKind,
  type DocumentStatus,
} from "@/lib/fundora-requests";

type FilterKind = "Toutes" | RequestKind;

export default function AdminApplicationsPage() {
  const router = useRouter();
  const authorized = useSyncExternalStore(subscribeToAdminSession, getAdminSessionSnapshot, getServerAdminSessionSnapshot);
  const requestSnapshot = useSyncExternalStore(subscribeToRequestUpdates, getRequestSnapshot, getServerRequestSnapshot);
  const requests = useMemo(() => {
    try {
      return JSON.parse(requestSnapshot) as FundoraRequest[];
    } catch {
      return [];
    }
  }, [requestSnapshot]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<FilterKind>("Toutes");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskFee, setTaskFee] = useState("0");
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authorized === false) {
      router.replace("/login?access=admin");
      return;
    }
  }, [authorized, router]);

  const filteredRequests = useMemo(
    () => requests.filter((request) => filter === "Toutes" || request.kind === filter),
    [filter, requests]
  );
  const selectedRequest = filteredRequests.find((request) => request.id === selectedId) ?? filteredRequests[0];
  const waitingCount = requests.filter((request) => request.status === "En attente").length;
  const totalFees = selectedRequest?.tasks.reduce((sum, task) => sum + task.fee, 0) ?? 0;

  const updateSelected = (updated: FundoraRequest) => {
    writeRequests(requests.map((request) => request.id === updated.id ? updated : request));
  };

  const saveDecision = (status: FundoraRequest["status"]) => {
    if (!selectedRequest) return;
    updateSelected({ ...selectedRequest, status });
    setMessage(status === "Validée" ? "Demande validée." : "Demande refusée.");
  };

  const updateDocument = (documentId: string, status: DocumentStatus, note: string) => {
    if (!selectedRequest) return;
    updateSelected({
      ...selectedRequest,
      documents: selectedRequest.documents.map((document) =>
        document.id === documentId ? { ...document, status, note } : document
      ),
    });
  };

  const publishTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest || !taskTitle.trim()) return;

    if (taskFile && taskFile.size > 400_000) {
      setMessage("Le document joint doit faire 400 Ko maximum.");
      return;
    }

    let fileDataUrl = "";
    if (taskFile) {
      fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Lecture du document impossible."));
        reader.readAsDataURL(taskFile);
      });
    }

    updateSelected({
      ...selectedRequest,
      tasks: [
        ...selectedRequest.tasks,
        {
          id: createId(),
          title: taskTitle.trim(),
          instructions: taskInstructions.trim(),
          fee: Math.max(0, Number(taskFee) || 0),
          fileName: taskFile?.name ?? "",
          fileDataUrl,
          status: "À faire",
          reviewNote: "",
          responseFileName: "",
          responseDataUrl: "",
        },
      ],
    });
    setTaskTitle("");
    setTaskInstructions("");
    setTaskFee("0");
    setTaskFile(null);
    setMessage("La tâche et le document sont publiés sur le dashboard du demandeur.");
  };

  const logout = () => {
    localStorage.removeItem("fundora_session");
    router.push("/login");
  };

  if (authorized !== true) {
    return <main className="page-shell auth-page"><section className="auth-shell"><div className="auth-panel auth-form-panel"><h1>Vérification de l’accès admin…</h1></div></section></main>;
  }

  return (
    <main className="page-shell admin-review-page">
      <nav className="topbar" aria-label="Navigation admin">
        <div className="brand"><BrandGlyph /><span className="brand-word">Fundora</span></div>
        <div className="nav-links">
          <Link href="/admin/dons">Campagnes</Link>
          <Link href="/admin/dossiers" aria-current="page">Demandes</Link>
        </div>
        <button className="nav-button" type="button" onClick={logout}>Déconnexion</button>
      </nav>

      <section className="admin-review-shell">
        <header className="admin-review-heading">
          <div>
            <span className="eyebrow">Espace sécurisé · Administration</span>
            <h1>Examen des dossiers</h1>
            <p>Vérifiez les pièces, prenez une décision et publiez les prochaines étapes au demandeur.</p>
          </div>
          <div className="admin-review-counter"><strong>{waitingCount}</strong><span>à examiner</span></div>
        </header>

        <div className="admin-review-filters" role="group" aria-label="Filtrer les demandes">
          {(["Toutes", "Don", "Prêt"] as FilterKind[]).map((kind) => (
            <button key={kind} className={filter === kind ? "active" : ""} type="button" onClick={() => setFilter(kind)}>
              {kind === "Toutes" ? `Toutes (${requests.length})` : `${kind}s (${requests.filter((item) => item.kind === kind).length})`}
            </button>
          ))}
        </div>

        <div className="admin-review-layout">
          <aside className="admin-request-list" aria-label="Liste des demandes">
            {filteredRequests.length === 0 ? (
              <div className="admin-empty-state"><strong>Aucune demande pour le moment</strong><span>Les demandes envoyées apparaîtront ici.</span></div>
            ) : filteredRequests.map((request) => (
              <button
                className={`admin-request-row ${selectedRequest?.id === request.id ? "selected" : ""}`}
                key={request.id}
                type="button"
                onClick={() => setSelectedId(request.id)}
              >
                <span className={`request-kind-mark ${request.kind === "Don" ? "donation" : "loan"}`}>{request.kind}</span>
                <strong>{request.fullName}</strong>
                <span>{request.subject}</span>
                <span className="admin-request-row-bottom"><small>{request.amountRequested} € demandés</small><em className={`review-badge ${request.status.toLowerCase().replace("é", "e")}`}>{request.status}</em></span>
              </button>
            ))}
          </aside>

          {selectedRequest ? (
            <article className="admin-request-detail">
              <header className="admin-detail-header">
                <div>
                  <span className={`request-kind-mark ${selectedRequest.kind === "Don" ? "donation" : "loan"}`}>{selectedRequest.kind}</span>
                  <h2>{selectedRequest.fullName}</h2>
                  <p>{selectedRequest.email} · {selectedRequest.phone} · {selectedRequest.city}, {selectedRequest.country}</p>
                </div>
                <div className="admin-request-amount"><small>Montant demandé</small><strong>{selectedRequest.amountRequested} €</strong></div>
              </header>

              <section className="admin-detail-section">
                <div className="admin-section-title"><h3>Dossier & pièces reçues</h3><span>{selectedRequest.documents.length} fichier(s)</span></div>
                <div className="admin-applicant-summary">
                  <strong>{selectedRequest.subject}</strong>
                  <p>{selectedRequest.details}</p>
                </div>
                {selectedRequest.documents.length === 0 ? (
                  <p className="admin-empty-inline">Aucun fichier joint au dossier.</p>
                ) : selectedRequest.documents.map((document) => (
                  <div className="admin-document-row" key={document.id}>
                    <div className="admin-document-file">
                      <a href={document.dataUrl} download={document.name}>{document.name}</a>
                      <small>{Math.max(1, Math.round(document.size / 1024))} Ko</small>
                    </div>
                    <select
                      aria-label={`Statut de ${document.name}`}
                      value={document.status}
                      onChange={(event) => updateDocument(document.id, event.target.value as DocumentStatus, document.note)}
                    >
                      <option>À vérifier</option><option>Validé</option><option>À corriger</option>
                    </select>
                    <input
                      aria-label={`Commentaire pour ${document.name}`}
                      placeholder="Commentaire / pièce à corriger"
                      value={document.note}
                      onChange={(event) => updateDocument(document.id, document.status, event.target.value)}
                    />
                  </div>
                ))}
              </section>

              <section className="admin-detail-section admin-decision-section">
                <div className="admin-section-title"><h3>Décision du dossier</h3><span>Visible dans le dashboard</span></div>
                <div className="admin-decision-fields">
                  <label className="field"><span>Montant approuvé (€)</span><input type="number" min="0" value={selectedRequest.approvedAmount} onChange={(event) => updateSelected({ ...selectedRequest, approvedAmount: event.target.value })} placeholder="Ex. 2500" /></label>
                  <label className="field"><span>Message au demandeur</span><textarea value={selectedRequest.reviewNote} onChange={(event) => updateSelected({ ...selectedRequest, reviewNote: event.target.value })} placeholder="Décision, conditions ou motif du refus" /></label>
                </div>
                <div className="admin-decision-actions">
                  <button className="secondary-button" type="button" onClick={() => saveDecision("Refusée")}>Refuser le dossier</button>
                  <button className="primary-button" type="button" onClick={() => saveDecision("Validée")}>Valider le dossier</button>
                </div>
              </section>

              <section className="admin-detail-section">
                <div className="admin-section-title"><h3>Publier une tâche ou un contrat</h3><span>{selectedRequest.tasks.length} publié(s) · {totalFees.toLocaleString("fr-FR")} € de frais</span></div>
                <form className="admin-task-form" onSubmit={publishTask}>
                  <label className="field"><span>Titre du document / tâche</span><input required value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Ex. Contrat de prêt à signer" /></label>
                  <label className="field"><span>Instructions au demandeur</span><textarea value={taskInstructions} onChange={(event) => setTaskInstructions(event.target.value)} placeholder="Étapes à réaliser ou informations utiles" /></label>
                  <div className="admin-task-form-row">
                    <label className="field"><span>Frais à régler (€)</span><input type="number" min="0" step="0.01" value={taskFee} onChange={(event) => setTaskFee(event.target.value)} /></label>
                    <label className="field"><span>Fichier à publier (optionnel)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setTaskFile(event.target.files?.[0] ?? null)} /><small>400 Ko maximum</small></label>
                  </div>
                  <button className="primary-button" type="submit">Publier sur le dashboard</button>
                </form>
                {selectedRequest.tasks.length > 0 && (
                  <ul className="admin-published-list">
                    {selectedRequest.tasks.map((task) => <li key={task.id}>
                      <div><strong>{task.title}</strong><span>{task.fee.toLocaleString("fr-FR")} € · {task.status}</span></div>
                      {task.fileName && <a href={task.fileDataUrl} download={task.fileName}>Document publié : {task.fileName}</a>}
                      {task.responseFileName && <a href={task.responseDataUrl} download={task.responseFileName}>Réponse du demandeur : {task.responseFileName}</a>}
                      {task.status === "Envoyé" && <div className="admin-task-review-actions">
                        <input aria-label={`Commentaire pour ${task.title}`} placeholder="Commentaire de vérification" value={task.reviewNote} onChange={(event) => updateSelected({ ...selectedRequest, tasks: selectedRequest.tasks.map((item) => item.id === task.id ? { ...item, reviewNote: event.target.value } : item) })} />
                        <button className="secondary-button small" type="button" onClick={() => updateSelected({ ...selectedRequest, tasks: selectedRequest.tasks.map((item) => item.id === task.id ? { ...item, status: "À corriger" } : item) })}>Demander une correction</button>
                        <button className="primary-button small" type="button" onClick={() => updateSelected({ ...selectedRequest, tasks: selectedRequest.tasks.map((item) => item.id === task.id ? { ...item, status: "Validé" } : item) })}>Valider la pièce</button>
                      </div>}
                      {task.reviewNote && task.status !== "Envoyé" && <span className="admin-task-review-note">Note : {task.reviewNote}</span>}
                    </li>)}
                  </ul>
                )}
              </section>
              {message && <p className="admin-feedback" role="status">{message}</p>}
            </article>
          ) : (
            <div className="admin-request-detail admin-empty-state"><strong>Sélectionnez un dossier</strong><span>Les détails et actions apparaîtront ici.</span></div>
          )}
        </div>
      </section>
    </main>
  );
}