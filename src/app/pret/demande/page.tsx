"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BrandGlyph } from "@/components/fundora-brand";
import { createId, serializeFiles, upsertRequest, type RequestDocument } from "@/lib/fundora-requests";

const steps = ["Profil", "Budget", "Documents", "Validation"];

export default function LoanRequestPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState<RequestDocument[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [form, setForm] = useState({
    fullName: "Yann Martin",
    email: "yann.martin@email.de",
    phone: "+49 151 771 9955",
    birthDate: "02/11/1986",
    city: "Hambourg",
    country: "Allemagne",
    loanType: "Prêt personnel rapide",
    amount: "5000",
    monthlyIncome: "€ 2.900",
    monthlyExpenses: "€ 1.350",
    purpose: "Frais de mobilité et maintien de l’activité professionnelle",
    loanTerm: "24 mois",
    documents: "Pièce d’identité, bulletins de salaire, justificatif de domicile, relevés bancaires",
    consent: true,
  });

  const isLastStep = currentStep === steps.length - 1;
  const estimatedAmount = useMemo(() => {
    if (form.amount === "5000") return "€ 5.000";
    if (form.amount === "12000") return "€ 12.000";
    if (form.amount === "3200") return "€ 3.200";
    return `€ ${Number(form.amount || 0).toLocaleString("fr-FR")}`;
  }, [form.amount]);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  const previousStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  const handleSubmit = () => {
    const id = createId();

    try {
      upsertRequest({
        id,
        kind: "Prêt",
        createdAt: new Date().toISOString(),
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        country: form.country,
        subject: form.loanType,
        amountRequested: form.amount,
        details: `${form.purpose}\nDurée : ${form.loanTerm}\nRevenu : ${form.monthlyIncome}\nDépenses : ${form.monthlyExpenses}`,
        documents: uploadedDocuments,
        status: "En attente",
        reviewNote: "",
        approvedAmount: "",
        tasks: [],
      });
      setReference(id.slice(0, 8).toUpperCase());
      setSubmitted(true);
    } catch {
      setUploadError("Le dossier n’a pas pu être enregistré. Réduisez la taille des fichiers joints.");
    }
  };

  if (submitted) {
    return (
      <main className="page-shell donation-request-page">
        <nav className="topbar" aria-label="Navigation principale">
          <div className="brand" aria-label="Fundora brand">
            <BrandGlyph />
            <span className="brand-word">Fundora</span>
          </div>
          <div className="nav-links">
            <Link href="/">Accueil</Link>
            <Link href="/pret">Prêt</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
          <Link href="/pret" className="nav-button">
            Retour aux prêts
          </Link>
        </nav>

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
              <Link href="/dashboard/yann" className="primary-button">
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
      <nav className="topbar" aria-label="Navigation principale">
        <div className="brand" aria-label="Fundora brand">
          <BrandGlyph />
          <span className="brand-word">Fundora</span>
        </div>

        <div className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/pret">Prêt</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Connexion</Link>
        </div>

        <Link href="/pret" className="nav-button">
          Retour
        </Link>
      </nav>

      <section className="request-flow-shell">
        <div className="request-flow-header">
          <span className="eyebrow">Demande de prêt</span>
          <h1>Déposez votre dossier de financement.</h1>
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
                  <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Date de naissance</span>
                  <input value={form.birthDate} onChange={(e) => handleChange("birthDate", e.target.value)} required />
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
                  <span>Montant souhaité</span>
                  <input value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Revenu mensuel</span>
                  <input value={form.monthlyIncome} onChange={(e) => handleChange("monthlyIncome", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Dépenses mensuelles</span>
                  <input value={form.monthlyExpenses} onChange={(e) => handleChange("monthlyExpenses", e.target.value)} required />
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
            </div>
          )}

          {currentStep === 2 && (
            <div className="request-step">
              <h2>Pièces justificatives</h2>
              <div className="form-grid">
                <label className="field wide">
                  <span>Documents requis</span>
                  <textarea
                    value={form.documents}
                    onChange={(e) => handleChange("documents", e.target.value)}
                    required
                  />
                </label>

                <div className="field field-upload wide">
                  <span>Joindre les fichiers</span>
                  <div className="upload-stack">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={async (event) => {
                        try {
                          const files = await serializeFiles(event.target.files ?? []);
                          setUploadedDocuments((current) => [...current, ...files]);
                          setUploadError("");
                          event.target.value = "";
                        } catch (error) {
                          setUploadError(error instanceof Error ? error.message : "Fichier illisible.");
                        }
                      }}
                    />
                  </div>
                  <small>PDF, JPG ou PNG, 400 Ko maximum par fichier.</small>
                  {uploadedDocuments.map((document) => <small key={document.id}>{document.name}</small>)}
                  {uploadError ? <small className="form-error">{uploadError}</small> : null}
                </div>
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
                  <span>Montant</span>
                  <strong>{estimatedAmount}</strong>
                </div>
                <div className="summary-row">
                  <span>Durée</span>
                  <strong>{form.loanTerm}</strong>
                </div>
                <div className="summary-row">
                  <span>Documents</span>
                  <strong>{form.documents}</strong>
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
              <button className="primary-button" onClick={handleSubmit} type="button" disabled={!form.consent}>
                Valider la demande
              </button>
            ) : (
              <button className="primary-button" onClick={nextStep} type="button">
                Suivant
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
