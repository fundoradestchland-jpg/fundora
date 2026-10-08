import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { donationCategories } from "@/lib/donation-categories";
import { database } from "@/lib/db";
import { getSession } from "@/lib/server-auth";

export const runtime = "nodejs";

const maxImageBytes = 2_000_000;
const allowedCategories = new Set<string>(donationCategories.map((category) => category.value));

function serializeCampaign(row: Record<string, unknown>) {
  const imageData = row.image_data as Buffer;
  return {
    id: String(row.id),
    title: String(row.title),
    categories: row.categories as string[],
    targetAmount: Number(row.target_amount),
    description: String(row.description),
    imageFileName: String(row.image_file_name),
    imageDataUrl: `data:${String(row.image_content_type)};base64,${imageData.toString("base64")}`,
    isPublished: Boolean(row.is_published),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function GET() {
  const session = await getSession();

  try {
    const result = session?.role === "admin"
      ? await database.query("SELECT * FROM fundora_donation_campaigns ORDER BY created_at DESC LIMIT 100")
      : await database.query("SELECT * FROM fundora_donation_campaigns WHERE is_published = TRUE ORDER BY created_at DESC LIMIT 100");
    return NextResponse.json(result.rows.map(serializeCampaign));
  } catch (error) {
    console.error("Donation campaigns GET failed", (error as NodeJS.ErrnoException).code ?? "query_error");
    return NextResponse.json({ error: "Impossible de charger les campagnes de dons." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Accès administration requis." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const targetAmount = Number(body.targetAmount);
    const rawCategories: unknown[] = Array.isArray(body.categories) ? body.categories : [];
    const categories: string[] = [...new Set(
      rawCategories.filter((category): category is string => typeof category === "string")
    )];
    if (!title || title.length > 200) throw new Error("Le titre doit contenir entre 1 et 200 caractères.");
    if (!description || description.length > 5000) throw new Error("La description est obligatoire et limitée à 5 000 caractères.");
    if (!Number.isFinite(targetAmount) || targetAmount <= 0 || targetAmount > 999_999_999) {
      throw new Error("Saisissez un montant supérieur à zéro et valide.");
    }
    if (categories.length === 0 || categories.some((category) => !allowedCategories.has(category))) {
      throw new Error("Choisissez au moins une catégorie valide.");
    }
    if (typeof body.imageDataUrl !== "string") throw new Error("Ajoutez une photo à la publication.");
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.imageDataUrl);
    if (!match) throw new Error("La photo doit être au format JPG, PNG ou WebP.");
    const imageData = Buffer.from(match[2], "base64");
    if (!imageData.length || imageData.length > maxImageBytes) throw new Error("La photo ne doit pas dépasser 2 Mo.");
    const imageFileName = typeof body.imageFileName === "string" ? body.imageFileName.trim().slice(0, 255) : "";
    if (!imageFileName) throw new Error("Le nom du fichier photo est invalide.");

    const result = await database.query(
      `INSERT INTO fundora_donation_campaigns
        (id, title, categories, target_amount, description, image_file_name, image_content_type, image_data, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [randomUUID(), title, categories, targetAmount, description, imageFileName, match[1], imageData, session.userId]
    );
    return NextResponse.json(serializeCampaign(result.rows[0]), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publication impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
