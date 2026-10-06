"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BrandGlyph } from "@/components/fundora-brand";
import { createId, serializeFiles, upsertRequest, type RequestDocument } from "@/lib/fundora-requests";

const steps = [
  "Profil",
  "Besoin",
  "Documents",
  "Validation",
];

export default function DonationRequestPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [uploadedDocuments, setUploadedDocuments] = useState<RequestDocument[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [form, setForm] = useState({
    fullName: "Anna Müller",
    email: "anna.mueller@email.de",
    phone: "+49 170 123 4567",
    birthDate: "12/05/1988",
    city: "Berlin",
    country: "Allemagne",
    requestType: "Aide pour l’éducation",
    amount: "1250",
    monthlyIncome: "€ 1.600",
    household: "3 personnes à charge",
    urgency: "Très urgent",
    description:
      "Mes trois enfants ont besoin d’aide pour les frais scolaires, les fournitures et le suivi éducatif. Je suis dans un besoin immédiat.",
    project: "Soutien scolaire + fournitures + transport",
    documents: "Pièce d’identité, justificatif de domicile, facture scolaire, preuve de revenu",
    consent: true,
  });

  const isLastStep = currentStep === steps.length - 1;

  const amountSuggestion = useMemo(() => {
    if (form.requestType.includes("Éducation")) return "€ 1.250";
    if (form.requestType.includes("Santé")) return "€ 1.800";
    if (form.requestType.includes("Logement")) return "€ 2.400";
    return "€ 1.000";
  }, [form.requestType]);

  const nextStep = () => setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  const previousStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const id = createId();

    try {
      upsertRequest({
        id,
        kind: "Don",
        createdAt: new Date().toISOString(),
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        country: form.country,
        subject: form.requestType,
        amountRequested: form.amount,
        details: `${form.description}\nUtilisation : ${form.project}\nRevenu : ${form.monthlyIncome}\nSituation : ${form.household}\nUrgence : ${form.urgency}`,
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
            <Link href="/dons">Dons</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
          <Link href="/dons" className="nav-button">
            Retour aux dons
          </Link>
        </nav>

        <section className="donation-confirmation">
          <div className="confirmation-card success-card">
            <span className="eyebrow">Demande validée</span>
            <h1>Votre demande a bien été reçue.</h1>
            <p>
              La demande de {form.fullName} a été enregistrée dans le système Fundora. L’équipe va
              vérifier les justificatifs, l’urgence du besoin et le profil du dossier pour décider du
              montant exact à attribuer.
            </p>

            <div className="confirmation-grid">
              <div className="confirmation-box">
                <span>Référence</span>
                <strong>#{reference}</strong>
              </div>
              <div className="confirmation-box">
                <span>Montant estimé</span>
                <strong>{amountSuggestion}</strong>
              </div>
              <div className="confirmation-box">
                <span>Statut</span>
                <strong>En validation</strong>
              </div>
            </div>

            <div className="confirmation-actions">
              <Link href="/dons" className="secondary-button">
                Voir les dons
              </Link>
              <Link href="/dashboard/anna" className="primary-button">
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
          <Link href="/dons">Dons</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Connexion</Link>
        </div>

        <Link href="/dons" className="nav-button">
          Retour
        </Link>
      </nav>

      <section className="request-flow-shell">
        <div className="request-flow-header">
          <span className="eyebrow">Demande de don</span>
          <h1>Remplissez votre dossier en quelques étapes.</h1>
        </div>

        <div className="stepper" aria-label="Étapes du formulaire">
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
              <h2>Détails du besoin</h2>
              <div className="form-grid">
                <label className="field">
                  <span>Type de demande</span>
                  <select value={form.requestType} onChange={(e) => handleChange("requestType", e.target.value)} required>
                    <option>Aide pour l’éducation</option>
                    <option>Soutien santé</option>
                    <option>Aide au logement</option>
                    <option>Projet familial</option>
                  </select>
                </label>
                <label className="field">
                  <span>Montant demandé</span>
                  <input value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Revenu mensuel</span>
                  <input value={form.monthlyIncome} onChange={(e) => handleChange("monthlyIncome", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Ménage / situation</span>
                  <input value={form.household} onChange={(e) => handleChange("household", e.target.value)} required />
                </label>
                <label className="field wide">
                  <span>Décrivez votre besoin</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Niveau d’urgence</span>
                  <select value={form.urgency} onChange={(e) => handleChange("urgency", e.target.value)}>
                    <option>Très urgent</option>
                    <option>Urgent</option>
                    <option>Normal</option>
                  </select>
                </label>
                <label className="field">
                  <span>Utilisation du financement</span>
                  <input value={form.project} onChange={(e) => handleChange("project", e.target.value)} required />
                </label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="request-step">
              <h2>Pièces justificatives obligatoires</h2>
              <div className="form-grid">
                <label className="field wide">
                  <span>Liste des documents requis</span>
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
                  <span>Téléphone</span>
                  <strong>{form.phone}</strong>
                </div>
                <div className="summary-row">
                  <span>Type de besoin</span>
                  <strong>{form.requestType}</strong>
                </div>
                <div className="summary-row">
                  <span>Montant demandé</span>
                  <strong>{form.amount} €</strong>
                </div>
                <div className="summary-row">
                  <span>Montant estimé par Fundora</span>
                  <strong>{amountSuggestion}</strong>
                </div>
                <div className="summary-row">
                  <span>Documents requis</span>
                  <strong>{form.documents}</strong>
                </div>
              </div>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => handleChange("consent", e.target.checked)}
                />
                <span>Je confirme que les informations ci-dessus sont exactes et que les documents envoyés sont authentiques.</span>
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
