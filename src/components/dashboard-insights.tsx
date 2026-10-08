"use client";

import { useMemo } from "react";
import { useFundoraRequests } from "@/lib/request-api";

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatAmount(value: number) {
  return currency.format(value);
}

function statusClass(status: string) {
  if (status === "Validée") return "validee";
  if (status === "Refusée") return "refusee";
  return "en-attente";
}

export function DashboardInsights() {
  const { requests, loading, error } = useFundoraRequests();
  const statistics = useMemo(() => {
    const requestedAmount = requests.reduce((total, request) => total + (Number(request.amountRequested) || 0), 0);
    const approvedAmount = requests.reduce((total, request) =>
      total + (request.status === "Validée" ? Number(request.approvedAmount) || 0 : 0), 0);
    const approvedCount = requests.filter((request) => request.status === "Validée").length;
    const pendingCount = requests.filter((request) => request.status === "En attente").length;
    const refusedCount = requests.filter((request) => request.status === "Refusée").length;
    const donationCount = requests.filter((request) => request.kind === "Don").length;
    const loanCount = requests.filter((request) => request.kind === "Prêt").length;
    const now = new Date();
    const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthRequests = requests.filter((request) => {
        const created = new Date(request.createdAt);
        return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
      });
      return { label: monthFormatter.format(date).replace(".", ""), count: monthRequests.length };
    });

    return {
      requestedAmount,
      approvedAmount,
      approvedCount,
      pendingCount,
      refusedCount,
      donationCount,
      loanCount,
      months,
      maxMonthCount: Math.max(1, ...months.map((month) => month.count)),
      recentRequests: [...requests].sort((first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      ).slice(0, 4),
    };
  }, [requests]);

  if (loading) {
    return <section className="dashboard-insights"><div className="workflow-empty"><strong>Chargement de vos statistiques…</strong></div></section>;
  }

  if (error) {
    return <section className="dashboard-insights"><div className="workflow-empty"><strong>Statistiques indisponibles</strong><span>{error}</span></div></section>;
  }

  return (
    <section className="dashboard-insights" aria-labelledby="statistics-title">
      <header className="insights-heading">
        <div>
          <span className="eyebrow">Données de vos demandes</span>
          <h3 id="statistics-title">Votre activité Fundora</h3>
          <p>Les montants sont calculés depuis vos dossiers enregistrés. Ils ne représentent pas un solde bancaire.</p>
        </div>
      </header>

      <div className="insight-metrics">
        <article className="insight-metric">
          <span>Dossiers déposés</span>
          <strong>{requests.length}</strong>
          <small>{statistics.donationCount} demande(s) de don · {statistics.loanCount} demande(s) de prêt</small>
        </article>
        <article className="insight-metric">
          <span>Montant demandé</span>
          <strong>{formatAmount(statistics.requestedAmount)}</strong>
          <small>Total des montants demandés dans tous vos dossiers</small>
        </article>
        <article className="insight-metric approved">
          <span>Montant approuvé</span>
          <strong>{formatAmount(statistics.approvedAmount)}</strong>
          <small>{statistics.approvedCount} dossier(s) validé(s) par Fundora</small>
        </article>
        <article className="insight-metric pending">
          <span>En cours d’examen</span>
          <strong>{statistics.pendingCount}</strong>
          <small>{statistics.refusedCount} dossier(s) refusé(s)</small>
        </article>
      </div>

      <div className="insights-detail-grid">
        <section className="panel activity-chart-panel" aria-labelledby="activity-chart-title">
          <div className="panel-header">
            <div>
              <h3 id="activity-chart-title">Dossiers déposés</h3>
              <p>Nombre de demandes créées, mois par mois</p>
            </div>
            <span>6 derniers mois</span>
          </div>
          <div className="activity-chart" role="img" aria-label="Nombre de dossiers créés pour chacun des six derniers mois">
            {statistics.months.map((month) => (
              <div className="activity-month" key={`${month.label}-${month.count}`}>
                <span className="activity-count">{month.count}</span>
                <div className="activity-track">
                  <span
                    className="activity-bar"
                    style={{ height: `${month.count === 0 ? 3 : Math.max(10, month.count / statistics.maxMonthCount * 100)}%` }}
                    title={`${month.count} dossier(s) en ${month.label}`}
                  />
                </div>
                <small>{month.label}</small>
              </div>
            ))}
          </div>
          {requests.length === 0 && <p className="chart-empty-note">Le graphique se remplira après le dépôt de votre première demande.</p>}
        </section>

        <section className="panel status-overview-panel" aria-labelledby="status-overview-title">
          <div className="panel-header">
            <div>
              <h3 id="status-overview-title">État des dossiers</h3>
              <p>Répartition selon la dernière décision de Fundora</p>
            </div>
          </div>
          <div className="status-overview-list">
            <div><span className="status-overview-dot pending-dot" /><span>En attente</span><strong>{statistics.pendingCount}</strong></div>
            <div><span className="status-overview-dot approved-dot" /><span>Validés</span><strong>{statistics.approvedCount}</strong></div>
            <div><span className="status-overview-dot refused-dot" /><span>Refusés</span><strong>{statistics.refusedCount}</strong></div>
          </div>
        </section>
      </div>

      <section className="panel recent-applications-panel" aria-labelledby="recent-applications-title">
        <div className="panel-header">
          <div>
            <h3 id="recent-applications-title">Dernières demandes</h3>
            <p>Vos dossiers les plus récents</p>
          </div>
          <span>{requests.length} au total</span>
        </div>
        {statistics.recentRequests.length === 0 ? (
          <p className="chart-empty-note">Aucun dossier enregistré pour le moment.</p>
        ) : (
          <ul className="request-list">
            {statistics.recentRequests.map((request) => (
              <li key={request.id}>
                <div>
                  <strong>{request.subject}</strong>
                  <span>{request.kind} · {new Date(request.createdAt).toLocaleDateString("fr-FR")} · {formatAmount(Number(request.amountRequested) || 0)}</span>
                </div>
                <em className={`review-badge ${statusClass(request.status)}`}>{request.status}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}