"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { SupportChat } from "@/components/support-chat";
import { formatDollars } from "@/lib/format";

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

const money = (amount: number) => formatDollars(amount, 2, 2);

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
    return <main className="page-shell auth-page"><section className="auth-shell"><div className="auth-panel auth-form-panel"><h1>Verificando acceso de administrador…</h1>{error && <p className="form-error">{error}</p>}</div></section></main>;
  }

  return (
    <main className="page-shell admin-review-page">
      <SupportChat isAdmin />
      <nav className="topbar" aria-label="Navegación admin">
        <div className="brand"><BrandGlyph /></div>
        <div className="nav-links">
          <Link href="/admin/dons">Campañas</Link>
          <Link href="/admin/dossiers">Solicitudes</Link>
          <Link href="/admin/finances" aria-current="page">Saldos y retiros</Link>
        </div>
        <button className="nav-button" type="button" onClick={logout}>Cerrar sesión</button>
      </nav>

      <section className="admin-review-shell">
        <header className="admin-review-heading">
          <div><span className="eyebrow">Administración · Registro de movimientos</span><h1>Saldos y retiros</h1><p>Registra únicamente los transferencias realmente realizadas. Una referencia no puede acreditar más de una vez.</p></div>
          <div className="admin-review-counter"><strong>{withdrawals.length}</strong><span>retiro(s) por procesar</span></div>
        </header>

        <div className="admin-finance-grid">
          <section className="admin-request-detail admin-finance-panel">
            <div className="admin-section-title"><h2>Registrar una transferencia recibida</h2></div>
            <form className="admin-task-form" onSubmit={registerTransfer}>
              <label className="field"><span>Usuario</span>
                <select value={userId} onChange={(event) => setUserId(event.target.value)} required>
                  <option value="">Elegir una cuenta</option>
                  {users.map((user) => <option key={user.id} value={user.id} disabled={!user.cardId}>{user.name} · {user.email}{user.cardId ? ` · saldo ${money(user.balance)}` : " · tarjeta no creada"}</option>)}
                </select>
              </label>
              <div className="admin-task-form-row">
                <label className="field"><span>Monto efectivamente transferido ($)</span><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
                <label className="field"><span>Referencia bancaria</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Referencia de la transacción" required /></label>
              </div>
              <label className="field"><span>Nota interna (opcional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Origen o detalle" /></label>
              <button className="primary-button" type="submit" disabled={busy || !userId}>Guardar transferencia</button>
            </form>
            <div className="admin-finance-balances">
              <h3>Saldos actuales</h3>
              {users.filter((user) => user.cardId).map((user) => <div className="admin-finance-balance-row" key={user.id}><span>{user.name}<small>{user.email}</small></span><strong>{money(user.balance)}</strong></div>)}
              {users.every((user) => !user.cardId) && <p className="admin-empty-inline">No hay ninguna tarjeta creada.</p>}
            </div>
          </section>

          <section className="admin-request-detail admin-finance-panel">
            <div className="admin-section-title"><h2>Solicitudes de retiro</h2><span>Por procesar manualmente</span></div>
            {withdrawals.length === 0 ? <p className="admin-empty-inline">No hay solicitudes pendientes.</p> : withdrawals.map((item) => <article className="admin-finance-withdrawal" key={item.id}>
              <div className="admin-finance-withdrawal-head"><div><strong>{item.name}</strong><small>{item.email} · beneficiario: {item.beneficiaryName}</small></div><strong>{money(item.amount)}</strong></div>
              <dl>
                <dt>Método</dt><dd>{item.method === "bank_transfer" ? "Transferencia bancaria" : item.method === "paypal" ? "PayPal" : "Dinero móvil"}</dd>
                {item.method === "bank_transfer" && <><dt>Banco</dt><dd>{item.bankName}</dd><dt>IBAN / BIC</dt><dd>{item.iban} · {item.bic}</dd></>}
                {item.method === "paypal" && <><dt>PayPal</dt><dd>{item.paypalEmail}</dd></>}
                {item.method === "mobile_money" && <><dt>Operador</dt><dd>{item.mobileMoneyProvider}</dd><dt>Teléfono</dt><dd>{item.mobileMoneyPhone}</dd></>}
              </dl>
              <div className="admin-finance-actions">
                <button className="secondary-button" type="button" disabled={busy} onClick={() => void processWithdrawal(item.id, "rejected")}>Rechazar y liberar saldo</button>
                <button className="primary-button" type="button" disabled={busy} onClick={() => void processWithdrawal(item.id, "completed")}>Confirmar tras transferencia</button>
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
