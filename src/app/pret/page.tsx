import Link from "next/link";
import { BrandGlyph } from "@/components/fundora-brand";

const loanOffers = [
  {
    title: "Prêt personnel rapide",
    amount: "€ 5.000",
    term: "24 mois",
    rate: "4,9 %",
    status: "Disponible",
    type: "available",
    description: "Pour couvrir un besoin immédiat, un projet familial ou un remplacement de budget mensuel.",
    progress: 38,
  },
  {
    title: "Prêt pour projet professionnel",
    amount: "€ 12.000",
    term: "36 mois",
    rate: "5,4 %",
    status: "En validation",
    type: "pending",
    description: "Pour financer l’achat de matériel, des investissements, ou la reprise d’activité.",
    progress: 62,
  },
  {
    title: "Prêt social et d’urgence",
    amount: "€ 3.200",
    term: "18 mois",
    rate: "3,8 %",
    status: "Résolu",
    type: "resolved",
    description: "Pour les situations de besoin urgent avec accompagnement social et vérification renforcée.",
    progress: 100,
  },
];

export default function LoanPage() {
  return (
    <main className="page-shell loan-page">
      <nav className="topbar" aria-label="Navigation principale">
        <div className="brand" aria-label="Fundora brand">
          <BrandGlyph />
          <span className="brand-word">Fundora</span>
        </div>

        <div className="nav-links">
          <a href="/">Accueil</a>
          <a href="/pret">Prêt</a>
          <a href="/dons">Dons</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/login">Connexion</a>
        </div>

        <Link href="/pret/demande" className="nav-button">
          Demander un prêt
        </Link>
      </nav>

      <section className="donation-hero">
        <span className="eyebrow">Prêts disponibles</span>
        <h1>Un financement clair pour chaque besoin.</h1>
        <p>
          Fundora évalue votre dossier, vérifie les justificatifs, puis determine le montant et le
          plan de remboursement adapté à votre situation. Vous pourrez suivre chaque étape dans votre
          dashboard.
        </p>

        <div className="donation-filters">
          <span className="filter-pill active">Prêts ouverts</span>
          <span className="filter-pill">En validation</span>
          <span className="filter-pill">Prêts résolus</span>
        </div>
      </section>

      <section className="donation-grid">
        {loanOffers.map((loan) => (
          <article key={loan.title} className="donation-card">
            <div className="donation-visual visual-education" aria-label={loan.title} />

            <span className="eyebrow">Financement</span>
            <h3>{loan.title}</h3>

            <div className="meta-row">
              <div className="meta-box">
                <span>Montant</span>
                <strong>{loan.amount}</strong>
              </div>
              <div className="meta-box">
                <span>Durée</span>
                <strong>{loan.term}</strong>
              </div>
            </div>

            <div className="meta-row">
              <div className="meta-box">
                <span>Taux</span>
                <strong>{loan.rate}</strong>
              </div>
              <div className="meta-box">
                <span>Statut</span>
                <strong>{loan.status}</strong>
              </div>
            </div>

            <p>{loan.description}</p>

            <div className="donation-progress">
              <div className="progress-track" aria-label="Progression du prêt">
                <span className="progress-fill" style={{ width: `${loan.progress}%` }} />
              </div>
            </div>

            <div className="donation-footer">
              <span className={`status-badge ${loan.type}`}>{loan.status}</span>
              <Link href="/pret/demande" className="primary-button small">
                Faire une demande
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
