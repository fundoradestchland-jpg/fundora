export const donationCategories = [
  { value: "education", label: "Educación" },
  { value: "health", label: "Salud" },
  { value: "housing", label: "Vivienda" },
  { value: "food", label: "Alimentación" },
  { value: "family-emergency", label: "Emergencia familiar" },
  { value: "mobility", label: "Movilidad" },
  { value: "business", label: "Emprendimiento" },
  { value: "other", label: "Otros" },
] as const;

export type DonationCategory = (typeof donationCategories)[number]["value"];

export function donationCategoryLabel(value: string) {
  return donationCategories.find((category) => category.value === value)?.label ?? value;
}
