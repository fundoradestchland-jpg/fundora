import Link from "next/link";
import { BrandGlyph } from "@/components/fundora-brand";
import { RequestWorkflowPanel } from "@/components/request-workflow-panel";

const userProfiles: Record<string, {
  name: string;
  role: string;
  balance: string;
  revenue: string;
  requests: string;
  donations: string;
  status: string;
}> = {
  anna: {
    name: "Anna Müller",
    role: "Client prioritaire",
    balance: "€ 12.840",
    revenue: "€ 4.820",
    requests: "12",
    donations: "€ 2.130",
    status: "Compte actif",
  },
  yann: {
    name: "Yann Martin",
    role: "Demande de prêt",
    balance: "€ 8.420",
    revenue: "€ 3.340",
    requests: "08",
    donations: "€ 1.110",
    status: "En cours de vérification",
  },
  sarah: {
    name: "Sarah Dupont",
    role: "Donateur",
    balance: "€ 4.960",
    revenue: "€ 2.740",
    requests: "05",
    donations: "€ 3.260",
    status: "Aide active",
  },
};

const recentRequests = [
  { title: "Prêt personnel", amount: "€ 2.400", status: "Approuvé" },
  { title: "Aide familiale", amount: "€ 1.100", status: "En cours" },
  { title: "Projet social", amount: "€ 820", status: "Validé" },
];

const donationStatusByUser: Record<string, {
  status: "Validé" | "En attente" | "Refusé";
  amount: string;
  reason: string;
  label: string;
}> = {
  anna: {
    status: "Validé",
    amount: "€ 1.250",
    reason: "Votre dossier a été vérifié et le montant a été approuvé par Fundora.",
    label: "Aide pour l’éducation",
  },
  yann: {
    status: "En attente",
    amount: "€ 0",
    reason: "Votre dossier est en cours de vérification documentaire et d’analyse de besoin.",
    label: "Aide au logement",
  },
  sarah: {
    status: "Refusé",
    amount: "€ 0",
    reason: "Le dossier a été refusé faute de pièces justificatives complètes.",
    label: "Soutien santé",
  },
};

const chartBars = [26, 42, 58, 64, 72, 88, 96];

export default async function DashboardUserPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;
  const profile = userProfiles[user.toLowerCase()] ?? userProfiles.anna;
  const donationStatus = donationStatusByUser[user.toLowerCase()] ?? donationStatusByUser.anna;

  return (
    <main className="page-shell dashboard-page">
      <nav className="topbar" aria-label="Navigation du dashboard">
        <div className="brand" aria-label="Fundora brand">
          <BrandGlyph />
          <span className="brand-word">Fundora</span>
        </div>

        <div className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/dashboard">Utilisateurs</Link>
          <Link href={`/dashboard/${user}`}>Compte</Link>
        </div>

        <Link href="/login" className="nav-button">
          Déconnexion
        </Link>
      </nav>

      <section className="feature-section dashboard-section">
        <div className="dashboard-shell">
          <aside className="dashboard-sidebar">
            <div className="sidebar-brand">
              <BrandGlyph />
              <span>Fundora</span>
            </div>

            <nav className="sidebar-nav" aria-label="Navigation du dashboard">
              <a className="active" href="#">Accueil</a>
              <a href="#">Demandes</a>
              <a href="#">Dons</a>
              <a href="#">Transactions</a>
              <a href="#">Paramètres</a>
            </nav>

            <div className="sidebar-card">
              <span>Protection</span>
              <strong>Vérification KYC</strong>
              <small>Complété à 96%</small>
            </div>
          </aside>

          <div className="dashboard-main">
            <header className="dashboard-topbar">
              <div>
                <span className="eyebrow">Mon compte</span>
                <h2>Bonjour {profile.name.split(" ")[0]}</h2>
              </div>
              <div className="topbar-actions">
                <button className="secondary-button small">Paramètres</button>
                <button className="primary-button small">Retirer</button>
              </div>
            </header>

            <div className="wallet-grid">
              <div className="main-wallet">
                <div className="balance-card">
                  <span>Solde disponible</span>
                  <strong>{profile.balance}</strong>
                  <div className="mini-actions">
                    <button className="primary-button small">Retirer</button>
                    <button className="secondary-button small">Historique</button>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Statistiques</h3>
                    <span>6 mois</span>
                  </div>
                  <div className="chart-bars" aria-label="Graphique de statistiques">
                    {chartBars.map((height, index) => (
                      <span key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <aside className="virtual-card">
                <div className="card-top-row">
                  <span>Carte virtuelle</span>
                  <span>Fundora</span>
                </div>
                <div className="card-chip" />
                <strong>•••• 2048</strong>
                <div className="card-meta">
                  <div>
                    <small>Solde</small>
                    <strong>{profile.balance}</strong>
                  </div>
                  <div>
                    <small>Statut</small>
                    <strong>{profile.status}</strong>
                  </div>
                </div>
              </aside>
            </div>

            <div className="dashboard-bottom">
              <div className="panel donation-status-panel">
                <div className="panel-header">
                  <h3>État de ma demande</h3>
                  <span>{donationStatus.label}</span>
                </div>

                <div className={`donation-status-card ${donationStatus.status.toLowerCase().replace(/\s+/g, "-")}`}>
                  <span className="status-pill-large">{donationStatus.status}</span>
                  <strong>{donationStatus.amount}</strong>
                  <p>{donationStatus.reason}</p>
                </div>
              </div>

              <RequestWorkflowPanel user={user} />

              <div className="panel">
                <div className="panel-header">
                  <h3>Demandes récentes</h3>
                  <span>3 éléments</span>
                </div>
                <ul className="request-list">
                  {recentRequests.map((request) => (
                    <li key={request.title}>
                      <div>
                        <strong>{request.title}</strong>
                        <span>{request.amount}</span>
                      </div>
                      <em>{request.status}</em>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Vue d’ensemble</h3>
                  <span>Compte</span>
                </div>
                <div className="stat-grid">
                  <div className="stat-box">
                    <span>Revenus</span>
                    <strong>{profile.revenue}</strong>
                  </div>
                  <div className="stat-box">
                    <span>Demandes</span>
                    <strong>{profile.requests}</strong>
                  </div>
                  <div className="stat-box">
                    <span>Dons</span>
                    <strong>{profile.donations}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
