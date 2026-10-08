import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandGlyph } from "@/components/fundora-brand";
import { LogoutButton } from "@/components/logout-button";
import { VirtualCardManager } from "@/components/virtual-card-manager";
import { WithdrawalDetailsManager } from "@/components/withdrawal-details-manager";
import { KycVerificationCard } from "@/components/kyc-verification-card";
import { SupportChat } from "@/components/support-chat";
import { getSession } from "@/lib/server-auth";

export default async function DashboardSettingsPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "applicant") redirect("/admin/dossiers");
  if (session.user !== user.toLowerCase()) redirect(`/dashboard/${session.user}`);

  return (
    <main className="page-shell dashboard-page">
      <SupportChat />
      <nav className="topbar" aria-label="Navigation du dashboard">
        <div className="brand" aria-label="Fundora brand">
          <BrandGlyph />
        </div>

        <div className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href={`/dashboard/${user}`}>Dashboard</Link>
          <Link href={`/dashboard/${user}/settings`} aria-current="page">Paramètres</Link>
        </div>

        <LogoutButton />
      </nav>

      <section className="feature-section dashboard-section">
        <div className="dashboard-shell">
          <aside className="dashboard-sidebar">
            <div className="sidebar-brand">
              <BrandGlyph />
            </div>

            <nav className="sidebar-nav" aria-label="Navigation du compte">
              <Link href={`/dashboard/${user}`}>Retour au dashboard</Link>
              <Link href={`/dashboard/${user}/settings`}>Paramètres</Link>
            </nav>

            <KycVerificationCard />
          </aside>

          <div className="dashboard-main">
            <header className="dashboard-topbar">
              <div>
                <span className="eyebrow">Mon compte</span>
                <h2>Paramètres du compte</h2>
              </div>
            </header>

            <VirtualCardManager accountName={session.name} dashboardHref={`/dashboard/${session.user}`} settingsOnly />
            <WithdrawalDetailsManager />
          </div>
        </div>
      </section>
    </main>
  );
}
