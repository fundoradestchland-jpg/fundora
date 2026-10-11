import Link from "next/link";
import Image from "next/image";
import {
  donationCategories,
  donationCategoryLabel,
  type DonationCategory,
} from "@/lib/donation-categories";
import { formatDollars } from "@/lib/format";
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
  unavailable = false,
}: {
  campaigns: PublicDonationCampaign[];
  selectedCategory?: DonationCategory;
  unavailable?: boolean;
}) {
  return (
    <section className="published-campaigns" aria-labelledby="published-campaigns-title">
      <div className="published-campaigns-heading">
        <div>
          <span className="eyebrow">Campañas de la administración</span>
          <h2 id="published-campaigns-title">Encuentra el área que mejor se adapta a ti</h2>
        </div>
        <Link href="/dons/demande" className="secondary-button small">Enviar una solicitud</Link>
      </div>
      <nav className="campaign-category-filters" aria-label="Filtrar campañas por categoría">
        <Link href="/dons" className={!selectedCategory ? "active" : ""}>Todas las categorías</Link>
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
      {unavailable ? (
        <p className="campaigns-empty" role="status">Las campañas de donación no están disponibles temporalmente. Inténtalo de nuevo en unos momentos.</p>
      ) : campaigns.length === 0 ? (
        <p className="campaigns-empty">Todavía no hay campañas publicadas en esta categoría.</p>
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
                  <span>Meta de la campaña</span>
                  <strong>{formatDollars(campaign.targetAmount, 2, 2)}</strong>
                </div>
              </div>
              {campaign.description.length > descriptionPreviewLength ? (
                <details className="campaign-description">
                  <summary>
                    <span className="campaign-description-preview">{getDescriptionPreview(campaign.description)}</span>
                    <span className="campaign-description-more">Ver más</span>
                    <span className="campaign-description-less">Ver menos</span>
                  </summary>
                  <p>{campaign.description}</p>
                </details>
              ) : (
                <p>{campaign.description}</p>
              )}
              <div className="donation-footer">
                <span className="status-badge available">Se aceptan solicitudes</span>
                <Link
                  href={`/dons/demande?categorie=${campaign.categories[0]}`}
                  className="primary-button small"
                >
                  Elegir esta categoría
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
