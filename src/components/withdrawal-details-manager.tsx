"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { WithdrawalDetails } from "@/lib/withdrawal-details";

type SavedWithdrawalDetails = WithdrawalDetails & {
  id: string;
  createdAt: string;
};

const emptyDetails: WithdrawalDetails = {
  method: "",
  name: "",
  bankName: "",
  iban: "",
  bic: "",
  paypalEmail: "",
  mobileMoneyProvider: "",
  mobileMoneyPhone: "",
};

const methodNames: Record<string, string> = {
  bank_transfer: "Virement bancaire",
  paypal: "PayPal",
  mobile_money: "Mobile money",
};

function describeDetails(details: SavedWithdrawalDetails) {
  if (details.method === "bank_transfer") return `${details.bankName} · ${details.iban} · ${details.bic}`;
  if (details.method === "paypal") return details.paypalEmail;
  return `${details.mobileMoneyProvider} · ${details.mobileMoneyPhone}`;
}

export function WithdrawalDetailsManager() {
  const [details, setDetails] = useState<SavedWithdrawalDetails[]>([]);
  const [form, setForm] = useState<WithdrawalDetails>(emptyDetails);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/withdrawal-details", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Chargement des coordonnées impossible.");
        if (active) setDetails(result.details as SavedWithdrawalDetails[]);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Chargement des coordonnées impossible.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateField = (field: keyof WithdrawalDetails, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateMethod = (method: string) => {
    setForm((current) => ({
      ...emptyDetails,
      method,
      name: current.name,
    }));
  };

  const resetForm = () => {
    setForm(emptyDetails);
    setEditingId(null);
  };

  const saveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/withdrawal-details", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(editingId ? { id: editingId } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Enregistrement impossible.");

      const saved = result.detail as SavedWithdrawalDetails;
      setDetails((current) => editingId
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setNotice(editingId ? "Coordonnées modifiées." : "Coordonnées ajoutées.");
      resetForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editDetails = (saved: SavedWithdrawalDetails) => {
    setForm({
      method: saved.method,
      name: saved.name,
      bankName: saved.bankName,
      iban: saved.iban,
      bic: saved.bic,
      paypalEmail: saved.paypalEmail,
      mobileMoneyProvider: saved.mobileMoneyProvider,
      mobileMoneyPhone: saved.mobileMoneyPhone,
    });
    setEditingId(saved.id);
    setError("");
    setNotice("");
  };

  const deleteDetails = async (id: string) => {
    if (!window.confirm("Supprimer ces coordonnées de retrait ?")) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/withdrawal-details", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Suppression impossible.");
      setDetails((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
      setNotice("Coordonnées supprimées.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    }
  };

  return (
    <section className="virtual-card-manager panel withdrawal-details-manager" aria-labelledby="withdrawal-details-title">
      <header className="virtual-card-manager-heading">
        <div>
          <span className="eyebrow">Retraits</span>
          <h3 id="withdrawal-details-title">Mes coordonnées de retrait</h3>
          <p>Enregistrez plusieurs comptes, modifiez-les ou supprimez-les. Vous choisirez le compte à utiliser au moment de chaque retrait.</p>
        </div>
      </header>

      {loading ? (
        <p>Chargement des coordonnées…</p>
      ) : details.length === 0 ? (
        <p className="virtual-card-empty-history">Aucune coordonnée enregistrée pour le moment.</p>
      ) : (
        <ul className="withdrawal-details-list">
          {details.map((saved) => (
            <li key={saved.id}>
              <div>
                <strong>{methodNames[saved.method]} · {saved.name}</strong>
                <span>{describeDetails(saved)}</span>
              </div>
              <div className="virtual-card-actions-row">
                <button className="secondary-button" type="button" onClick={() => editDetails(saved)}>Modifier</button>
                <button className="secondary-button" type="button" onClick={() => void deleteDetails(saved.id)}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="virtual-card-controls" onSubmit={saveDetails}>
        <h4>{editingId ? "Modifier ces coordonnées" : "Ajouter des coordonnées"}</h4>
        <label className="field">
          <span>Moyen de retrait</span>
          <select required value={form.method} onChange={(event) => updateMethod(event.target.value)}>
            <option value="">Choisir un moyen</option>
            <option value="bank_transfer">Virement bancaire</option>
            <option value="paypal">PayPal</option>
            <option value="mobile_money">Mobile money</option>
          </select>
        </label>
        <label className="field">
          <span>Nom du bénéficiaire</span>
          <input required maxLength={80} value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Nom complet" />
        </label>
        {form.method === "bank_transfer" && <div className="field-grid">
          <label className="field"><span>Banque</span><input required maxLength={80} value={form.bankName} onChange={(event) => updateField("bankName", event.target.value)} placeholder="Nom de la banque" /></label>
          <label className="field"><span>IBAN</span><input required maxLength={40} value={form.iban} onChange={(event) => updateField("iban", event.target.value)} placeholder="FR76…" /></label>
          <label className="field"><span>BIC</span><input required maxLength={20} value={form.bic} onChange={(event) => updateField("bic", event.target.value)} placeholder="BNPAFRPP" /></label>
        </div>}
        {form.method === "paypal" && <label className="field"><span>Adresse e-mail PayPal</span><input required maxLength={254} type="email" value={form.paypalEmail} onChange={(event) => updateField("paypalEmail", event.target.value)} placeholder="nom@exemple.com" /></label>}
        {form.method === "mobile_money" && <div className="field-grid">
          <label className="field"><span>Opérateur / service</span><input required maxLength={80} value={form.mobileMoneyProvider} onChange={(event) => updateField("mobileMoneyProvider", event.target.value)} placeholder="Ex. Orange Money" /></label>
          <label className="field"><span>Numéro de téléphone</span><input required maxLength={40} type="tel" value={form.mobileMoneyPhone} onChange={(event) => updateField("mobileMoneyPhone", event.target.value)} placeholder="+33…" /></label>
        </div>}

        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="virtual-card-notice" role="status">{notice}</p>}
        <div className="virtual-card-actions-row">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Ajouter les coordonnées"}
          </button>
          {editingId && <button className="secondary-button" type="button" onClick={resetForm}>Annuler</button>}
        </div>
      </form>
    </section>
  );
}
