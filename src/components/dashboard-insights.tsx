"use client";

import { useMemo } from "react";
import { useFundoraRequests } from "@/lib/request-api";
import { formatDollars } from "@/lib/format";

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
    return <section className="dashboard-insights"><div className="workflow-empty"><strong>Cargando tus estadísticas…</strong></div></section>;
  }

  if (error) {
    return <section className="dashboard-insights"><div className="workflow-empty"><strong>Estadísticas no disponibles</strong><span>{error}</span></div></section>;
  }

  return (
    <section className="dashboard-insights" aria-labelledby="statistics-title">
      <header className="insights-heading">
        <div>
          <span className="eyebrow">Datos de tus solicitudes</span>
          <h3 id="statistics-title">Tu actividad en Fundación Amira Aldahab</h3>
          <p>Los importes se calculan a partir de tus expedientes registrados. No representan un saldo bancario.</p>
        </div>
      </header>

      <div className="insight-metrics">
        <article className="insight-metric">
          <span>Expedientes presentados</span>
          <strong>{requests.length}</strong>
          <small>{statistics.donationCount} solicitud(es) de donación · {statistics.loanCount} solicitud(es) de préstamo</small>
        </article>
        <article className="insight-metric">
          <span>Monto solicitado</span>
          <strong>{formatDollars(statistics.requestedAmount)}</strong>
          <small>Total de montos solicitados en todos tus expedientes</small>
        </article>
        <article className="insight-metric approved">
          <span>Monto aprobado</span>
          <strong>{formatDollars(statistics.approvedAmount)}</strong>
          <small>{statistics.approvedCount} expediente(s) validado(s) por Fundación Amira Aldahab</small>
        </article>
        <article className="insight-metric pending">
          <span>En revisión</span>
          <strong>{statistics.pendingCount}</strong>
          <small>{statistics.refusedCount} expediente(s) rechazado(s)</small>
        </article>
      </div>

      <div className="insights-detail-grid">
        <section className="panel activity-chart-panel" aria-labelledby="activity-chart-title">
          <div className="panel-header">
            <div>
              <h3 id="activity-chart-title">Expedientes presentados</h3>
              <p>Número de solicitudes creadas, mes a mes</p>
            </div>
            <span>Últimos 6 meses</span>
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
          {requests.length === 0 && <p className="chart-empty-note">El gráfico se completará después de presentar tu primera solicitud.</p>}
        </section>

        <section className="panel status-overview-panel" aria-labelledby="status-overview-title">
          <div className="panel-header">
            <div>
              <h3 id="status-overview-title">Estado de los expedientes</h3>
              <p>Distribución según la última decisión de Fundación Amira Aldahab</p>
            </div>
          </div>
          <div className="status-overview-list">
            <div><span className="status-overview-dot pending-dot" /><span>Pendientes</span><strong>{statistics.pendingCount}</strong></div>
            <div><span className="status-overview-dot approved-dot" /><span>Validados</span><strong>{statistics.approvedCount}</strong></div>
            <div><span className="status-overview-dot refused-dot" /><span>Rechazados</span><strong>{statistics.refusedCount}</strong></div>
          </div>
        </section>
      </div>

      <section className="panel recent-applications-panel" aria-labelledby="recent-applications-title">
        <div className="panel-header">
          <div>
            <h3 id="recent-applications-title">Solicitudes recientes</h3>
            <p>Tus expedientes más recientes</p>
          </div>
          <span>{requests.length} en total</span>
        </div>
        {statistics.recentRequests.length === 0 ? (
          <p className="chart-empty-note">No hay expedientes registrados por el momento.</p>
        ) : (
          <ul className="request-list">
            {statistics.recentRequests.map((request) => (
              <li key={request.id}>
                <div>
                  <strong>{request.subject}</strong>
                  <span>{request.kind} · {new Date(request.createdAt).toLocaleDateString("es-ES")} · {formatDollars(Number(request.amountRequested) || 0)}</span>
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