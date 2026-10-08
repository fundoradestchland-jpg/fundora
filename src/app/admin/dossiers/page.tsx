"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { useFundoraRequests } from "@/lib/request-api";
import type { RequestKind } from "@/lib/fundora-requests";

type FilterKind = "Toutes" | RequestKind;

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const { requests, loading, error, mutate } = useFundoraRequests();
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<FilterKind>("Toutes");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskFee, setTaskFee] = useState("0");
  const [taskPaymentUrl, setTaskPaymentUrl] = useState("");
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [decisionDraft, setDecisionDraft] = useState<{ id: string; amount: string; note: string } | null>(null);
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [documentNotes, setDocumentNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Session expirée.")))
      .then((result) => {
        if (!active) return;
        if (result.user?.role !== "admin") router.replace("/login?access=admin");
        else setAuthorized(true);
      })
      .catch(() => {
        if (active) router.replace("/login?access=admin");
      });
    return () => { active = false; };
  }, [router]);

  const filteredRequests = useMemo(
    () => requests.filter((request) => filter === "Toutes" || request.kind === filter),
    [filter, requests]
  );
  const selectedRequest = filteredRequests.find((request) => request.id === selectedId) ?? filteredRequests[0];
  const waitingCount = requests.filter((request) => request.status === "En attente").length;
  const totalFees = selectedRequest?.tasks.reduce((sum, task) => sum + task.fee, 0) ?? 0;
  const decisionAmount = selectedRequest && decisionDraft?.id === selectedRequest.id ? decisionDraft.amount : selectedRequest?.approvedAmount ?? "";
  const decisionNote = selectedRequest && decisionDraft?.id === selectedRequest.id ? decisionDraft.note : selectedRequest?.reviewNote ?? "";

  const saveDecision = async (status: "Validée" | "Refusée") => {
    if (!selectedRequest || busyAction) return;
    setBusyAction("decision");
    setMessage("");
    try {
      await mutate(selectedRequest.id, "review", {
        status,
        approvedAmount: decisionAmount,
        reviewNote: decisionNote,
      });
      setMessage(status === "Validée" ? "Demande validée." : "Demande refusée.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Mise à jour impossible.");
    } finally {
      setBusyAction("");
    }
  };

  const updateDocument = async (documentId: string, status: string, note: string) => {
    if (!selectedRequest || busyAction) return;
    setBusyAction(`document:${documentId}`);
    try {
      await mutate(selectedRequest.id, "document-review", { documentId, status, note });
      setMessage("Pièce et commentaire enregistrés.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Révision impossible.");
    } finally {
      setBusyAction("");
    }
  };

  const reviewTask = async (taskId: string, status: "Validé" | "À corriger", note: string) => {
    if (!selectedRequest || busyAction) return;
    setBusyAction(`task:${taskId}`);
    try {
      await mutate(selectedRequest.id, "task-review", { taskId, status, note });
      setMessage(status === "Validé" ? "Document retourné validé." : "Correction demandée au demandeur.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Révision impossible.");
    } finally {
      setBusyAction("");
    }
  };

  const reviewPaymentProof = async (taskId: string, status: "Validé" | "À corriger") => {
    if (!selectedRequest || busyAction) return;
    setBusyAction(`payment:${taskId}`);
    try {
      await mutate(selectedRequest.id, "payment-proof-review", {
        taskId,
        status,
        note: paymentNotes[taskId] ?? "",
      });
      setMessage(status === "Validé" ? "Paiement validé." : "Preuve de paiement refusée, une nouvelle preuve est demandée.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Révision du paiement impossible.");
    } finally {
      setBusyAction("");
    }
  };

  const publishTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest || !taskTitle.trim() || busyAction) return;
    setBusyAction("publish-task");
    setMessage("");

    const fee = Number(taskFee);
    if (!Number.isFinite(fee) || fee < 0) {
      setMessage("Indiquez un montant de frais valide.");
      setBusyAction("");
      return;
    }
    if (fee > 0 && !taskPaymentUrl.trim()) {
      setMessage("Ajoutez le lien de paiement sécurisé correspondant aux frais.");
      setBusyAction("");
      return;
    }
    if (taskPaymentUrl.trim()) {
      try {
        const parsedPaymentUrl = new URL(taskPaymentUrl);
        if (parsedPaymentUrl.protocol !== "https:" || parsedPaymentUrl.username || parsedPaymentUrl.password) {
          setMessage("Le lien de paiement doit être une adresse HTTPS sécurisée.");
          setBusyAction("");
          return;
        }
      } catch {
        setMessage("Saisissez un lien de paiement HTTPS valide.");
        setBusyAction("");
        return;
      }
    }

    if (taskFile && taskFile.size > 400_000) {
      setMessage("Le document joint doit faire 400 Ko maximum.");
      setBusyAction("");
      return;
    }

    try {
      let fileDataUrl = "";
      if (taskFile) {
        fileDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Lecture du document impossible."));
          reader.readAsDataURL(taskFile);
        });
      }
      await mutate(selectedRequest.id, "publish-task", {
        title: taskTitle.trim(),
        instructions: taskInstructions.trim(),
        fee,
        paymentUrl: taskPaymentUrl.trim(),
        file: taskFile ? { name: taskFile.name, dataUrl: fileDataUrl } : null,
      });
      setTaskTitle("");
      setTaskInstructions("");
      setTaskFee("0");
      setTaskPaymentUrl("");
      setTaskFile(null);
      setMessage("La tâche, les instructions et le lien éventuel sont publiés dans l’espace du demandeur.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Publication impossible.");
    } finally {
      setBusyAction("");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("fundora_session");
    window.dispatchEvent(new Event("fundora-session-updated"));
    router.push("/login");
  };

  if (authorized !== true) {
    return <main className="page-shell auth-page"><section className="auth-shell"><div className="auth-panel auth-form-panel"><h1>Vérification de l’accès admin…</h1></div></section></main>;
  }

  return (
    <main className="page-shell admin-review-page">
      <nav className="topbar" aria-label="Navigation admin">
        <div className="brand"><BrandGlyph /></div>
        <div className="nav-links">
          <Link href="/admin/dons">Campagnes</Link>
          <Link href="/admin/dossiers" aria-current="page">Demandes</Link>
          <Link href="/admin/finances">Soldes & retraits</Link>
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
        {message && <p className="admin-feedback admin-feedback-global" role="status">{message}</p>}
        {selectedRequest && (
          <a className="admin-task-shortcut" href="#task-publication">
            Créer une tâche et ajouter le lien de paiement
          </a>
        )}

        <div className="admin-review-filters" role="group" aria-label="Filtrer les demandes">
          {(["Toutes", "Don", "Prêt"] as FilterKind[]).map((kind) => (
            <button key={kind} className={filter === kind ? "active" : ""} type="button" onClick={() => setFilter(kind)}>
              {kind === "Toutes" ? `Toutes (${requests.length})` : `${kind}s (${requests.filter((item) => item.kind === kind).length})`}
            </button>
          ))}
        </div>

        <div className="admin-review-layout">
          <aside className="admin-request-list" aria-label="Liste des demandes">
            {loading ? (
              <div className="admin-empty-state"><strong>Chargement des dossiers…</strong></div>
            ) : error ? (
              <div className="admin-empty-state"><strong>Impossible de charger les demandes</strong><span>{error}</span></div>
            ) : filteredRequests.length === 0 ? (
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
                      <strong>{document.name}</strong>
                      <small>{Math.max(1, Math.round(document.size / 1024))} Ko</small>
                    </div>
                    <div className="admin-document-actions">
                      <a href={document.dataUrl} target="_blank" rel="noopener noreferrer">Voir</a>
                      <a href={document.dataUrl} download={document.name}>Télécharger</a>
                    </div>
                    <div className="admin-document-review-fields">
                      <select
                        aria-label={`Statut de ${document.name}`}
                        value={document.status}
                        onChange={(event) => void updateDocument(document.id, event.target.value, documentNotes[document.id] ?? document.note)}
                      >
                        <option>À vérifier</option><option>Validé</option><option>À corriger</option>
                      </select>
                      <input
                        aria-label={`Commentaire pour ${document.name}`}
                        placeholder="Commentaire / pièce à corriger"
                        value={documentNotes[document.id] ?? document.note}
                        onChange={(event) => setDocumentNotes((current) => ({ ...current, [document.id]: event.target.value }))}
                      />
                      <button className="secondary-button small" type="button" disabled={Boolean(busyAction)} onClick={() => void updateDocument(document.id, document.status, documentNotes[document.id] ?? document.note)}>
                        {busyAction === `document:${document.id}` ? "Enregistrement…" : "Enregistrer le commentaire"}
                      </button>
                    </div>
                  </div>
                ))}
              </section>

              <section className="admin-detail-section admin-decision-section">
                <div className="admin-section-title"><h3>Décision du dossier</h3><span>Visible dans le dashboard</span></div>
                <div className="admin-decision-fields">
                  <label className="field"><span>Montant approuvé (€)</span><input type="number" min="0" value={decisionAmount} onChange={(event) => setDecisionDraft({ id: selectedRequest.id, amount: event.target.value, note: decisionNote })} placeholder="Ex. 2500" /></label>
                  <label className="field"><span>Message au demandeur (facultatif)</span><textarea value={decisionNote} onChange={(event) => setDecisionDraft({ id: selectedRequest.id, amount: decisionAmount, note: event.target.value })} placeholder="Vous pouvez valider ou refuser sans commentaire." /></label>
                </div>
                <div className="admin-decision-actions">
                  <button className="secondary-button" type="button" disabled={Boolean(busyAction)} onClick={() => void saveDecision("Refusée")}>{busyAction === "decision" ? "Enregistrement…" : "Refuser le dossier"}</button>
                  <button className="primary-button" type="button" disabled={Boolean(busyAction)} onClick={() => void saveDecision("Validée")}>{busyAction === "decision" ? "Enregistrement…" : "Valider le dossier"}</button>
                </div>
              </section>

              <section className="admin-detail-section admin-task-publication-section" id="task-publication">
                <div className="admin-section-title"><h3>Tâche et lien de paiement à envoyer au demandeur</h3><span>{selectedRequest.tasks.length} publié(s) · {totalFees.toLocaleString("fr-FR")} € de frais</span></div>
                <p className="admin-task-publication-help">Décrivez l’étape à réaliser (par exemple signer et renvoyer le contrat). Si des frais sont demandés, le lien HTTPS sera visible dès la publication. Le demandeur pourra envoyer son travail et sa preuve de paiement séparément.</p>
                <form className="admin-task-form" onSubmit={publishTask}>
                  <label className="field"><span>Titre du document / tâche</span><input required value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Ex. Contrat de prêt à signer" /></label>
                  <label className="field"><span>Instructions au demandeur</span><textarea value={taskInstructions} onChange={(event) => setTaskInstructions(event.target.value)} placeholder="Étapes à réaliser ou informations utiles" /></label>
                  <div className="admin-task-form-row">
                    <label className="field"><span>Frais à régler (€)</span><input type="number" min="0" step="0.01" value={taskFee} onChange={(event) => setTaskFee(event.target.value)} /></label>
                    <label className="field"><span>Fichier à publier (optionnel)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setTaskFile(event.target.files?.[0] ?? null)} /><small>400 Ko maximum</small></label>
                  </div>
                  <label className="field"><span>Lien de paiement sécurisé (HTTPS) {Number(taskFee) > 0 ? "(obligatoire avec des frais)" : "(facultatif)"}</span><input type="url" value={taskPaymentUrl} onChange={(event) => setTaskPaymentUrl(event.target.value)} placeholder="https://…" required={Number(taskFee) > 0} /><small>Le demandeur verra ce lien dans son espace dès la publication de la tâche et pourra déposer la preuve de paiement séparément.</small></label>
                  <button className="primary-button" type="submit" disabled={Boolean(busyAction)}>{busyAction === "publish-task" ? "Envoi au demandeur…" : "Envoyer la tâche au demandeur"}</button>
                </form>
                {selectedRequest.tasks.length > 0 && (
                  <ul className="admin-published-list">
                    {selectedRequest.tasks.map((task) => <li key={task.id}>
                      <div><strong>{task.title}</strong><span>{task.fee.toLocaleString("fr-FR")} € · {task.status}</span></div>
                      {task.fileName && <a href={task.fileDataUrl} download={task.fileName}>Document publié : {task.fileName}</a>}
                      {task.paymentUrl && <a href={task.paymentUrl} target="_blank" rel="noopener noreferrer">Lien de paiement configuré</a>}
                      {task.responseFileName && <a href={task.responseDataUrl} download={task.responseFileName}>Réponse du demandeur : {task.responseFileName}</a>}
                      {task.paymentProofFileName && <a href={task.paymentProofDataUrl} download={task.paymentProofFileName}>Preuve de paiement reçue : {task.paymentProofFileName}</a>}
                      {task.paymentProofStatus !== "Aucune" && <span className={`review-badge ${task.paymentProofStatus === "Validé" ? "validee" : task.paymentProofStatus === "À corriger" ? "refusee" : "en-attente"}`}>Paiement : {task.paymentProofStatus}</span>}
                      {task.paymentProofStatus === "À vérifier" && <div className="admin-task-review-actions">
                        <input aria-label={`Commentaire de paiement pour ${task.title}`} placeholder="Commentaire facultatif" value={paymentNotes[task.id] ?? task.paymentProofNote} onChange={(event) => setPaymentNotes((current) => ({ ...current, [task.id]: event.target.value }))} />
                        <button className="secondary-button small" type="button" disabled={Boolean(busyAction)} onClick={() => void reviewPaymentProof(task.id, "À corriger")}>{busyAction === `payment:${task.id}` ? "Enregistrement…" : "Refuser la preuve"}</button>
                        <button className="primary-button small" type="button" disabled={Boolean(busyAction)} onClick={() => void reviewPaymentProof(task.id, "Validé")}>{busyAction === `payment:${task.id}` ? "Enregistrement…" : "Valider le paiement"}</button>
                      </div>}
                      {task.status === "Envoyé" && <div className="admin-task-review-actions">
                        <input aria-label={`Commentaire pour ${task.title}`} placeholder="Commentaire de vérification" value={taskNotes[task.id] ?? task.reviewNote} onChange={(event) => setTaskNotes((current) => ({ ...current, [task.id]: event.target.value }))} />
                        <button className="secondary-button small" type="button" disabled={Boolean(busyAction)} onClick={() => void reviewTask(task.id, "À corriger", taskNotes[task.id] ?? task.reviewNote)}>{busyAction === `task:${task.id}` ? "Enregistrement…" : "Demander une correction"}</button>
                        <button className="primary-button small" type="button" disabled={Boolean(busyAction)} onClick={() => void reviewTask(task.id, "Validé", taskNotes[task.id] ?? task.reviewNote)}>{busyAction === `task:${task.id}` ? "Enregistrement…" : "Valider la pièce"}</button>
                      </div>}
                      {task.reviewNote && task.status !== "Envoyé" && <span className="admin-task-review-note">Note : {task.reviewNote}</span>}
                    </li>)}
                  </ul>
                )}
              </section>
            </article>
          ) : (
            <div className="admin-request-detail admin-empty-state"><strong>Sélectionnez un dossier reçu</strong><span>La lecture des pièces, la validation du dossier et l’envoi des tâches avec lien de paiement apparaîtront après avoir choisi une demande dans la liste.</span></div>
          )}
        </div>
      </section>
    </main>
  );
}