"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { createApplication } from "@/lib/request-api";
import { donationCategories } from "@/lib/donation-categories";
import { formatDollars } from "@/lib/format";

const steps = [
  "Perfil",
  "Necesidad",
  "Resumen",
  "Validación",
];

const stepDescriptions = [
  "Algunas informaciones para identificar y contactar al solicitante.",
  "Indica el monto exacto que necesitas y describe tu solicitud.",
  "Revisa tu expediente antes de enviarlo.",
  "Confirma la información y valida tu solicitud final.",
];

type ApplicantSession = {
  email: string;
  name: string;
  role: "admin" | "applicant";
  user: string;
};

export function DonationRequestForm({
  initialCategory,
  initialAmount,
}: {
  initialCategory?: string;
  initialAmount?: number;
}) {
  const initialCategoryLabel = donationCategories.find((item) => item.value === initialCategory)?.label ?? "Éducation";
  const fixedAmount = typeof initialAmount === "number" && Number.isFinite(initialAmount) && initialAmount > 0 ? initialAmount : null;
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [applicant, setApplicant] = useState<ApplicantSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    city: "",
    country: "",
    amount: fixedAmount !== null ? String(fixedAmount) : "",
    description: "",
    consent: false,
  });

  const refreshApplicant = async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
    const result = await response.json();

    if (response.status === 401) {
      throw new Error("Tu sesión ya no está activa. Vuelve a iniciar sesión con tu cuenta de solicitante.");
    }
    if (!response.ok) {
      throw new Error(result.error ?? "No se pudo verificar la cuenta. Inténtalo de nuevo.");
    }
    if (result.user?.role !== "applicant") {
      throw new Error("Inicia sesión con una cuenta de solicitante para enviar esta solicitud.");
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
          setUploadError(reason instanceof Error ? reason.message : "No se pudo verificar la cuenta.");
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

  const nextStep = () => {
    setUploadError("");

    if (currentStep === 0 && (
      !form.fullName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ||
      !form.phone.trim() ||
      !form.birthDate.trim() ||
      !form.city.trim() ||
      !form.country.trim()
    )) {
      setUploadError("Completa toda tu información personal para continuar.");
      return;
    }

    if (currentStep === 1 && (
      !form.description.trim() ||
      !Number.isFinite(Number(form.amount)) ||
      Number(form.amount) <= 0
    )) {
      setUploadError("Indica el monto exacto solicitado y describe tu necesidad.");
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const previousStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  const handleChange = (field: string, value: string | boolean) => {
    if (field === "amount" && fixedAmount !== null) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.consent) {
      setUploadError("Confirma la exactitud de la información antes de enviar.");
      return;
    }

    setSubmitting(true);
    setUploadError("");

    try {
      const currentApplicant = await refreshApplicant();
      const amountRequested = fixedAmount !== null ? String(fixedAmount) : form.amount;
      const { id } = await createApplication({
        kind: "Don",
        fullName: form.fullName || currentApplicant.name,
        email: form.email || currentApplicant.email,
        phone: form.phone,
        city: form.city,
        country: form.country,
        subject: initialCategoryLabel,
        amountRequested,
        details: `Date de naissance : ${form.birthDate}\n${form.description}`,
        documents: [],
      });

      setReference(id.slice(0, 8).toUpperCase());
      setSubmitted(true);
      window.dispatchEvent(new Event("fundora-requests-updated"));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo guardar el expediente.");
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
            <span className="eyebrow">Solicitud validada</span>
            <h1>Tu solicitud ha sido recibida.</h1>
            <p>
              La solicitud de {form.fullName} ha sido registrada en el sistema de Fundación Amira Aldahab. El equipo revisará la necesidad, la urgencia y el perfil del expediente para decidir el monto exacto a otorgar.
            </p>

            <div className="confirmation-grid">
              <div className="confirmation-box">
                <span>Referencia</span>
                <strong>#{reference}</strong>
              </div>
              <div className="confirmation-box">
                <span>Monto solicitado</span>
                <strong>{formatDollars(Number(form.amount), 2, 2)}</strong>
              </div>
              <div className="confirmation-box">
                <span>Estado</span>
                <strong>En validación</strong>
              </div>
            </div>

            <div className="confirmation-actions">
              <Link href="/dons" className="secondary-button">
                Ver donaciones
              </Link>
              <Link href={applicant ? `/dashboard/${applicant.user}` : "/dashboard"} className="primary-button">
                Ir al panel
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
          <span className="eyebrow">Solicitud de donación</span>
          <h1>Tu solicitud de donación</h1>
          <p>Presenta tu necesidad en unos pasos. Podrás revisar tu expediente antes de enviarlo.</p>
        </div>

        <div className="request-progress">
          <div className="request-progress-label">
            <strong>Paso {currentStep + 1} de {steps.length}</strong>
            <span>{steps[currentStep]}</span>
          </div>
          <progress value={currentStep + 1} max={steps.length} aria-label={`Paso ${currentStep + 1} de ${steps.length}`} />
        </div>

        <div className="stepper" role="list" aria-label="Pasos del formulario">
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
                <h2>{currentStep === 0 ? "Tu información" : currentStep === 1 ? "Tu necesidad" : currentStep === 2 ? "Resumen" : "Validación final"}</h2>
                <p>{stepDescriptions[currentStep]}</p>
              </div>
            </div>

            {currentStep === 0 && (
              <div className="request-step">
                <div className="form-grid">
                  <label className="field">
                    <span>Nombre completo</span>
                    <input autoComplete="name" value={form.fullName} onChange={(event) => handleChange("fullName", event.target.value)} required />
                  </label>

                  <label className="field">
                    <span>Teléfono</span>
                    <input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} required />
                  </label>

                  <label className="field">
                    <span>Correo electrónico</span>
                    <input type="email" autoComplete="email" value={form.email} onChange={(event) => handleChange("email", event.target.value)} required />
                  </label>

                  <label className="field">
                    <span>Fecha de nacimiento</span>
                    <input type="date" autoComplete="bday" value={form.birthDate} onChange={(event) => handleChange("birthDate", event.target.value)} required />
                  </label>

                  <label className="field">
                    <span>Ciudad</span>
                    <input autoComplete="address-level2" value={form.city} onChange={(event) => handleChange("city", event.target.value)} required />
                  </label>

                  <label className="field">
                    <span>País</span>
                    <input autoComplete="country-name" value={form.country} onChange={(event) => handleChange("country", event.target.value)} required />
                  </label>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="request-step">
                <div className="form-grid">
                  <label className="field wide">
                    <span>Monto solicitado ($)</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) => handleChange("amount", event.target.value)}
                      required
                      readOnly={fixedAmount !== null}
                      disabled={fixedAmount !== null}
                    />
                    {fixedAmount !== null ? <small className="field-hint">Le montant est fixé par l’administration pour cette catégorie et ne peut pas être modifié.</small> : null}
                  </label>

                  <label className="field wide">
                    <span>Describe tu necesidad</span>
                    <textarea
                      value={form.description}
                      onChange={(event) => handleChange("description", event.target.value)}
                      required
                      maxLength={5000}
                      rows={5}
                      placeholder="Explica tu situación, las dificultades encontradas y por qué esta ayuda es importante."
                    />
                    <small className="field-hint">{form.description.length}/5 000 caracteres</small>
                  </label>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="request-step">
                <div className="summary-box">
                  <div className="summary-row">
                    <span>Nombre</span>
                    <strong>{form.fullName}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Correo</span>
                    <strong>{form.email}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Ciudad / País</span>
                    <strong>{form.city}, {form.country}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Tipo de solicitud</span>
                    <strong>{initialCategoryLabel}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Monto solicitado</span>
                    <strong>{formatDollars(Number(form.amount), 2, 2)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Necesidad</span>
                    <strong>{form.description}</strong>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="request-step">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(event) => handleChange("consent", event.target.checked)}
                  />
                  <span>Confirmo que la información anterior es exacta y que deseo enviar esta solicitud para validación.</span>
                </label>
              </div>
            )}

            <div className="request-navigation">
              <button className="secondary-button" onClick={previousStep} disabled={currentStep === 0} type="button">
                Anterior
              </button>

              {isLastStep ? (
                <button className="primary-button" onClick={handleSubmit} type="button" disabled={!form.consent || submitting}>
                  {submitting ? "Enviando…" : "Validar solicitud"}
                </button>
              ) : (
                <button className="primary-button" onClick={nextStep} type="button">
                  Siguiente
                </button>
              )}
            </div>

            {!applicant && !uploadError ? <p className="form-error" role="status">Verificando la cuenta del solicitante…</p> : null}
            {uploadError ? <p className="form-error" role="alert">{uploadError}</p> : null}
          </div>

          <aside className="request-help-panel">
            <span className="request-help-icon" aria-hidden="true">i</span>
            <h2>Un expediente claro facilita su revisión</h2>
            <p>Describe tu situación con información precisa e indica el monto exacto solicitado.</p>
            <ul>
              <li><span aria-hidden="true">✓</span> Tras el envío, el seguimiento estará disponible en tu espacio.</li>
              <li><span aria-hidden="true">✓</span> Puedes volver al paso anterior antes del envío.</li>
              <li><span aria-hidden="true">✓</span> El equipo revisará la necesidad y el monto indicados.</li>
            </ul>
            <div className="request-help-note">
              <strong>¿Necesitas ayuda?</strong>
              <span>Comprueba que tus datos estén actualizados y que el monto solicitado corresponda exactamente a tu necesidad.</span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
