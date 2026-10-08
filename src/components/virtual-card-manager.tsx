"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type WithdrawalRecord = {
  id: string;
  amount: number;
  status: string;
  beneficiaryName: string;
  bankName: string;
  method: string;
  createdAt: string;
};

type CreditRecord = {
  id: string;
  amount: number;
  reference: string;
  createdAt: string;
};

type SavedWithdrawalDetails = {
  id: string;
  method: string;
  name: string;
  bankName: string;
  iban: string;
  bic: string;
  paypalEmail: string;
  mobileMoneyProvider: string;
  mobileMoneyPhone: string;
};

type VirtualCard = {
  id: string;
  reference: string;
  displayName: string;
  theme: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  balance: number;
  createdAt: string;
  fee: number;
  paymentEnabled: boolean;
  withdrawals: WithdrawalRecord[];
  credits: CreditRecord[];
};

const themes = [
  { id: "ocean", name: "Océan", color: "#075b73" },
  { id: "jade", name: "Jade", color: "#176b50" },
  { id: "coral", name: "Corail", color: "#b9483a" },
  { id: "midnight", name: "Nuit", color: "#203451" },
  { id: "slate", name: "Ardoise", color: "#536278" },
];

export function VirtualCardManager({
  accountName,
  dashboardHref,
  settingsOnly = false,
}: {
  accountName: string;
  dashboardHref: string;
  settingsOnly?: boolean;
}) {
  const router = useRouter();
  const [card, setCard] = useState<VirtualCard | null>(null);
  const [displayName, setDisplayName] = useState(accountName);
  const [theme, setTheme] = useState("ocean");
  const [withdrawalDetails, setWithdrawalDetails] = useState<SavedWithdrawalDetails[]>([]);
  const [selectedWithdrawalDetailId, setSelectedWithdrawalDetailId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("250");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/virtual-card", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Chargement de carte impossible.");
        if (active && result.card) {
          const nextCard = result.card as VirtualCard;
          setCard(nextCard);
          setDisplayName(nextCard.displayName);
          setTheme(nextCard.theme);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Chargement de carte impossible.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [settingsOnly]);

  useEffect(() => {
    if (settingsOnly) return;
    let active = true;
    fetch("/api/withdrawal-details", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Chargement des coordonnées impossible.");
        if (active) {
          const savedDetails = result.details as SavedWithdrawalDetails[];
          setWithdrawalDetails(savedDetails);
          setSelectedWithdrawalDetailId((current) => current || savedDetails[0]?.id || "");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Chargement des coordonnées impossible.");
      });
    return () => { active = false; };
  }, [settingsOnly]);

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (targetId) {
      requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [loading, card]);

  const saveCard = async (create: boolean) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/virtual-card", {
        method: create ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          theme,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Enregistrement impossible.");

      const nextCard = result.card as VirtualCard;
      setCard(nextCard);
      setDisplayName(nextCard.displayName);
      setTheme(nextCard.theme);
      setNotice(create ? "Votre carte virtuelle a bien été créée. Son solde commencera à zéro." : "Les préférences de votre carte ont été enregistrées.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdrawal = async () => {
    const amount = Number(withdrawAmount);
    if (!selectedWithdrawalDetailId) {
      setError("Ajoutez d’abord des coordonnées de retrait dans les paramètres.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Indiquez un montant valide à retirer.");
      return;
    }

    setWithdrawing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/virtual-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          amount,
          withdrawalDetailId: selectedWithdrawalDetailId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Retrait impossible.");

      const nextCard = result.card as VirtualCard;
      setCard(nextCard);
      setWithdrawAmount("250");
      setNotice(`Demande de retrait de ${formatMoney(amount)} enregistrée. Le montant est réservé jusqu’au traitement par l’administration.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Retrait impossible.");
    } finally {
      setWithdrawing(false);
    }
  };

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value || 0);

  const handleBackToDashboard = () => {
    router.push(dashboardHref);
  };

  if (loading && settingsOnly) {
    return <section className="virtual-card-manager panel"><p>Chargement des paramètres…</p></section>;
  }

  if (settingsOnly && !card) {
    return (
      <section className="virtual-card-manager panel">
        <h3>Carte virtuelle non créée</h3>
        <p>Créez d’abord votre carte depuis le dashboard pour modifier son apparence.</p>
        <Link className="secondary-button" href={dashboardHref}>Retour au dashboard</Link>
      </section>
    );
  }

  if (settingsOnly) {
    return (
      <section className="virtual-card-manager panel" aria-labelledby="virtual-card-settings-title">
        <header className="virtual-card-manager-heading">
          <div>
            <span className="eyebrow">Compte</span>
            <h3 id="virtual-card-settings-title">Paramètres de la carte</h3>
            <p>Modifiez le nom et l’apparence de votre carte virtuelle.</p>
          </div>
        </header>

        <div className="virtual-card-controls" id="parametres">
          <label className="field">
            <span>Nom affiché sur la carte</span>
            <input maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Votre nom" />
          </label>

          <fieldset className="virtual-card-themes">
            <legend>Couleur de la carte</legend>
            <div className="virtual-card-swatches">
              {themes.map((option) => (
                <label className={`virtual-card-swatch ${theme === option.id ? "selected" : ""}`} key={option.id}>
                  <input type="radio" name="virtual-card-theme" value={option.id} checked={theme === option.id} onChange={() => setTheme(option.id)} />
                  <span className="virtual-card-swatch-color" style={{ backgroundColor: option.color }} />
                  <span>{option.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="virtual-card-notice" role="status">{notice}</p>}

          <div className="virtual-card-actions-row">
            <button className="primary-button" type="button" disabled={saving || displayName.trim().length < 2} onClick={() => void saveCard(false)}>
              {saving ? "Enregistrement…" : "Enregistrer les changements"}
            </button>
            <button className="secondary-button" type="button" onClick={handleBackToDashboard}>
              Retour au dashboard
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return <section className="virtual-card-manager panel"><p>Chargement de votre carte…</p></section>;
  }

  if (!card) {
    return (
      <section className="virtual-card-manager panel" aria-labelledby="virtual-card-title">
        <header className="virtual-card-manager-heading">
          <div>
            <span className="eyebrow">Sans frais</span>
            <h3 id="virtual-card-title">Créer ma carte virtuelle</h3>
            <p>Créez gratuitement votre carte. Son solde affichera uniquement les virements réellement enregistrés par l’administration.</p>
          </div>
          <span className="virtual-card-free-label">Gratuite · 0 €</span>
        </header>

        <div className="virtual-card-create-panel" id="parametres">
          <label className="field">
            <span>Nom affiché sur la carte</span>
            <input maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Votre nom" />
          </label>

          <fieldset className="virtual-card-themes">
            <legend>Couleur de la carte</legend>
            <div className="virtual-card-swatches">
              {themes.map((option) => (
                <label className={`virtual-card-swatch ${theme === option.id ? "selected" : ""}`} key={option.id}>
                  <input type="radio" name="virtual-card-theme" value={option.id} checked={theme === option.id} onChange={() => setTheme(option.id)} />
                  <span className="virtual-card-swatch-color" style={{ backgroundColor: option.color }} />
                  <span>{option.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="virtual-card-notice" role="status">{notice}</p>}

          <button className="primary-button" type="button" disabled={saving || displayName.trim().length < 2} onClick={() => void saveCard(true)}>
            {saving ? "Création…" : "Créer ma carte virtuelle"}
          </button>
        </div>

        <section className="virtual-card-history" id="transactions">
          <h4>Transactions</h4>
          <p className="virtual-card-empty-history">Les versements et retraits apparaîtront ici après la création de votre carte.</p>
        </section>
      </section>
    );
  }

  return (
    <section className="virtual-card-manager panel" aria-labelledby="virtual-card-title">
      <header className="virtual-card-manager-heading">
        <div>
          <span className="eyebrow">Sans frais</span>
          <h3 id="virtual-card-title">Ma carte virtuelle</h3>
          <p>Votre carte est active. Les réglages sont regroupés dans la section Paramètres générale.</p>
        </div>
        <span className="virtual-card-free-label">Gratuite · 0 €</span>
      </header>

      <div className={`virtual-card-preview theme-${theme}`}>
        <div className="virtual-card-preview-top">
          <span>FUNDORA</span>
          <span className="virtual-card-chip" aria-hidden="true" />
        </div>

        <div className="virtual-card-number-row">
          <span>{card.cardNumber}</span>
        </div>

        <div className="virtual-card-preview-bottom">
          <div>
            <small>TITULAIRE</small>
            <strong>{displayName.trim() || accountName}</strong>
          </div>
          <div className="virtual-card-expiry-block">
            <small>EXP</small>
            <strong>{card.expiryMonth}/{card.expiryYear}</strong>
          </div>
        </div>
        <span className="virtual-card-preview-label">CARTE VIRTUELLE</span>
      </div>

      <div className="virtual-card-balance-box">
        <div className="virtual-card-balance-header">
          <span>Solde disponible</span>
          <strong>{formatMoney(card.balance)}</strong>
        </div>

        {withdrawalDetails.length > 0 ? (
          <label className="field">
            <span>Coordonnées à utiliser</span>
            <select value={selectedWithdrawalDetailId} onChange={(event) => setSelectedWithdrawalDetailId(event.target.value)}>
              {withdrawalDetails.map((detail) => (
                <option key={detail.id} value={detail.id}>
                  {detail.method === "bank_transfer" ? "Virement bancaire" : detail.method === "paypal" ? "PayPal" : "Mobile money"} · {detail.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="virtual-card-empty-history">
            Ajoutez des coordonnées avant de demander un retrait.{" "}
            <Link href={`${dashboardHref}/settings`}>Gérer mes coordonnées</Link>
          </p>
        )}

        <div className="virtual-card-withdraw-action">
          <label className="field">
            <span>Montant à retirer</span>
            <input type="number" min="0" step="10" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} placeholder="250" />
          </label>
          <button className="secondary-button" type="button" disabled={withdrawing || card.balance <= 0 || withdrawalDetails.length === 0} onClick={() => void handleWithdrawal()}>
            {withdrawing ? "Envoi…" : "Demander un retrait"}
          </button>
        </div>
        <p className="virtual-card-empty-history">Le solde est crédité uniquement après un virement réellement effectué et enregistré par l’administration. Les demandes de retrait restent en attente jusqu’à leur traitement.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="virtual-card-notice" role="status">{notice}</p>}
      </div>

      <section className="virtual-card-transactions" id="transactions">
        <div className="virtual-card-history">
          <h4>Versements reçus</h4>
          <div className="virtual-card-history-stats">
            <div><span>Nombre de versements</span><strong>{card.credits?.length ?? 0}</strong></div>
            <div><span>Montant total</span><strong>{formatMoney(card.credits?.reduce((total, credit) => total + credit.amount, 0) ?? 0)}</strong></div>
          </div>
          {(card.credits?.length ?? 0) > 0 && (
            <ul>{card.credits.map((credit) => (
              <li key={credit.id}>
                <div><strong>+{formatMoney(credit.amount)}</strong><span>Réf. {credit.reference}</span></div>
                <span>{new Date(credit.createdAt).toLocaleDateString("fr-FR")}</span>
              </li>
            ))}</ul>
          )}
        </div>

        <div className="virtual-card-history">
          <h4>Historique des retraits</h4>
          <div className="virtual-card-history-stats">
            <div><span>Nombre de retraits</span><strong>{card.withdrawals?.length ?? 0}</strong></div>
            <div><span>Montant total</span><strong>{formatMoney(card.withdrawals?.reduce((total, withdrawal) => total + withdrawal.amount, 0) ?? 0)}</strong></div>
          </div>
          {(card.withdrawals?.length ?? 0) > 0 && (
            <ul>
              {card.withdrawals.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{formatMoney(item.amount)}</strong>
                    <span>{item.beneficiaryName || "Bénéficiaire"}</span>
                  </div>
                  <span className={`withdrawal-status ${item.status}`}>{item.status === "pending" ? "En attente" : item.status === "completed" ? "Effectué" : "Refusé"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="virtual-card-disclaimer">Une carte virtuelle de présentation ne réalise pas elle-même de paiement. Les retraits sont traités par l’administration après réception de votre demande.</p>
    </section>
  );
}