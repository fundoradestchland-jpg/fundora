import { SiteNav } from "@/components/site-nav";
import { DonationCampaignListings } from "@/components/donation-campaign-listings";
import { StatusFilters, ApplicationListings } from "@/components/application-listings";
import {
  getPublicDonationTotals,
  listPublicDonationCampaigns,
  listPublicApplications,
  type ApplicationStatus,
} from "@/lib/public-data";
import { donationCategories, type DonationCategory } from "@/lib/donation-categories";
import { formatDollars } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; categorie?: string }>;
}) {
  const { statut, categorie } = await searchParams;
  const status = statut === "pending" || statut === "approved" || statut === "rejected" ? statut as ApplicationStatus : "all";
  const category = donationCategories.some((item) => item.value === categorie) ? categorie as DonationCategory : undefined;
  const [campaignsResult, applications, donationTotals] = await Promise.all([
    listPublicDonationCampaigns(category)
      .then((campaigns) => ({ campaigns, unavailable: false }))
      .catch(() => ({ campaigns: [], unavailable: true })),
    listPublicApplications("donation", status),
    getPublicDonationTotals(),
  ]);

  return (
    <main className="page-shell donation-page">
      <SiteNav current="dons" />
      <section className="donation-hero">
        <span className="eyebrow">Donaciones registradas</span>
        <h1>Las necesidades realmente presentadas, seguidas expediente por expediente.</h1>
        <p>
          Las tarjetas de abajo provienen de PostgreSQL. El nombre y el correo del solicitante
          permanecen privados; solo el asunto, el lugar, los importes y el estado son públicos.
        </p>
        <StatusFilters kindPath="/dons" current={status} />
      </section>
      <DonationCampaignListings campaigns={campaignsResult.campaigns} selectedCategory={category} unavailable={campaignsResult.unavailable} />
      <section className="published-campaigns-heading applicant-donation-heading">
        <div>
          <span className="eyebrow">Solicitudes de usuarios</span>
          <h2>Seguimiento de las solicitudes de donación</h2>
        </div>
      </section>
      <section className="donation-allocation-summary" aria-label="Total de donaciones asignadas">
        <div>
          <span className="eyebrow">Total asignado</span>
          <strong>
            {donationTotals ? formatDollars(donationTotals.attributedAmount) : "No disponible"}
          </strong>
        </div>
        <p>{donationTotals
          ? `Acumulado de montos aprobados para ${donationTotals.attributedRequests} solicitud${donationTotals.attributedRequests === 1 ? "" : "es"} de donación.`
          : "El total de montos asignados está temporalmente no disponible."}</p>
      </section>
      <ApplicationListings
        applications={applications}
        kind="donation"
        emptyTitle="No hay donaciones en esta vista"
        emptyText="Crea una cuenta de solicitante y envía una solicitud: aparecerá aquí al registrarse."
        actionHref="/dons/demande"
        actionLabel="Presentar una solicitud"
      />
    </main>
  );
}
