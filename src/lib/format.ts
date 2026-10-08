export const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEuro(value: number) {
  return euro.format(Number.isFinite(value) ? value : 0);
}

export function userSlug(email: string, id: string) {
  const fromEmail = email.split("@")[0].replace(/[^a-z0-9_-]/gi, "-").toLowerCase().slice(0, 60);
  return fromEmail || id.slice(0, 8);
}

export function isSafeNextPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"));
}
