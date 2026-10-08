import { DonationRequestForm } from "@/components/donation-request-form";
import { donationCategories } from "@/lib/donation-categories";

export default async function DonationRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { categorie } = await searchParams;
  const initialCategory = donationCategories.find((category) => category.value === categorie)?.value;
  return <DonationRequestForm initialCategory={initialCategory} />;
}
