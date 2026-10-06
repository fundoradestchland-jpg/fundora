import Link from "next/link";
import { BrandGlyph } from "@/components/fundora-brand";

const users = [
  {
    slug: "anna",
    name: "Anna Müller",
    role: "Client prioritaire",
    balance: "€ 12.840",
    status: "Compte actif",
  },
  {
    slug: "yann",
    name: "Yann Martin",
    role: "Demande de prêt",
    balance: "€ 8.420",
    status: "Vérification KYC",
  },
  {
    slug: "sarah",
    name: "Sarah Dupont",
    role: "Donateur",
    balance: "€ 4.960",
    status: "Aide active",
  },
];

export default function DashboardOverviewPage() {
  return (
    <main className="page-shell dashboard-page">
      <nav className="topbar" aria-label="Navigation principale">
        <div className="brand" aria-label="Fundora brand">
          <BrandGlyph />
          <span className="brand-word">Fundora</span>
        </div>

        <div className="nav-links">
          <a href="/">Accueil</a>
          <a href="/dashboard">Utilisateurs</a>
          <a href="/login">Connexion</a>
        </div>

        <Link href="/login" className="nav-button">
          Ouvrir le compte
        </Link>
      </nav>

      <section className="dashboard-overview">
        <div className="section-heading">
          <span className="eyebrow">Espace utilisateur</span>
          <h2>Choisissez un compte pour accéder au tableau de bord.</h2>
        </div>

        <div className="dashboard-user-grid">
          {users.map((user) => (
            <Link key={user.slug} href={`/dashboard/${user.slug}`} className="user-card">
              <span className="user-label">{user.role}</span>
              <strong>{user.name}</strong>
              <p>{user.balance}</p>
              <small>{user.status}</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
