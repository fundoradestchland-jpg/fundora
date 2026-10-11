export function formatDollars(value: number, minimumFractionDigits = 0, maximumFractionDigits = 0) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
  return `${formatted} $`;
}

export function userSlug(email: string, id: string) {
  const fromEmail = email.split("@")[0].replace(/[^a-z0-9_-]/gi, "-").toLowerCase().slice(0, 60);
  return fromEmail || id.slice(0, 8);
}

export function isSafeNextPath(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"));
}
