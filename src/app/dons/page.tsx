import Link from "next/link";
import { BrandGlyph } from "@/components/fundora-brand";

const donations = [
  {
    title: "Aide pour l’éducation des enfants",
    category: "Éducation",
    goal: "€ 6.500",
    raised: "€ 4.300",
    beneficiaries: "42 familles",
    status: "Disponible",
    type: "available",
    description:
      "Un programme pour financer les frais scolaires, les fournitures et le suivi scolaire de jeunes enfants dans des familles précaires.",
    progress: 66,
    image: "visual-education",
  },
  {
    title: "Soins de santé pour familles vulnérables",
    category: "Santé",
    goal: "€ 9.000",
    raised: "€ 8.100",
    beneficiaries: "31 personnes",
    status: "Presque terminé",
    type: "pending",
    description:
      "Des consultations, médicaments essentiels et accompagnement médical pour familles sans couverture sociale suffisante.",
    progress: 90,
    image: "visual-health",
  },
  {
    title: "Aide à la mobilité et au logement",
    category: "Logement",
    goal: "€ 12.000",
    raised: "€ 12.000",
    beneficiaries: "18 ménages",
    status: "Résolu",
    type: "resolved",
    description:
      "Ce don a déjà été entièrement attribué à plusieurs familles afin de soutenir leur déplacement, leur sécurité et leur logement.",
    progress: 100,
    image: "visual-family",
  },
];

export default function DonationsPage() {
  return (
    <main className="page-shell donation-page">
      <nav className="topbar" aria-label="Navigation principale">
        <div className="brand" aria-label="Fundora brand">
          <BrandGlyph />
          <span className="brand-word">Fundora</span>
        </div>

        <div className="nav-links">
          <a href="/">Accueil</a>
          <a href="/dons">Dons</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/login">Connexion</a>
        </div>

        <Link href="/admin/dons" className="nav-button">
          Admin
        </Link>
      </nav>

      <section className="donation-hero">
        <span className="eyebrow">Dons disponibles</span>
        <h1>Des besoins concrets, des aides concrètes.</h1>
        <p>
          Les dons publiés sur Fundora sont examinés par l’équipe avant d’être mis à disposition.
          Chaque demande est évaluée selon le besoin réel, le contexte du projet et le montant qui
          peut être attribué à la personne ou au foyer concerné.
        </p>

        <div className="donation-filters">
          <span className="filter-pill active">Disponibles</span>
          <span className="filter-pill">En cours</span>
          <span className="filter-pill">Résolus</span>
        </div>
      </section>

      <section className="donation-grid">
        {donations.map((donation) => (
          <article key={donation.title} className="donation-card">
            <div className={`donation-visual ${donation.image}`} aria-label={donation.title} />

            <span className="eyebrow">{donation.category}</span>
            <h3>{donation.title}</h3>

            <div className="meta-row">
              <div className="meta-box">
                <span>Cible</span>
                <strong>{donation.goal}</strong>
              </div>
              <div className="meta-box">
                <span>Collecté</span>
                <strong>{donation.raised}</strong>
              </div>
            </div>

            <div className="donation-progress">
              <div className="donation-stats">
                <strong>{donation.beneficiaries}</strong>
              </div>
              <div className="progress-track" aria-label="Progression du don">
                <span className="progress-fill" style={{ width: `${donation.progress}%` }} />
              </div>
            </div>

            <p>{donation.description}</p>

            <div className="donation-footer">
              <span className={`status-badge ${donation.type}`}>{donation.status}</span>
              <Link href="/dons/demande" className="primary-button small">
                Faire une demande
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
