import Link from "next/link";
import Image from "next/image";
import {
  donationCategories,
  donationCategoryLabel,
  type DonationCategory,
} from "@/lib/donation-categories";
import type { PublicDonationCampaign } from "@/lib/public-data";

const descriptionPreviewLength = 180;

function getDescriptionPreview(description: string) {
  const preview = description.slice(0, descriptionPreviewLength);
  const lastSpace = preview.lastIndexOf(" ");
  return `${preview.slice(0, lastSpace > 0 ? lastSpace : descriptionPreviewLength).trimEnd()}…`;
}

export function DonationCampaignListings({
  campaigns,
  selectedCategory,
}: {
  campaigns: PublicDonationCampaign[];
  selectedCategory?: DonationCategory;
}) {
  return (
    <section className="published-campaigns" aria-labelledby="published-campaigns-title">
      <div className="published-campaigns-heading">
        <div>
          <span className="eyebrow">Campagnes de l’administration</span>
          <h2 id="published-campaigns-title">Trouvez le domaine qui vous correspond</h2>
        </div>
        <Link href="/dons/demande" className="secondary-button small">Faire une demande</Link>
      </div>
      <nav className="campaign-category-filters" aria-label="Filtrer les campagnes par catégorie">
        <Link href="/dons" className={!selectedCategory ? "active" : ""}>Tous les domaines</Link>
        {donationCategories.map((category) => (
          <Link
            key={category.value}
            href={`/dons?categorie=${category.value}`}
            className={selectedCategory === category.value ? "active" : ""}
          >
            {category.label}
          </Link>
        ))}
      </nav>
      {campaigns.length === 0 ? (
        <p className="campaigns-empty">Aucune campagne publiée dans ce domaine pour le moment.</p>
      ) : (
        <div className="donation-grid">
          {campaigns.map((campaign) => (
            <article className="donation-card published-campaign-card" key={campaign.id}>
              <Image className="donation-visual campaign-photo" src={campaign.imageDataUrl} alt={campaign.title} width={900} height={450} unoptimized />
              <div className="campaign-category-badges">
                {campaign.categories.map((category) => (
                  <span key={category}>{donationCategoryLabel(category)}</span>
                ))}
              </div>
              <h3>{campaign.title}</h3>
              <div className="meta-row">
                <div className="meta-box">
                  <span>Montant de la campagne</span>
                  <strong>{campaign.targetAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>
                </div>
              </div>
              {campaign.description.length > descriptionPreviewLength ? (
                <details className="campaign-description">
                  <summary>
                    <span className="campaign-description-preview">{getDescriptionPreview(campaign.description)}</span>
                    <span className="campaign-description-more">Voir plus</span>
                    <span className="campaign-description-less">Voir moins</span>
                  </summary>
                  <p>{campaign.description}</p>
                </details>
              ) : (
                <p>{campaign.description}</p>
              )}
              <div className="donation-footer">
                <span className="status-badge available">Ouverte aux demandes</span>
                <Link
                  href={`/dons/demande?categorie=${campaign.categories[0]}`}
                  className="primary-button small"
                >
                  Choisir ce domaine
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
