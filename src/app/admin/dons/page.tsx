"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { getAdminSessionSnapshot, getServerAdminSessionSnapshot, subscribeToAdminSession } from "@/lib/admin-session";

const donationList = [
  {
    title: "Aide pour l’éducation des enfants",
    status: "Disponible",
    amount: "€ 6.500",
    applicants: 8,
  },
  {
    title: "Soins de santé pour familles vulnérables",
    status: "En cours",
    amount: "€ 9.000",
    applicants: 14,
  },
  {
    title: "Aide à la mobilité et au logement",
    status: "Résolu",
    amount: "€ 12.000",
    applicants: 18,
  },
];

export default function AdminDonationsPage() {
  const router = useRouter();
  const authorized = useSyncExternalStore(subscribeToAdminSession, getAdminSessionSnapshot, getServerAdminSessionSnapshot);

  useEffect(() => {
    if (authorized === false) {
      router.replace("/login?access=admin");
    }
  }, [authorized, router]);

  const handleLogout = () => {
    localStorage.removeItem("fundora_session");
    router.push("/login");
  };

  if (authorized !== true) {
    return (
      <main className="page-shell auth-page">
        <section className="auth-shell">
          <div className="auth-panel auth-form-panel" style={{ width: "100%", maxWidth: 560 }}>
            <div className="auth-form-header">
              <span className="eyebrow">Accès refusé</span>
              <h1>Cette page est réservée à l’administration.</h1>
            </div>

            <p style={{ marginTop: 12, marginBottom: 24, color: "#475569" }}>
              Connectez-vous avec les identifiants admin pour accéder au tableau de bord des dons.
            </p>

            <Link href="/login" className="primary-button login-button">
              Revenir à la connexion
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell admin-donation-page">
      <nav className="topbar" aria-label="Navigation admin">
        <div className="brand" aria-label="Fundora brand">
          <BrandGlyph />
          <span className="brand-word">Fundora</span>
        </div>

        <div className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/dons">Dons</Link>
          <Link href="/admin/dossiers">Demandes don / prêt</Link>
        </div>

        <button type="button" className="nav-button" onClick={handleLogout}>
          Déconnexion
        </button>
      </nav>

      <section className="admin-donation-shell">
        <span className="eyebrow">Administration</span>
        <h1 style={{ marginTop: 12, marginBottom: 10, fontSize: "clamp(2.2rem, 4vw, 4rem)", letterSpacing: "-0.06em" }}>
          Gérer les dons disponibles et résolus
        </h1>

        <div className="admin-layout">
          <div className="admin-form">
            <div className="section-title-row">
              <h2>Publier un don</h2>
              <span>Nouvelle campagne</span>
            </div>

            <label className="field">
              <span>Titre du don</span>
              <input type="text" value="Aide pour l’éducation des enfants" readOnly />
            </label>

            <label className="field">
              <span>Catégorie</span>
              <select defaultValue="education">
                <option value="education">Éducation</option>
                <option value="health">Santé</option>
                <option value="housing">Logement</option>
              </select>
            </label>

            <label className="field">
              <span>Montant total</span>
              <input type="text" value="€ 6.500" readOnly />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea readOnly>
                Soutenir les frais scolaires et le suivi éducatif de jeunes enfants dans des familles en difficulté.
              </textarea>
            </label>

            <button className="primary-button">Publier le don</button>
          </div>

          <aside className="admin-panel">
            <div className="section-title-row">
              <h2>Vue d’ensemble</h2>
              <span>État</span>
            </div>

            <div className="admin-summary-list">
              {donationList.map((donation) => (
                <div key={donation.title} className="admin-summary-item">
                  <div>
                    <strong>{donation.amount}</strong>
                    <small>{donation.title}</small>
                  </div>
                  <span className={`status-badge ${
                    donation.status === "Disponible"
                      ? "available"
                      : donation.status === "Résolu"
                        ? "resolved"
                        : "pending"
                  }`}>{donation.status}</span>
                </div>
              ))}
            </div>

            <div className="donation-request-box">
              <h4>Demande reçue</h4>
              <p>
                Une famille a demandé ce don pour financer les frais de scolarité de 3 enfants.
                Fundora évalue le besoin, vérifie les conditions et décide du montant exact à attribuer.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
