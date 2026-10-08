"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { serializeFiles, type RequestDocument } from "@/lib/fundora-requests";
import { createApplication } from "@/lib/request-api";
import { donationCategories } from "@/lib/donation-categories";

const steps = [
  "Profil",
  "Besoin",
  "Documents",
  "Validation",
];

const stepDescriptions = [
  "Quelques informations pour identifier et recontacter le demandeur.",
  "Présentez votre situation et le soutien financier dont vous avez besoin.",
  "Ajoutez les justificatifs utiles à l’étude de votre demande.",
  "Vérifiez les informations avant de transmettre le dossier.",
];

type ApplicantSession = {
  email: string;
  name: string;
  role: "admin" | "applicant";
  user: string;
};

export function DonationRequestForm({ initialCategory }: { initialCategory?: string }) {
  const initialCategoryLabel = donationCategories.find((item) => item.value === initialCategory)?.label ?? "Éducation";
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [applicant, setApplicant] = useState<ApplicantSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<RequestDocument[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    city: "",
    country: "",
    requestType: initialCategoryLabel,
    amount: "",
    monthlyIncome: "",
    household: "",
    urgency: "Normal",
    description: "",
    project: "",
    documents: "Pièce d’identité, justificatif du besoin et justificatif de revenus",
    consent: false,
  });

  const refreshApplicant = async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
    const result = await response.json();
    if (response.status === 401) {
      throw new Error("Votre session n’est plus active. Reconnectez-vous à votre compte demandeur.");
    }
    if (!response.ok) {
      throw new Error(result.error ?? "Vérification du compte impossible. Réessayez.");
    }
    if (result.user?.role !== "applicant") {
      throw new Error("Connectez-vous à un compte demandeur pour envoyer cette demande.");
    }

    const user = result.user as ApplicantSession;
    setApplicant(user);
    setForm((current) => ({
      ...current,
      fullName: current.fullName || user.name,
      email: current.email || user.email,
    }));
    setUploadError("");
    return user;
  };

  useEffect(() => {
    let active = true;
    const checkApplicant = () => {
      void refreshApplicant().catch((reason: unknown) => {
        if (active) {
          setApplicant(null);
          setUploadError(reason instanceof Error ? reason.message : "Vérification du compte impossible.");
        }
      });
    };
    checkApplicant();
    window.addEventListener("fundora-session-updated", checkApplicant);
    window.addEventListener("storage", checkApplicant);
    return () => {
      active = false;
      window.removeEventListener("fundora-session-updated", checkApplicant);
      window.removeEventListener("storage", checkApplicant);
    };
  }, []);

  const isLastStep = currentStep === steps.length - 1;

  const amountSuggestion = useMemo(() => {
    if (form.requestType.includes("Éducation")) return "€ 1.250";
    if (form.requestType.includes("Santé")) return "€ 1.800";
    if (form.requestType.includes("Logement")) return "€ 2.400";
    return "€ 1.000";
  }, [form.requestType]);

  const nextStep = () => {
    setUploadError("");
    if (currentStep === 0 && (
      !form.fullName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ||
      !form.phone.trim() || !form.birthDate.trim() || !form.city.trim() || !form.country.trim()
    )) {
      setUploadError("Complétez toutes vos informations personnelles pour continuer.");
      return;
    }
    if (currentStep === 1 && (
      !form.description.trim() || !form.project.trim() || !form.household.trim() ||
      !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0 ||
      !Number.isFinite(Number(form.monthlyIncome)) || Number(form.monthlyIncome) < 0
    )) {
      setUploadError("Indiquez le montant demandé, votre revenu, votre situation et décrivez votre besoin.");
      return;
    }
    if (currentStep === 2 && uploadedDocuments.length === 0) {
      setUploadError("Joignez au moins un justificatif pour votre demande.");
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };
  const previousStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const removeDocument = (documentId: string) => {
    setUploadedDocuments((current) => current.filter((document) => document.id !== documentId));
  };

  const handleSubmit = async () => {
    if (!form.consent) {
      setUploadError("Confirmez l’exactitude des informations avant l’envoi.");
      return;
    }
    setSubmitting(true);
    setUploadError("");
    try {
      const currentApplicant = await refreshApplicant();
      const { id } = await createApplication({
        kind: "Don",
        fullName: form.fullName || currentApplicant.name,
        email: form.email || currentApplicant.email,
        phone: form.phone,
        city: form.city,
        country: form.country,
        subject: form.requestType,
        amountRequested: form.amount,
        details: `Date de naissance : ${form.birthDate}\n${form.description}\nUtilisation : ${form.project}\nRevenu : ${form.monthlyIncome}\nSituation : ${form.household}\nUrgence : ${form.urgency}\nPièces attendues : ${form.documents}`,
        documents: uploadedDocuments.map(({ id: documentId, name, size, dataUrl }) => ({ id: documentId, name, size, dataUrl })),
      });
      setReference(id.slice(0, 8).toUpperCase());
      setSubmitted(true);
      window.dispatchEvent(new Event("fundora-requests-updated"));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Le dossier n’a pas pu être enregistré.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="page-shell donation-request-page">
        <SiteNav current="dons" />

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
      <SiteNav current="dons" />

      <section className="request-flow-shell">
        <div className="request-flow-header">
          <span className="eyebrow">Demande de don</span>
          <h1>Votre demande de don</h1>
          <p>Présentez votre besoin en quelques étapes. Vous pourrez vérifier votre dossier avant de l’envoyer.</p>
        </div>

        <div className="request-progress">
          <div className="request-progress-label">
            <strong>Étape {currentStep + 1} sur {steps.length}</strong>
            <span>{steps[currentStep]}</span>
          </div>
          <progress value={currentStep + 1} max={steps.length} aria-label={`Étape ${currentStep + 1} sur ${steps.length}`} />
        </div>

        <div className="stepper" role="list" aria-label="Étapes du formulaire">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`step-node ${index === currentStep ? "active" : ""} ${index < currentStep ? "complete" : ""}`}
              role="listitem"
              aria-current={index === currentStep ? "step" : undefined}
            >
              <span>{index + 1}</span>
              <small>{step}</small>
            </div>
          ))}
        </div>

        <div className="request-workspace">
          <div className="request-form-panel">
            <div className="request-step-heading">
              <span className="request-step-count">0{currentStep + 1}</span>
              <div>
                <h2>{currentStep === 0 ? "Vos informations" : currentStep === 1 ? "Votre situation" : currentStep === 2 ? "Vos justificatifs" : "Relire votre dossier"}</h2>
                <p>{stepDescriptions[currentStep]}</p>
              </div>
            </div>
          {currentStep === 0 && (
            <div className="request-step">
              <div className="form-grid">
                <label className="field">
                  <span>Nom complet</span>
                  <input autoComplete="name" value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Téléphone</span>
                  <input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} required />
                </label>
                <label className="field">
                  <span>E-mail</span>
                  <input type="email" autoComplete="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Date de naissance</span>
                  <input type="date" autoComplete="bday" value={form.birthDate} onChange={(e) => handleChange("birthDate", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Ville</span>
                  <input autoComplete="address-level2" value={form.city} onChange={(e) => handleChange("city", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Pays</span>
                  <input autoComplete="country-name" value={form.country} onChange={(e) => handleChange("country", e.target.value)} required />
                </label>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="request-step">
              <div className="form-grid">
                <label className="field">
                  <span>Type de demande</span>
                  <select value={form.requestType} onChange={(e) => handleChange("requestType", e.target.value)} required>
                    {donationCategories.map((category) => (
                      <option key={category.value} value={category.label}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Montant demandé (€)</span>
                  <input type="number" min="1" step="0.01" value={form.amount} onChange={(e) => handleChange("amount", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Revenu mensuel (€)</span>
                  <input type="number" min="0" step="0.01" value={form.monthlyIncome} onChange={(e) => handleChange("monthlyIncome", e.target.value)} required />
                </label>
                <label className="field">
                  <span>Ménage / situation</span>
                  <input value={form.household} onChange={(e) => handleChange("household", e.target.value)} required placeholder="Ex. personne seule, famille avec enfants…" />
                </label>
                <label className="field wide">
                  <span>Décrivez votre besoin</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    required
                    maxLength={5000}
                    rows={5}
                    placeholder="Expliquez votre situation, les difficultés rencontrées et pourquoi cette aide est importante."
                  />
                  <small className="field-hint">{form.description.length}/5 000 caractères</small>
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
                  <input value={form.project} onChange={(e) => handleChange("project", e.target.value)} required placeholder="Ex. frais de logement, soins, scolarité…" />
                </label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="request-step">
              <div className="form-grid">
                <div className="document-guidance field wide">
                  <strong>Justificatifs conseillés</strong>
                  <p>{form.documents}</p>
                  <small>Vous pouvez joindre un ou plusieurs fichiers pour appuyer votre demande.</small>
                </div>

                <div className="field field-upload wide">
                  <span>Ajouter des justificatifs</span>
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
                  {uploadedDocuments.length > 0 && (
                    <ul className="uploaded-document-list" aria-label="Fichiers ajoutés">
                      {uploadedDocuments.map((document) => (
                        <li key={document.id}>
                          <span>{document.name}</span>
                          <button type="button" onClick={() => removeDocument(document.id)} aria-label={`Retirer ${document.name}`}>Retirer</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="request-step">
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
              <button className="primary-button" onClick={handleSubmit} type="button" disabled={!form.consent || submitting}>
                {submitting ? "Envoi en cours…" : "Valider la demande"}
              </button>
            ) : (
              <button className="primary-button" onClick={nextStep} type="button">
                Suivant
              </button>
            )}
          </div>
          {!applicant && !uploadError ? <p className="form-error" role="status">Vérification du compte demandeur…</p> : null}
          {uploadError ? <p className="form-error" role="alert">{uploadError}</p> : null}
          </div>

          <aside className="request-help-panel">
            <span className="request-help-icon" aria-hidden="true">i</span>
            <h2>Un dossier clair facilite son étude</h2>
            <p>Décrivez votre situation avec des informations exactes et joignez des pièces lisibles.</p>
            <ul>
              <li><span aria-hidden="true">✓</span> Après l’envoi, le suivi est disponible dans votre espace.</li>
              <li><span aria-hidden="true">✓</span> Vous pouvez revenir à l’étape précédente avant l’envoi.</li>
              <li><span aria-hidden="true">✓</span> L’équipe examinera les informations et justificatifs transmis.</li>
            </ul>
            <div className="request-help-note">
              <strong>Besoin d’aide ?</strong>
              <span>Vérifiez que vos coordonnées sont à jour et que chaque justificatif est lisible.</span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
