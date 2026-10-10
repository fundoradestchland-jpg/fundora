"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { isSafeNextPath } from "@/lib/format";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="page-shell auth-page"><section className="auth-shell"><div className="auth-panel auth-form-panel"><h1>Chargement…</h1></div></section></main>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(() => {
    const nextPath = searchParams.get("next");
    return isSafeNextPath(nextPath) ? nextPath : null;
  }, [searchParams]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "La vérification de session est indisponible.");
        return result.user as { role: "admin" | "applicant"; user: string } | null;
      })
      .then((user) => {
        if (!active) return;
        if (user) {
          router.replace(redirectPath ?? (user.role === "admin" ? "/admin/dossiers" : `/dashboard/${user.user}`));
        } else {
          setCheckingSession(false);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "La vérification de session est indisponible.");
          setCheckingSession(false);
        }
      });
    return () => { active = false; };
  }, [redirectPath, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Opération impossible.");

      try {
        localStorage.setItem("fundora_session", JSON.stringify(result.user));
      } catch (storageError) {
        console.error("Session cache could not be saved", storageError);
      }
      window.dispatchEvent(new Event("fundora-session-updated"));

      const destination = redirectPath ?? (result.user.role === "admin" ? "/admin/dossiers" : `/dashboard/${result.user.user}`);
      window.location.assign(destination);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Opération impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="page-shell auth-page">
        <section className="auth-shell">
          <div className="auth-panel auth-form-panel">
            <h1>Vérification de votre session…</h1>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell auth-page">
      <section className="auth-shell">
        <div className="auth-panel auth-visual" aria-label="Connexion Fundora">
          <div className="auth-badge">Compte sécurisé</div>
          <div className="auth-visual-copy">
            <span className="eyebrow">Accès sécurisé</span>
            <h2>Bienvenue sur Fundora</h2>
            <p>Gérez vos demandes, vos dons et votre solde dans un espace client simple et fiable.</p>
          </div>

        </div>

        <div className="auth-panel auth-form-panel">
          <div className="brand" aria-label="Fundora brand">
            <BrandGlyph />
          </div>

          <div className="auth-form-header">
            <span className="eyebrow">{mode === "login" ? "Connexion" : "Inscription"}</span>
            <h1>{mode === "login" ? "Accédez à votre espace." : "Créez votre compte Fundora."}</h1>
          </div>

          <div className="auth-mode-switch" role="group" aria-label="Choisir une action">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Connexion</button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Inscription</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label className="field">
                <span>Nom complet</span>
                <input type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Votre nom complet" minLength={2} maxLength={200} required />
              </label>
            )}

            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nom@exemple.fr"
                required
              />
            </label>

            <label className="field">
              <span>Mot de passe</span>
              <div className="password-control">
                <input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Au moins 8 caractères" minLength={mode === "register" ? 8 : undefined} required />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? "Masquer" : "Afficher"}</button>
              </div>
            </label>

            {mode === "register" && (
              <label className="field">
                <span>Confirmer le mot de passe</span>
                <div className="password-control">
                  <input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Répétez le mot de passe" minLength={8} required />
                  <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"}>{showConfirmPassword ? "Masquer" : "Afficher"}</button>
                </div>
              </label>
            )}

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" defaultChecked />
                <span>Se souvenir de moi</span>
              </label>
              <span>Accès administrateur ou demandeur</span>
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="primary-button login-button" disabled={submitting}>
              {submitting ? "Traitement…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <div className="auth-meta">
            <span>{mode === "login" ? "Pas encore inscrit ?" : "Déjà inscrit ?"}</span>
            <button type="button" className="auth-mode-link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
          <div className="auth-meta">
            <Link href="/">Retour à l’accueil</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
