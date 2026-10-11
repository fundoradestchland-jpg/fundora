import { DonationRequestForm } from "@/components/donation-request-form";
import { donationCategories } from "@/lib/donation-categories";
import { listPublicDonationCampaigns } from "@/lib/public-data";

export default async function DonationRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { categorie } = await searchParams;
  const initialCategory = donationCategories.find((category) => category.value === categorie)?.value;
  const campaigns = initialCategory ? await listPublicDonationCampaigns(initialCategory) : [];
  const campaignAmount = initialCategory
    ? campaigns.find((campaign) => campaign.categories.includes(initialCategory))?.targetAmount
    : undefined;

  return <DonationRequestForm initialCategory={initialCategory} initialAmount={campaignAmount} />;
}
