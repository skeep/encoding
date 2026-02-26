import { useEffect, useMemo, useState } from "react";

import { apiClient } from "../../api/client";
import type {
  ApplicationSummary,
  PaginatedApplications,
  QueueStatus,
  QueueSummary
} from "../../api/types";
import { queueStatuses } from "../../api/types";
import { formatIsoDate } from "../../app/formatters";
import { DetailPanel, type DetailPanelState } from "../application-detail/DetailPanel";

const statusLabels: Record<QueueStatus, string> = {
  EMAIL_RECEIVED: "Email Received",
  ENCODING_IN_PROGRESS: "Encoding In Progress",
  ENCODING_COMPLETED: "Encoding Complete",
  DECISION_QUEUED: "Decision Queued",
  DECISION_RUNNING: "Decision Running",
  DECISION_COMPLETED: "Decision Completed"
};

const pageSize = 10;

export function QueueDashboard(): JSX.Element {
  const [activeStatus, setActiveStatus] = useState<QueueStatus>("EMAIL_RECEIVED");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toISOString());

  const [summary, setSummary] = useState<QueueSummary[]>([]);
  const [applications, setApplications] = useState<PaginatedApplications>({
    items: [],
    page: 1,
    size: pageSize,
    total: 0
  });
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | undefined>();

  const [detailState, setDetailState] = useState<DetailPanelState>({
    loading: false
  });

  useEffect(() => {
    void refreshSummary();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeStatus, search]);

  useEffect(() => {
    void fetchApplications();
  }, [activeStatus, search, page]);

  useEffect(() => {
    if (!selectedAppId) {
      setDetailState({ loading: false });
      return;
    }
    void fetchDetail(selectedAppId, activeStatus);
  }, [selectedAppId, activeStatus]);

  async function refreshSummary(): Promise<void> {
    const next = await apiClient.getQueueSummary();
    setSummary(next);
    setLastRefreshedAt(new Date().toISOString());
  }

  async function fetchApplications(): Promise<void> {
    setTableLoading(true);
    setTableError(undefined);
    try {
      const response = await apiClient.getApplications({
        status: activeStatus,
        q: search,
        page,
        size: pageSize
      });
      setApplications(response);
      if (response.items.length === 0) {
        setSelectedAppId(null);
        return;
      }
      if (!selectedAppId || !response.items.some((item) => item.applicationId === selectedAppId)) {
        setSelectedAppId(response.items[0].applicationId);
      }
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "Unable to load queue data");
    } finally {
      setTableLoading(false);
    }
  }

  async function fetchDetail(applicationId: string, status: QueueStatus): Promise<void> {
    setDetailState({ loading: true });
    try {
      const detail = await apiClient.getApplicationById(applicationId);
      if (status === "ENCODING_COMPLETED") {
        const encoding = await apiClient.getEncodingView(applicationId);
        setDetailState({ detail, encoding, loading: false });
        return;
      }
      if (status === "DECISION_COMPLETED") {
        const decision = await apiClient.getDecisionView(applicationId);
        setDetailState({ detail, decision, loading: false });
        return;
      }
      setDetailState({ detail, loading: false });
    } catch (error) {
      setDetailState({
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load application details"
      });
    }
  }

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(applications.total / pageSize));
  }, [applications.total]);
  const pageStart = useMemo(() => (applications.total === 0 ? 0 : (page - 1) * pageSize + 1), [applications.total, page]);
  const pageEnd = useMemo(
    () => Math.min(page * pageSize, applications.total),
    [applications.total, page]
  );

  const selectedRow = useMemo(
    () => applications.items.find((item) => item.applicationId === selectedAppId),
    [applications.items, selectedAppId]
  );

  const activeSummary = useMemo(
    () => summary.find((item) => item.status === activeStatus),
    [summary, activeStatus]
  );

  function renderEncodingStatus(value: ApplicationSummary["encodingStatus"]): string {
    if (value === "IN_QUEUE") {
      return "In Queue";
    }
    if (value === "IN_PROGRESS") {
      return "In Progress";
    }
    if (value === "COMPLETED") {
      return "Completed";
    }
    return "-";
  }

  return (
    <div className="dashboard-root">
      <header className="top-nav">
        <div className="top-nav-left">
          <h1>Credit Trace Platform</h1>
          <p className="muted-text">Workflow Dashboard</p>
        </div>
        <div className="top-nav-center">
          <input
            className="top-nav-search"
            placeholder="Search by application ID or dealer email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="top-nav-right">
          <span className="user-name">Suman Paul</span>
          <button type="button">Logout</button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="queue-column">
          <div className="tab-row" role="tablist" aria-label="Workflow state tabs">
            {queueStatuses.map((status) => {
              const count = summary.find((item) => item.status === status)?.count ?? 0;
              const stale = summary.find((item) => item.status === status)?.stale ?? false;
              return (
                <button
                  key={status}
                  role="tab"
                  aria-selected={activeStatus === status}
                  className={`queue-tab ${activeStatus === status ? "active" : ""}`}
                  onClick={() => setActiveStatus(status)}
                >
                  <span>{statusLabels[status]}</span>
                  <strong>{count}</strong>
                  {stale ? <em className="stale-pill">stale</em> : null}
                </button>
              );
            })}
          </div>

          <div className="table-shell" aria-busy={tableLoading}>
            <div className="table-headline">
              <h2>{statusLabels[activeStatus]}</h2>
              <div className="table-headline-actions">
                <span className="muted-text">
                  {activeSummary ? `${activeSummary.count} in queue` : "Queue count unavailable"}
                </span>
                <button onClick={() => void refreshSummary()}>Refresh</button>
                <small className="muted-text">Updated: {formatIsoDate(lastRefreshedAt)}</small>
              </div>
            </div>
            {tableError ? (
              <div className="state-box error-box">
                <p>{tableError}</p>
                <button onClick={() => void fetchApplications()}>Retry</button>
              </div>
            ) : null}
            {tableLoading ? <div className="state-box">Loading queue applications...</div> : null}
            {!tableLoading && !tableError && applications.items.length === 0 ? (
              <div className="state-box">No applications in this state.</div>
            ) : null}
            {!tableLoading && !tableError && applications.items.length > 0 ? (
              <>
                <div className="queue-table-wrap">
                  <table className="queue-table">
                    <thead>
                      <tr>
                        <th>Application ID</th>
                      {activeStatus === "EMAIL_RECEIVED" ||
                      activeStatus === "ENCODING_IN_PROGRESS" ||
                      activeStatus === "ENCODING_COMPLETED" ? (
                          <>
                            <th>Dealer Email (From)</th>
                            <th>Documents</th>
                            <th>Received Date/Time</th>
                          </>
                        ) : null}
                      {activeStatus === "ENCODING_IN_PROGRESS" ||
                      activeStatus === "ENCODING_COMPLETED" ? (
                        <th>Encoding Status</th>
                      ) : null}
                      {activeStatus === "ENCODING_COMPLETED" ? (
                        <>
                          <th>Extracted Fields</th>
                          <th>Avg Confidence</th>
                        </>
                      ) : null}
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.items.map((item: ApplicationSummary) => (
                        <tr
                          key={item.applicationId}
                          className={item.applicationId === selectedAppId ? "selected-row" : ""}
                          onClick={() => setSelectedAppId(item.applicationId)}
                        >
                          <td>
                            <span className="app-id-chip">{item.applicationId}</span>
                          </td>
                        {activeStatus === "EMAIL_RECEIVED" ||
                        activeStatus === "ENCODING_IN_PROGRESS" ||
                        activeStatus === "ENCODING_COMPLETED" ? (
                            <>
                              <td>{item.dealerEmailFrom}</td>
                              <td>{item.documentCount}</td>
                              <td>{formatIsoDate(item.receivedAt)}</td>
                            </>
                          ) : null}
                        {activeStatus === "ENCODING_IN_PROGRESS" ||
                        activeStatus === "ENCODING_COMPLETED" ? (
                          <td>{renderEncodingStatus(item.encodingStatus)}</td>
                        ) : null}
                        {activeStatus === "ENCODING_COMPLETED" ? (
                          <>
                            <td>{item.extractedFieldCount ?? "-"}</td>
                            <td>
                              {typeof item.averageFieldConfidence === "number"
                                ? `${Math.round(item.averageFieldConfidence * 100)}%`
                                : "-"}
                            </td>
                          </>
                        ) : null}
                          <td>{formatIsoDate(item.lastUpdatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pagination-row">
                  <span className="pagination-meta">
                    Showing {pageStart}-{pageEnd} of {applications.total}
                  </span>
                  <div className="pagination-controls">
                    <button disabled={page <= 1} onClick={() => setPage(1)}>
                      First
                    </button>
                    <button disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                      Previous
                    </button>
                    <span className="pagination-page-indicator">
                      Page {page} / {totalPages}
                    </span>
                    <button disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                      Next
                    </button>
                    <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                      Last
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>

        <aside className="detail-column">
          <div className="detail-header">
            <h2>Application Detail</h2>
            {selectedRow ? <span>{selectedRow.applicationId}</span> : null}
          </div>
          <DetailPanel activeStatus={activeStatus} selectedAppId={selectedAppId} state={detailState} />
        </aside>
      </main>
      <footer className="app-footer">
        <span>Credit Traceability Engine</span>
        <span className="muted-text">Audit-safe, explainable workflow view</span>
      </footer>
    </div>
  );
}
