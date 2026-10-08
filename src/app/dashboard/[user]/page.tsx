import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandGlyph } from "@/components/fundora-brand";
import { RequestWorkflowPanel } from "@/components/request-workflow-panel";
import { LogoutButton } from "@/components/logout-button";
import { DashboardInsights } from "@/components/dashboard-insights";
import { KycVerificationCard } from "@/components/kyc-verification-card";
import { AssignedTasksNotice } from "@/components/assigned-tasks-notice";
import { VirtualCardManager } from "@/components/virtual-card-manager";
import { SupportChat } from "@/components/support-chat";
import { getSession } from "@/lib/server-auth";

export default async function DashboardUserPage({
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
        </div>

        <LogoutButton />
      </nav>

      <section className="feature-section dashboard-section">
        <div className="dashboard-shell">
          <aside className="dashboard-sidebar">
            <div className="sidebar-brand">
              <BrandGlyph />
            </div>

            <nav className="sidebar-nav" aria-label="Navigation du dashboard">
              <Link href="/">Accueil</Link>
              <Link href="#demandes">Demandes</Link>
              <Link href="/dons">Dons</Link>
              <Link href="#transactions">Transactions</Link>
              <Link href={`/dashboard/${user}/settings`}>Paramètres</Link>
            </nav>

            <KycVerificationCard />
          </aside>

          <div className="dashboard-main">
            <header className="dashboard-topbar">
              <div>
                <span className="eyebrow">Mon compte</span>
                <h2>Bonjour {session.name.split(" ")[0]}</h2>
              </div>
            </header>

            <AssignedTasksNotice />
            <VirtualCardManager accountName={session.name} dashboardHref={`/dashboard/${session.user}`} />
            <DashboardInsights />
            <RequestWorkflowPanel />
          </div>
        </div>
      </section>
    </main>
  );
}
