import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import type { ApplicationSummary, SalesDashboardSnapshot } from "../../../api/types";
import { renderSalesPipelineStatus } from "../../queue/utils/statusFormatters";

const SALES_DEALER_PANEL_ID = "sales-dealer-breakdown-panel";

function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  const half = Math.floor((maxChars - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(text.length - half)}`;
}

function minimalSummary(status: ApplicationSummary["status"]): ApplicationSummary {
  const base = new Date().toISOString();
  return {
    applicationId: "APP-SAMPLE",
    applicantName: "Sample",
    product: "Car Loan",
    market: "Philippines",
    loanType: "Auto",
    dealerEmailFrom: "sample@dealer.ph",
    documentCount: 0,
    receivedAt: base,
    lastUpdatedAt: base,
    slaAgeMinutes: 0,
    priority: "LOW",
    status
  };
}

function statusSliceLabel(status: ApplicationSummary["status"]): string {
  switch (status) {
    case "EMAIL_RECEIVED":
      return "Email";
    case "DOCUMENT_REQUESTED":
      return "Docs req.";
    case "ENCODING_IN_PROGRESS":
      return "Encoding";
    case "ENCODING_COMPLETED":
      return "Enc. done";
    case "DECISION_RUNNING":
      return "Decision";
    case "DECISION_COMPLETED":
      return "Decided";
    case "LOAN_DISBURSED":
      return "Disbursed";
    default:
      return status;
  }
}

export function SalesMetricsStrip(props: {
  snapshot: SalesDashboardSnapshot | null;
  loading: boolean;
  error?: string;
  dateFrom: string | null;
  dateTo: string | null;
  onDateFromChange: (value: string | null) => void;
  onDateToChange: (value: string | null) => void;
  onPreset: (preset: "all" | "feb2026") => void;
}): JSX.Element {
  const { snapshot, loading, error, dateFrom, dateTo, onDateFromChange, onDateToChange, onPreset } =
    props;

  const [dealerExpanded, setDealerExpanded] = useState(false);

  const totalStatusCount =
    snapshot?.byStatus.reduce((acc, row) => acc + row.count, 0) ?? 0;

  return (
    <section className="sales-metrics-strip" aria-label="Sales overview">
      <div className="sales-metrics-controls">
        <div className="sales-date-presets">
          <button type="button" className="chip-button" onClick={() => onPreset("all")}>
            All open
          </button>
          <button type="button" className="chip-button" onClick={() => onPreset("feb2026")}>
            Feb 2026 (demo)
          </button>
        </div>
        <div className="sales-date-range">
          <label>
            <span className="sr-only">From date</span>
            <input
              type="date"
              value={dateFrom ?? ""}
              onChange={(event) =>
                onDateFromChange(event.target.value === "" ? null : event.target.value)
              }
              className="sales-date-input"
            />
          </label>
          <span className="sales-date-sep" aria-hidden="true">
            –
          </span>
          <label>
            <span className="sr-only">To date</span>
            <input
              type="date"
              value={dateTo ?? ""}
              onChange={(event) =>
                onDateToChange(event.target.value === "" ? null : event.target.value)
              }
              className="sales-date-input"
            />
          </label>
        </div>
      </div>

      {error ? <div className="state-box error-box sales-metrics-error">{error}</div> : null}

      {loading && !snapshot ? <div className="state-box sales-metrics-loading">Loading metrics…</div> : null}

      {snapshot ? (
        <div className="sales-metrics-grid">
          <div className="sales-kpi-card">
            <p className="sales-kpi-label">Open applications</p>
            <p className="sales-kpi-value">{snapshot.totalOpenApplications}</p>
          </div>
          <div className="sales-kpi-card">
            <p className="sales-kpi-label">Dealers (in range)</p>
            <p className="sales-kpi-value">{snapshot.distinctDealerCount}</p>
          </div>
          <div className="sales-kpi-card sales-kpi-wide">
            <p className="sales-kpi-label">Status mix</p>
            {totalStatusCount === 0 ? (
              <p className="muted-text">No applications in this range.</p>
            ) : (
              <div className="sales-status-bar" role="img" aria-label="Application counts by status">
                {snapshot.byStatus.map((row) => (
                  <div
                    key={row.status}
                    className="sales-status-segment"
                    style={{
                      flexGrow: Math.max(row.count, 0.001),
                      flexBasis: 0
                    }}
                    title={`${renderSalesPipelineStatus(minimalSummary(row.status))}: ${row.count}`}
                  >
                    <span className="sales-status-segment-label">{statusSliceLabel(row.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {snapshot && snapshot.byDealer.length > 0 ? (
        <div className="sales-dealer-breakdown">
          <button
            type="button"
            className="sales-dealer-disclosure-trigger"
            aria-expanded={dealerExpanded}
            aria-controls={SALES_DEALER_PANEL_ID}
            onClick={() => setDealerExpanded((open) => !open)}
          >
            <span className="sales-dealer-disclosure-chevron" aria-hidden="true">
              {dealerExpanded ? (
                <ChevronDown size={18} strokeWidth={2.25} />
              ) : (
                <ChevronRight size={18} strokeWidth={2.25} />
              )}
            </span>
            <span className="sales-dealer-disclosure-title">Top dealers by volume</span>
            <span className="sales-dealer-disclosure-teaser muted-text">
              {snapshot.byDealer.length} dealers · Top:{" "}
              {truncateMiddle(snapshot.byDealer[0].dealerEmail, 36)} ({snapshot.byDealer[0].count}{" "}
              {snapshot.byDealer[0].count === 1 ? "app" : "apps"})
            </span>
          </button>
          {dealerExpanded ? (
            <div
              id={SALES_DEALER_PANEL_ID}
              className="sales-dealer-table-scroll"
              role="region"
              aria-label="Dealer breakdown table"
            >
              <table className="sales-dealer-table">
                <thead>
                  <tr>
                    <th scope="col">Dealer email</th>
                    <th scope="col">Apps</th>
                    <th scope="col">Status notes</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.byDealer.slice(0, 6).map((row) => (
                    <tr key={row.dealerEmail}>
                      <td>{row.dealerEmail}</td>
                      <td>{row.count}</td>
                      <td className="sales-dealer-meta">
                        {Object.entries(row.byStatus)
                          .filter(([, n]) => (n ?? 0) > 0)
                          .map(([st, n]) =>
                            `${statusSliceLabel(st as ApplicationSummary["status"])}: ${n}`
                          )
                          .join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
