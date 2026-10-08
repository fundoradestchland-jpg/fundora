"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { serializeFiles, type RequestDocument } from "@/lib/fundora-requests";
import { createApplication } from "@/lib/request-api";

const steps = ["Profil", "Budget", "Documents", "Validation"];
const requiredDocuments = [
  { id: "identity", label: "Pièce d’identité en cours de validité" },
  { id: "income_expenses", label: "Justificatifs de revenus et de dépenses" },
  { id: "bank_statements", label: "Relevés bancaires récents" },
] as const;
type LoanDocumentType = typeof requiredDocuments[number]["id"];
const annualInterestRate = 0.02;
const formatEuro = (value: string | number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(value || 0));

type ApplicantSession = {
  email: string;
  name: string;
  role: "admin" | "applicant";
  user: string;
};

export default function LoanRequestPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [applicant, setApplicant] = useState<ApplicantSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<LoanDocumentType, RequestDocument | null>>({
    identity: null,
    income_expenses: null,
    bank_statements: null,
  });
  const [uploadError, setUploadError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    city: "",
    country: "",
    loanType: "Prêt personnel rapide",
    amount: "",
    monthlyIncome: "",
    monthlyExpenses: "",
    purpose: "",
    loanTerm: "24 mois",
    consent: false,
  });

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || result.user?.role !== "applicant") {
          throw new Error(result.error ?? "Connectez-vous à un compte demandeur pour continuer.");
        }
        if (active) {
          const user = result.user as ApplicantSession;
          setApplicant(user);
          setForm((current) => ({ ...current, fullName: user.name, email: user.email }));
        }
      })
      .catch((reason: unknown) => {
        if (active) setUploadError(reason instanceof Error ? reason.message : "Vérification du compte impossible.");
      });
    return () => { active = false; };
  }, []);

  const isLastStep = currentStep === steps.length - 1;
  const estimatedAmount = useMemo(() => {
    return formatEuro(form.amount);
  }, [form.amount]);
  const repaymentEstimate = useMemo(() => {
    const principal = Number(form.amount);
    const numberOfPayments = Number.parseInt(form.loanTerm, 10);
    if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(numberOfPayments) || numberOfPayments <= 0) {
      return null;
    }
    const monthlyRate = annualInterestRate / 12;
    const monthlyPayment = principal * monthlyRate / (1 - (1 + monthlyRate) ** -numberOfPayments);
    const roundedMonthlyPayment = Math.round(monthlyPayment * 100) / 100;
    const totalRepayment = Math.round(roundedMonthlyPayment * numberOfPayments * 100) / 100;
    return {
      monthlyPayment: roundedMonthlyPayment,
      totalRepayment,
      totalInterest: Math.round((totalRepayment - principal) * 100) / 100,
    };
  }, [form.amount, form.loanTerm]);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setUploadError("");
    if (currentStep === 0 && (!form.fullName.trim() || !form.phone.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.birthDate.trim() || !form.city.trim() || !form.country.trim())) {
      setUploadError("Complétez toutes vos informations personnelles pour continuer.");
      return;
    }
    if (currentStep === 1 && (
      !form.purpose.trim() ||
      !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0 ||
      !Number.isFinite(Number(form.monthlyIncome)) || Number(form.monthlyIncome) < 0 ||
      !Number.isFinite(Number(form.monthlyExpenses)) || Number(form.monthlyExpenses) < 0
    )) {
      setUploadError("Indiquez un montant, vos revenus, vos dépenses et l’objet du prêt.");
      return;
    }
    if (currentStep === 2 && requiredDocuments.some((document) => !uploadedDocuments[document.id])) {
      setUploadError("Joignez un fichier dans chacun des trois emplacements obligatoires.");
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };
  const previousStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  const uploadDocument = async (documentType: LoanDocumentType, file: File) => {
    try {
      const [document] = await serializeFiles([file]);
      setUploadedDocuments((current) => ({ ...current, [documentType]: document }));
      setUploadError("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Fichier illisible.");
    }
  };

  const handleSubmit = async () => {
    if (requiredDocuments.some((document) => !uploadedDocuments[document.id])) {
      setCurrentStep(2);
      setUploadError("Joignez un fichier dans chacun des trois emplacements obligatoires.");
      return;
    }
    setSubmitting(true);
    setUploadError("");
    try {
      const { id } = await createApplication({
        kind: "Prêt",
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        country: form.country,
        subject: form.loanType,
        amountRequested: form.amount,
        details: `Date de naissance : ${form.birthDate}\n${form.purpose}\nDurée : ${form.loanTerm}\nTaux annuel indicatif : 2 %\nMensualité estimée hors frais : ${repaymentEstimate ? formatEuro(repaymentEstimate.monthlyPayment) : "non calculée"}\nTotal à rembourser estimé : ${repaymentEstimate ? formatEuro(repaymentEstimate.totalRepayment) : "non calculé"}\nIntérêts estimés : ${repaymentEstimate ? formatEuro(repaymentEstimate.totalInterest) : "non calculés"}\nRevenu mensuel : ${formatEuro(form.monthlyIncome)}\nDépenses mensuelles : ${formatEuro(form.monthlyExpenses)}\nDocuments transmis : ${requiredDocuments.map(({ id, label }) => `${label} (${uploadedDocuments[id]?.name ?? ""})`).join(", ")}`,
        documents: requiredDocuments.map(({ id, label }) => {
          const document = uploadedDocuments[id];
          if (!document) throw new Error(`Le document requis « ${label} » manque.`);
          return { ...document, documentType: id };
        }),
      });
      setReference(id.slice(0, 8).toUpperCase());
      setSubmitted(true);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Le dossier n’a pas pu être enregistré.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="page-shell donation-request-page">
        <SiteNav current="pret" />

        <section className="donation-confirmation">
          <div className="confirmation-card success-card">
            <span className="eyebrow">Demande enregistrée</span>
            <h1>Votre demande de prêt a bien été soumise.</h1>
            <p>
              {form.fullName}, votre dossier a bien été reçu par Fundora. L’équipe analysera vos
              justificatifs, votre capacité de remboursement et votre besoin pour décider du montant,
              de la durée et des conditions du prêt.
            </p>

            <div className="confirmation-grid">
              <div className="confirmation-box">
                <span>Référence</span>
                <strong>#{reference}</strong>
              </div>
              <div className="confirmation-box">
                <span>Montant demandé</span>
                <strong>{estimatedAmount}</strong>
              </div>
              <div className="confirmation-box">
                <span>Statut</span>
                <strong>En validation</strong>
              </div>
            </div>

            <div className="confirmation-actions">
              <Link href="/pret" className="secondary-button">
                Voir les prêts
              </Link>
              <Link href={applicant ? `/dashboard/${applicant.user}` : "/dashboard"} className="primary-button">
                Accéder au dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell donation-request-page">
      <SiteNav current="pret" />

      <section className="request-flow-shell">
        <div className="request-flow-header">
          <span className="eyebrow">Demande de prêt</span>
          <h1>Déposez votre dossier de financement.</h1>
          <p>Préparez vos justificatifs. Si certains documents ou démarches impliquent des frais, leur montant vous sera communiqué avant toute étape concernée. Aucun paiement n’est déclenché automatiquement par l’envoi du dossier.</p>
        </div>

        <div className="stepper" aria-label="Étapes du formulaire de prêt">
          {steps.map((step, index) => (
            <div key={step} className={`step-node ${index === currentStep ? "active" : ""}`}>
              <span>{index + 1}</span>
              <small>{step}</small>
            </div>
          ))}
        </div>

        <div className="request-form-panel">
          {currentStep === 0 && (
            <div className="request-step">
              <h2>Informations personnelles</h2>
              <div className="form-grid">
                <label className="field">
                  <span>Nom complet</span>
                  <input value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Téléphone</span>
                  <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} required />
                </label>
                <label className="field">
                  <span>E-mail</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Date de naissance</span>
                  <input type="date" value={form.birthDate} onChange={(e) => handleChange("birthDate", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Ville</span>
                  <input value={form.city} onChange={(e) => handleChange("city", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Pays</span>
                  <input value={form.country} onChange={(e) => handleChange("country", e.target.value)} required />
                </label>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="request-step">
              <h2>Budget et capacité de remboursement</h2>
              <div className="form-grid">
                <label className="field">
                  <span>Type de prêt</span>
                  <select value={form.loanType} onChange={(e) => handleChange("loanType", e.target.value)}>
                    <option>Prêt personnel rapide</option>
                    <option>Prêt pour projet professionnel</option>
                    <option>Prêt social et d’urgence</option>
                  </select>
                </label>
                <label className="field">
                  <span>Montant souhaité (€)</span>
                  <input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Revenu mensuel (€)</span>
                  <input type="number" min="0" step="0.01" value={form.monthlyIncome} onChange={(e) => handleChange("monthlyIncome", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Dépenses mensuelles (€)</span>
                  <input type="number" min="0" step="0.01" value={form.monthlyExpenses} onChange={(e) => handleChange("monthlyExpenses", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Durée</span>
                  <select value={form.loanTerm} onChange={(e) => handleChange("loanTerm", e.target.value)}>
                    <option>12 mois</option>
                    <option>18 mois</option>
                    <option>24 mois</option>
                    <option>36 mois</option>
                  </select>
                </label>
                <label className="field">
                  <span>Objet du prêt</span>
                  <input value={form.purpose} onChange={(e) => handleChange("purpose", e.target.value)} required />
                </label>
              </div>
              <div className="summary-box loan-repayment-estimate" aria-live="polite">
                <div>
                  <strong>Estimation de remboursement au taux annuel de 2 %</strong>
                  <p>
                    Estimation indicative calculée en mensualités constantes, hors frais éventuels.
                    Le taux et le montant définitifs seront confirmés après étude de votre dossier.
                  </p>
                </div>
                {repaymentEstimate ? (
                  <>
                    <div className="summary-row">
                      <span>Mensualité estimée</span>
                      <strong>{formatEuro(repaymentEstimate.monthlyPayment)} / mois</strong>
                    </div>
                    <div className="summary-row">
                      <span>Montant total estimé</span>
                      <strong>{formatEuro(repaymentEstimate.totalRepayment)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Intérêts estimés</span>
                      <strong>{formatEuro(repaymentEstimate.totalInterest)}</strong>
                    </div>
                  </>
                ) : (
                  <p>Indiquez le montant du prêt pour calculer votre mensualité estimée.</p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="request-step">
              <h2>Pièces justificatives</h2>
              <p>Joignez obligatoirement un fichier dans chacun des trois emplacements. Formats acceptés : PDF, JPG ou PNG ; 400 Ko maximum par fichier.</p>
              <div className="loan-document-upload-grid">
                {requiredDocuments.map((requiredDocument) => {
                  const uploaded = uploadedDocuments[requiredDocument.id];
                  return (
                    <div className="field field-upload loan-document-upload" key={requiredDocument.id}>
                      <label htmlFor={`loan-document-${requiredDocument.id}`}>
                        {requiredDocument.label} <strong aria-hidden="true">*</strong>
                      </label>
                      <input
                        id={`loan-document-${requiredDocument.id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        required={!uploaded}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadDocument(requiredDocument.id, file);
                          event.target.value = "";
                        }}
                      />
                      {uploaded ? (
                        <span className="loan-document-selected">
                          {uploaded.name}
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              setUploadedDocuments((current) => ({ ...current, [requiredDocument.id]: null }));
                            }}
                          >
                            Retirer
                          </button>
                        </span>
                      ) : (
                        <small>Fichier obligatoire</small>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="request-step">
              <h2>Validation finale</h2>
              <div className="summary-box">
                <div className="summary-row">
                  <span>Nom</span>
                  <strong>{form.fullName}</strong>
                </div>
                <div className="summary-row">
                  <span>Ville / Pays</span>
                  <strong>{form.city}, {form.country}</strong>
                </div>
                <div className="summary-row">
                  <span>Type de prêt</span>
                  <strong>{form.loanType}</strong>
                </div>
                <div className="summary-row">
                  <span>Montant demandé</span>
                  <strong>{estimatedAmount}</strong>
                </div>
                <div className="summary-row">
                  <span>Revenu mensuel</span>
                  <strong>{formatEuro(form.monthlyIncome)}</strong>
                </div>
                <div className="summary-row">
                  <span>Dépenses mensuelles</span>
                  <strong>{formatEuro(form.monthlyExpenses)}</strong>
                </div>
                <div className="summary-row">
                  <span>Durée</span>
                  <strong>{form.loanTerm}</strong>
                </div>
                <div className="summary-row">
                  <span>Taux annuel indicatif</span>
                  <strong>2 %</strong>
                </div>
                <div className="summary-row">
                  <span>Mensualité estimée (hors frais)</span>
                  <strong>{repaymentEstimate ? `${formatEuro(repaymentEstimate.monthlyPayment)} / mois` : "Non calculée"}</strong>
                </div>
                <div className="summary-row">
                  <span>Total à rembourser estimé</span>
                  <strong>{repaymentEstimate ? formatEuro(repaymentEstimate.totalRepayment) : "Non calculé"}</strong>
                </div>
                <div className="summary-row">
                  <span>Pièce d’identité</span>
                  <strong>{uploadedDocuments.identity?.name ?? "Non jointe"}</strong>
                </div>
                <div className="summary-row">
                  <span>Revenus et dépenses</span>
                  <strong>{uploadedDocuments.income_expenses?.name ?? "Non joints"}</strong>
                </div>
                <div className="summary-row">
                  <span>Relevés bancaires</span>
                  <strong>{uploadedDocuments.bank_statements?.name ?? "Non joints"}</strong>
                </div>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => handleChange("consent", e.target.checked)}
                />
                <span>
                  Je confirme que les informations sont exactes, que les documents joints sont
                  authentiques et que je souhaite soumettre cette demande au traitement Fundora.
                </span>
              </label>
            </div>
          )}

          <div className="request-navigation">
            <button className="secondary-button" onClick={previousStep} disabled={currentStep === 0} type="button">
              Précédent
            </button>

            {isLastStep ? (
              <button className="primary-button" onClick={handleSubmit} type="button" disabled={!form.consent || submitting || !applicant}>
                {submitting ? "Envoi en cours…" : "Valider la demande"}
              </button>
            ) : (
              <button className="primary-button" onClick={nextStep} type="button">
                Suivant
              </button>
            )}
          </div>
          {uploadError ? <p className="form-error" role="alert">{uploadError}</p> : null}
        </div>
      </section>
    </main>
  );
}
