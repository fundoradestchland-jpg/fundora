import Link from "next/link";
import { formatEuro } from "@/lib/format";
import {
  listingVisual,
  publicStatusClass,
  publicStatusLabel,
  type ApplicationKind,
  type ApplicationStatus,
  type PublicApplication,
} from "@/lib/public-data";

export function ApplicationListings({
  applications,
  kind,
  emptyTitle,
  emptyText,
  actionHref,
  actionLabel,
}: {
  applications: PublicApplication[];
  kind: ApplicationKind;
  emptyTitle: string;
  emptyText: string;
  actionHref: string;
  actionLabel: string;
}) {
  if (applications.length === 0) {
    return (
      <section className="donation-grid">
        <article className="donation-card">
          <span className="eyebrow">Données live</span>
          <h3>{emptyTitle}</h3>
          <p>{emptyText}</p>
          <div className="donation-footer">
            <Link href={actionHref} className="primary-button small">{actionLabel}</Link>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="donation-grid">
      {applications.map((application, index) => {
        const approved = application.status === "approved" && application.amountApproved != null;
        return (
          <article key={application.id} className="donation-card">
            <div className={`donation-visual ${listingVisual(index)}`} aria-hidden="true" />
            <span className="eyebrow">{application.city || application.country ? `${application.city}${application.city && application.country ? ", " : ""}${application.country}` : "Fundora"}</span>
            <h3>{application.subject}</h3>
            <div className="meta-row">
              <div className="meta-box">
                <span>Demandé</span>
                <strong>{formatEuro(application.amountRequested)}</strong>
              </div>
              <div className="meta-box">
                <span>{kind === "donation" ? "Attribué à cette demande" : "Approuvé"}</span>
                <strong>{approved ? formatEuro(application.amountApproved ?? 0) : "—"}</strong>
              </div>
            </div>
            <p>Les informations personnelles et les détails du dossier restent confidentiels.</p>
            <div className="donation-footer">
              <span className={`status-badge ${publicStatusClass(application.status)}`}>
                {publicStatusLabel(application.status, kind)}
              </span>
              <Link href={actionHref} className="primary-button small">{actionLabel}</Link>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export function StatusFilters({
  kindPath,
  current,
}: {
  kindPath: "/pret" | "/dons";
  current: ApplicationStatus | "all";
}) {
  const options: Array<{ value: ApplicationStatus | "all"; label: string }> = [
    { value: "all", label: "Tous" },
    { value: "pending", label: "En examen" },
    { value: "approved", label: kindPath === "/dons" ? "Attribués" : "Validés" },
    { value: "rejected", label: "Refusés" },
  ];

  return (
    <div className="donation-filters">
      {options.map((option) => (
        <Link
          key={option.value}
          href={option.value === "all" ? kindPath : `${kindPath}?statut=${option.value}`}
          className={`filter-pill ${current === option.value ? "active" : ""}`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
