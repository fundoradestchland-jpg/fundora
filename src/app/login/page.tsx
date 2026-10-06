"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandGlyph } from "@/components/fundora-brand";

const adminCredentials = {
  email: "admin@fundora.com",
  password: "Admin1234",
};

const userCredentials = {
  email: "anna.mueller@email.de",
  password: "Fundora2025",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(adminCredentials.email);
  const [password, setPassword] = useState(adminCredentials.password);
  const [error, setError] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === adminCredentials.email && password === adminCredentials.password) {
      localStorage.setItem(
        "fundora_session",
        JSON.stringify({ role: "admin", email: normalizedEmail, name: "Administrateur Fundora" })
      );
      router.push("/admin/dons");
      return;
    }

    if (normalizedEmail === userCredentials.email && password === userCredentials.password) {
      localStorage.setItem(
        "fundora_session",
        JSON.stringify({ role: "user", email: normalizedEmail, name: "Anna Mueller", user: "anna" })
      );
      router.push("/dashboard/anna");
      return;
    }

    setError("Identifiants incorrects. Utilisez les comptes admin ou client Fundora.");
  };

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

          <div className="auth-credentials-box">
            <strong>Compte admin</strong>
            <span>{adminCredentials.email}</span>
            <small>{adminCredentials.password}</small>
          </div>
        </div>

        <div className="auth-panel auth-form-panel">
          <div className="brand" aria-label="Fundora brand">
            <BrandGlyph />
            <span className="brand-word">Fundora</span>
          </div>

          <div className="auth-form-header">
            <span className="eyebrow">Connexion</span>
            <h1>Accédez à votre espace.</h1>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@fundora.com"
                required
              />
            </label>

            <label className="field">
              <span>Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••"
                required
              />
            </label>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" defaultChecked />
                <span>Se souvenir de moi</span>
              </label>
              <a href="#">Mot de passe oublié ?</a>
            </div>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" className="primary-button login-button">
              Se connecter
            </button>
          </form>

          <div className="auth-meta">
            <span>Compte client</span>
            <strong>{userCredentials.email}</strong>
          </div>

          <div className="auth-meta">
            <span>Pas encore inscrit ?</span>
            <Link href="/">Retour à l’accueil</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
