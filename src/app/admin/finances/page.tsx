"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { SupportChat } from "@/components/support-chat";

type FinanceUser = { id: string; name: string; email: string; cardId: string | null; balance: number };
type PendingWithdrawal = {
  id: string;
  name: string;
  email: string;
  amount: number;
  beneficiaryName: string;
  bankName: string;
  iban: string;
  bic: string;
  method: string;
  paypalEmail: string;
  mobileMoneyProvider: string;
  mobileMoneyPhone: string;
};

const money = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);

export default function AdminFinancesPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState<FinanceUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/card-funds", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Chargement impossible.");
    setUsers(result.users);
    setWithdrawals(result.withdrawals);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Session expirée.")))
      .then(async (result) => {
        if (!active) return;
        if (result.user?.role !== "admin") {
          router.replace("/login?access=admin");
          return;
        }
        setAuthorized(true);
        await refresh();
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Accès admin requis.");
      });
    return () => { active = false; };
  }, [refresh, router]);

  const registerTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/card-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount, reference, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Versement impossible.");
      setAmount("");
      setReference("");
      setNote("");
      setMessage("Virement enregistré. Le solde a été recalculé à partir de cette écriture.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Versement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const processWithdrawal = async (withdrawalId: string, status: "completed" | "rejected") => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/card-funds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Traitement impossible.");
      setMessage(status === "completed" ? "Retrait marqué comme effectué." : "Retrait refusé; le montant est de nouveau disponible.");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Traitement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!authorized) {
    return <main className="page-shell auth-page"><section className="auth-shell"><div className="auth-panel auth-form-panel"><h1>Vérification de l’accès admin…</h1>{error && <p className="form-error">{error}</p>}</div></section></main>;
  }

  return (
    <main className="page-shell admin-review-page">
      <SupportChat isAdmin />
      <nav className="topbar" aria-label="Navigation admin">
        <div className="brand"><BrandGlyph /></div>
        <div className="nav-links">
          <Link href="/admin/dons">Campagnes</Link>
          <Link href="/admin/dossiers">Demandes</Link>
          <Link href="/admin/finances" aria-current="page">Soldes & retraits</Link>
        </div>
        <button className="nav-button" type="button" onClick={logout}>Déconnexion</button>
      </nav>

      <section className="admin-review-shell">
        <header className="admin-review-heading">
          <div><span className="eyebrow">Administration · Registre des mouvements</span><h1>Soldes et retraits</h1><p>Enregistrez uniquement les virements réellement effectués. Une référence ne peut créditer qu’une seule fois.</p></div>
          <div className="admin-review-counter"><strong>{withdrawals.length}</strong><span>retrait(s) à traiter</span></div>
        </header>

        <div className="admin-finance-grid">
          <section className="admin-request-detail admin-finance-panel">
            <div className="admin-section-title"><h2>Enregistrer un virement reçu</h2></div>
            <form className="admin-task-form" onSubmit={registerTransfer}>
              <label className="field"><span>Utilisateur</span>
                <select value={userId} onChange={(event) => setUserId(event.target.value)} required>
                  <option value="">Choisir un compte</option>
                  {users.map((user) => <option key={user.id} value={user.id} disabled={!user.cardId}>{user.name} · {user.email}{user.cardId ? ` · solde ${money(user.balance)}` : " · carte non créée"}</option>)}
                </select>
              </label>
              <div className="admin-task-form-row">
                <label className="field"><span>Montant effectivement viré (€)</span><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
                <label className="field"><span>Référence bancaire</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Référence de transaction" required /></label>
              </div>
              <label className="field"><span>Note interne (facultatif)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Origine ou précision" /></label>
              <button className="primary-button" type="submit" disabled={busy || !userId}>Enregistrer le virement</button>
            </form>
            <div className="admin-finance-balances">
              <h3>Soldes actuels</h3>
              {users.filter((user) => user.cardId).map((user) => <div className="admin-finance-balance-row" key={user.id}><span>{user.name}<small>{user.email}</small></span><strong>{money(user.balance)}</strong></div>)}
              {users.every((user) => !user.cardId) && <p className="admin-empty-inline">Aucune carte créée.</p>}
            </div>
          </section>

          <section className="admin-request-detail admin-finance-panel">
            <div className="admin-section-title"><h2>Demandes de retrait</h2><span>À traiter manuellement</span></div>
            {withdrawals.length === 0 ? <p className="admin-empty-inline">Aucune demande en attente.</p> : withdrawals.map((item) => <article className="admin-finance-withdrawal" key={item.id}>
              <div className="admin-finance-withdrawal-head"><div><strong>{item.name}</strong><small>{item.email} · bénéficiaire : {item.beneficiaryName}</small></div><strong>{money(item.amount)}</strong></div>
              <dl>
                <dt>Moyen</dt><dd>{item.method === "bank_transfer" ? "Virement bancaire" : item.method === "paypal" ? "PayPal" : "Mobile money"}</dd>
                {item.method === "bank_transfer" && <><dt>Banque</dt><dd>{item.bankName}</dd><dt>IBAN / BIC</dt><dd>{item.iban} · {item.bic}</dd></>}
                {item.method === "paypal" && <><dt>PayPal</dt><dd>{item.paypalEmail}</dd></>}
                {item.method === "mobile_money" && <><dt>Opérateur</dt><dd>{item.mobileMoneyProvider}</dd><dt>Téléphone</dt><dd>{item.mobileMoneyPhone}</dd></>}
              </dl>
              <div className="admin-finance-actions">
                <button className="secondary-button" type="button" disabled={busy} onClick={() => void processWithdrawal(item.id, "rejected")}>Refuser et libérer le solde</button>
                <button className="primary-button" type="button" disabled={busy} onClick={() => void processWithdrawal(item.id, "completed")}>Confirmer après virement</button>
              </div>
            </article>)}
          </section>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="admin-feedback" role="status">{message}</p>}
      </section>
    </main>
  );
}
