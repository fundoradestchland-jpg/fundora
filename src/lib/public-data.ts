import { database } from "@/lib/db";
import type { DonationCategory } from "@/lib/donation-categories";

export type ApplicationKind = "donation" | "loan";
export type ApplicationStatus = "pending" | "approved" | "rejected";

export type PlatformStats = {
  applications: number;
  approved: number;
  pending: number;
  donations: number;
  loans: number;
  approvedAmount: number;
  applicants: number;
};

export type PublicApplication = {
  id: string;
  kind: ApplicationKind;
  subject: string;
  city: string;
  country: string;
  amountRequested: number;
  amountApproved: number | null;
  status: ApplicationStatus;
  createdAt: string;
};

export type AdminDonationRow = PublicApplication & {
  details: string;
  applicantName: string;
  email: string;
};

export type PublicDonationCampaign = {
  id: string;
  title: string;
  categories: DonationCategory[];
  targetAmount: number;
  description: string;
  imageFileName: string;
  imageDataUrl: string;
  createdAt: string;
};

function parseStats(row: Record<string, unknown> | undefined): PlatformStats {
  return {
    applications: Number(row?.applications ?? 0),
    approved: Number(row?.approved ?? 0),
    pending: Number(row?.pending ?? 0),
    donations: Number(row?.donations ?? 0),
    loans: Number(row?.loans ?? 0),
    approvedAmount: Number(row?.approved_amount ?? 0),
    applicants: Number(row?.applicants ?? 0),
  };
}

function mapPublicRow(row: Record<string, unknown>): PublicApplication {
  return {
    id: String(row.id),
    kind: row.kind === "donation" ? "donation" : "loan",
    subject: String(row.subject ?? ""),
    city: String(row.city ?? ""),
    country: String(row.country ?? ""),
    amountRequested: Number(row.amount_requested ?? 0),
    amountApproved: row.amount_approved == null ? null : Number(row.amount_approved),
    status: row.status === "approved" ? "approved" : row.status === "rejected" ? "rejected" : "pending",
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  try {
    const result = await database.query(`
      SELECT
        COUNT(*)::int AS applications,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE kind = 'donation')::int AS donations,
        COUNT(*) FILTER (WHERE kind = 'loan')::int AS loans,
        COALESCE(SUM(amount_approved) FILTER (WHERE status = 'approved'), 0)::float AS approved_amount,
        (SELECT COUNT(*)::int FROM fundora_users WHERE role = 'applicant') AS applicants
      FROM fundora_applications
    `);
    return parseStats(result.rows[0]);
  } catch {
    return null;
  }
}

export async function getPublicDonationTotals(): Promise<{
  attributedAmount: number;
  attributedRequests: number;
} | null> {
  try {
    const result = await database.query(`
      SELECT
        COALESCE(SUM(amount_approved), 0)::float AS attributed_amount,
        COUNT(*)::int AS attributed_requests
      FROM fundora_applications
      WHERE kind = 'donation' AND status = 'approved'
    `);
    return {
      attributedAmount: Number(result.rows[0]?.attributed_amount ?? 0),
      attributedRequests: Number(result.rows[0]?.attributed_requests ?? 0),
    };
  } catch (error) {
    console.error("Failed to load public donation totals:", error);
    return null;
  }
}

export async function listPublicApplications(kind: ApplicationKind, status?: ApplicationStatus | "all") {
  try {
    const filters = ["kind = $1"];
    const values: unknown[] = [kind];
    if (status && status !== "all") {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }
    const result = await database.query(
      `SELECT id, kind, subject, city, country, amount_requested, amount_approved, status, created_at
       FROM fundora_applications
       WHERE ${filters.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT 60`,
      values
    );
    return result.rows.map(mapPublicRow);
  } catch {
    return [] as PublicApplication[];
  }
}

export async function listPublicDonationCampaigns(category?: DonationCategory) {
  try {
    const result = await database.query(
      `SELECT id, title, categories, target_amount, description, image_file_name,
              image_content_type, image_data, created_at
       FROM fundora_donation_campaigns
       WHERE is_published = TRUE AND ($1::text IS NULL OR categories @> ARRAY[$1]::text[])
       ORDER BY created_at DESC
       LIMIT 100`,
      [category ?? null]
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      categories: row.categories as DonationCategory[],
      targetAmount: Number(row.target_amount),
      description: String(row.description),
      imageFileName: String(row.image_file_name),
      imageDataUrl: `data:${String(row.image_content_type)};base64,${(row.image_data as Buffer).toString("base64")}`,
      createdAt: new Date(String(row.created_at)).toISOString(),
    })) satisfies PublicDonationCampaign[];
  } catch (error) {
    console.error("Public donation campaigns query failed", (error as NodeJS.ErrnoException).code ?? "query_error");
    throw new Error("Les campagnes de dons sont temporairement indisponibles.");
  }
}

export async function listAdminDonations(): Promise<AdminDonationRow[]> {
  try {
    const result = await database.query(
      `SELECT id, kind, subject, details, city, country, amount_requested, amount_approved, status, created_at, applicant_name, email
       FROM fundora_applications
       WHERE kind = 'donation'
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return result.rows.map((row) => ({
      ...mapPublicRow(row),
      details: String(row.details ?? ""),
      applicantName: String(row.applicant_name ?? ""),
      email: String(row.email ?? ""),
    }));
  } catch {
    return [];
  }
}

export function publicStatusLabel(status: ApplicationStatus, kind: ApplicationKind) {
  if (status === "approved") return kind === "donation" ? "Attribué" : "Validé";
  if (status === "rejected") return "Refusé";
  return "En examen";
}

export function publicStatusClass(status: ApplicationStatus) {
  if (status === "approved") return "available";
  if (status === "rejected") return "resolved";
  return "pending";
}

export function listingVisual(index: number) {
  return ["visual-education", "visual-health", "visual-family"][index % 3];
}
