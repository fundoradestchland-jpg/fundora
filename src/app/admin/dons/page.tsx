"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrandGlyph } from "@/components/fundora-brand";
import { SupportChat } from "@/components/support-chat";
import { donationCategories, donationCategoryLabel } from "@/lib/donation-categories";
import { formatDollars } from "@/lib/format";

type DonationCampaign = {
  id: string;
  title: string;
  categories: string[];
  targetAmount: number;
  description: string;
  imageFileName: string;
  imageDataUrl: string;
  isPublished: boolean;
  createdAt: string;
};

export default function AdminDonationsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [title, setTitle] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/donation-campaigns", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Impossible de charger les publications.");
      setCampaigns(result as DonationCampaign[]);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les publications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Session expirée.")))
      .then((result) => {
        if (!active) return;
        if (result.user?.role !== "admin") router.replace("/login?access=admin");
        else {
          setAuthorized(true);
          void loadCampaigns();
        }
      })
      .catch(() => {
        if (active) router.replace("/login?access=admin");
      });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("fundora_session");
    window.dispatchEvent(new Event("fundora-session-updated"));
    router.push("/login");
  };

  const toggleCategory = (category: string) => {
    setCategories((current) => current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]);
  };

  const handleImageChange = (file: File | null) => {
    setImage(file);
    setImagePreview("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choisissez une image JPG, PNG ou WebP.");
      setImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    if (file.size > 2_000_000) {
      setError("La photo ne doit pas dépasser 2 Mo.");
      setImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    setError("");
    setImagePreview(URL.createObjectURL(file));
  };

  const publishCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (publishing) return;
    if (categories.length === 0) {
      setError("Choisissez au moins une catégorie.");
      return;
    }
    if (!image) {
      setError("Ajoutez une photo à la publication.");
      return;
    }

    setPublishing(true);
    setError("");
    setMessage("");
    try {
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Lecture de la photo impossible."));
        reader.readAsDataURL(image);
      });
      const response = await fetch("/api/donation-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          categories,
          targetAmount: amount,
          description,
          imageFileName: image.name,
          imageDataUrl,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Publication impossible.");
      setCampaigns((current) => [result as DonationCampaign, ...current]);
      setTitle("");
      setCategories([]);
      setAmount("");
      setDescription("");
      setImage(null);
      setImagePreview("");
      if (imageInputRef.current) imageInputRef.current.value = "";
      setMessage("La campagne de don est publiée et visible sur la page des dons.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Publication impossible.");
    } finally {
      setPublishing(false);
    }
  };

  if (authorized !== true) {
    return (
      <main className="page-shell auth-page">
        <section className="auth-shell">
          <div className="auth-panel auth-form-panel">
            <div className="auth-form-header">
              <span className="eyebrow">Espacio seguro</span>
              <h1>Verificando acceso de administrador…</h1>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell admin-donation-page">
      <SupportChat isAdmin />
      <nav className="topbar" aria-label="Navegación admin">
        <div className="brand" aria-label="Fundación Amira Aldahab brand">
          <BrandGlyph />
        </div>
        <div className="nav-links">
          <Link href="/">Inicio</Link>
          <Link href="/dons">Donaciones públicas</Link>
          <Link href="/admin/dossiers">Solicitudes de don / préstamo</Link>
          <Link href="/admin/finances">Saldos y retiros</Link>
        </div>
        <button type="button" className="nav-button" onClick={handleLogout}>Cerrar sesión</button>
      </nav>

      <section className="admin-donation-shell">
        <span className="eyebrow">Administración · Publicaciones</span>
        <h1 className="admin-donation-title">Publicar una campaña de donación</h1>
        <p className="admin-donation-intro">Selecciona los ámbitos implicados. Los solicitantes podrán explorar las campañas por categoría en la página de donaciones.</p>

        <div className="admin-layout">
          <form className="admin-form" onSubmit={publishCampaign}>
            <div className="section-title-row">
              <h2>Nueva campaña</h2>
              <span>Publicación pública</span>
            </div>

            <label className="field">
              <span>Título de la publicación</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required placeholder="Ej. Apoyo a los gastos de escolaridad" />
            </label>

            <fieldset className="campaign-category-field">
              <legend>Categorías implicadas (se pueden elegir varias)</legend>
              <div className="campaign-category-options">
                {donationCategories.map((category) => (
                  <label key={category.value} className="campaign-category-option">
                    <input
                      type="checkbox"
                      checked={categories.includes(category.value)}
                      onChange={() => toggleCategory(category.value)}
                    />
                    <span>{category.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="field">
              <span>Monto de la campaña ($)</span>
              <input type="number" min="0.01" max="999999999" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="Ej. 2500" />
            </label>

            <label className="field">
              <span>Descripción</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} required placeholder="Explica el objetivo de esta campaña de donación." />
            </label>

            <label className="field">
              <span>Foto de la publicación (JPG, PNG o WebP · 2 MB máximo)</span>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)}
              />
            </label>
            {imagePreview && <Image className="campaign-image-preview" src={imagePreview} alt="Vista previa de la foto a publicar" width={1200} height={500} unoptimized />}

            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="workflow-upload-feedback" role="status">{message}</p>}
            <button className="primary-button" type="submit" disabled={publishing}>
              {publishing ? "Publicando…" : "Publicar la campaña"}
            </button>
          </form>

          <aside className="admin-panel">
            <div className="section-title-row">
              <h2>Campañas publicadas</h2>
              <span>{campaigns.filter((campaign) => campaign.isPublished).length} en línea</span>
            </div>
            {loading ? <p>Cargando publicaciones…</p> : campaigns.length === 0 ? (
              <p>No hay campañas publicadas por el momento.</p>
            ) : (
              <div className="admin-campaign-list">
                {campaigns.map((campaign) => (
                  <article className="admin-campaign-item" key={campaign.id}>
                    <Image src={campaign.imageDataUrl} alt="" width={176} height={176} unoptimized />
                    <div>
                      <strong>{campaign.title}</strong>
                      <span>{formatDollars(campaign.targetAmount, 2, 2)}</span>
                      <div className="campaign-category-badges">
                        {campaign.categories.map((category) => <small key={category}>{donationCategoryLabel(category)}</small>)}
                      </div>
                      <span className={campaign.isPublished ? "campaign-online" : "campaign-offline"}>
                        {campaign.isPublished ? "En línea" : "No publicada"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
