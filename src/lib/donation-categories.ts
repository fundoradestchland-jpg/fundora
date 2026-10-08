export const donationCategories = [
  { value: "education", label: "Éducation" },
  { value: "health", label: "Santé" },
  { value: "housing", label: "Logement" },
  { value: "food", label: "Alimentation" },
  { value: "family-emergency", label: "Urgence familiale" },
  { value: "mobility", label: "Mobilité" },
  { value: "business", label: "Création d’activité" },
  { value: "other", label: "Autre" },
] as const;

export type DonationCategory = (typeof donationCategories)[number]["value"];

export function donationCategoryLabel(value: string) {
  return donationCategories.find((category) => category.value === value)?.label ?? value;
}
