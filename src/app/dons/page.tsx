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
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; categorie?: string }>;
}) {
  const { statut, categorie } = await searchParams;
  const status = statut === "pending" || statut === "approved" || statut === "rejected" ? statut as ApplicationStatus : "all";
  const category = donationCategories.some((item) => item.value === categorie) ? categorie as DonationCategory : undefined;
  const [campaigns, applications, donationTotals] = await Promise.all([
    listPublicDonationCampaigns(category),
    listPublicApplications("donation", status),
    getPublicDonationTotals(),
  ]);

  return (
    <main className="page-shell donation-page">
      <SiteNav current="dons" />
      <section className="donation-hero">
        <span className="eyebrow">Dons enregistrés</span>
        <h1>Les besoins réellement déposés, suivis dossier par dossier.</h1>
        <p>
          Les cartes ci-dessous viennent de PostgreSQL. Le nom et l’e-mail du demandeur restent
          privés ; seuls l’objet, le lieu, les montants et le statut sont publics.
        </p>
        <StatusFilters kindPath="/dons" current={status} />
      </section>
      <DonationCampaignListings campaigns={campaigns} selectedCategory={category} />
      <section className="published-campaigns-heading applicant-donation-heading">
        <div>
          <span className="eyebrow">Demandes des utilisateurs</span>
          <h2>Suivi des demandes de dons</h2>
        </div>
      </section>
      <section className="donation-allocation-summary" aria-label="Total des dons attribués">
        <div>
          <span className="eyebrow">Total attribué</span>
          <strong>
            {donationTotals ? formatEuro(donationTotals.attributedAmount) : "Indisponible"}
          </strong>
        </div>
        <p>{donationTotals
          ? `Cumul des montants approuvés pour ${donationTotals.attributedRequests} demande${donationTotals.attributedRequests === 1 ? "" : "s"} de don.`
          : "Le total des montants attribués est momentanément indisponible."}</p>
      </section>
      <ApplicationListings
        applications={applications}
        kind="donation"
        emptyTitle="Aucun don dans cette vue"
        emptyText="Créez un compte demandeur et envoyez une demande : elle s’affichera ici dès son enregistrement."
        actionHref="/dons/demande"
        actionLabel="Déposer une demande"
      />
    </main>
  );
}
