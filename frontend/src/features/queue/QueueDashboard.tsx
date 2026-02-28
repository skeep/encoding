import { useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "../../api/client";
import type {
  ApplicationStatus,
  ApplicationSummary,
  PaginatedApplications,
  QueueStatus,
  QueueSummary
} from "../../api/types";
import { queueStatuses } from "../../api/types";
import { formatIsoDate } from "../../app/formatters";
import { DetailPanel, type DetailPanelState } from "../application-detail/DetailPanel";
import { DataTable, type DataTableColumn } from "../../components/DataTable";

const statusLabels: Record<QueueStatus, string> = {
  INTAKE_IN_PROGRESS: "Intake & Encoding In Progress",
  ENCODING_COMPLETED: "Encoding Complete",
  DECISION_RUNNING: "Decision Running",
  DECISION_COMPLETED: "Decision Completed"
};

const pageSize = 10;

export function QueueDashboard(): JSX.Element {
  const [activeStatus, setActiveStatus] = useState<QueueStatus>("INTAKE_IN_PROGRESS");
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
  const [leftPanePercent, setLeftPanePercent] = useState(60);
  const [isResizing, setIsResizing] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    function handlePointerMove(event: MouseEvent): void {
      if (!isResizing || !mainRef.current) {
        return;
      }
      const rect = mainRef.current.getBoundingClientRect();
      const raw = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(40, Math.min(70, raw));
      setLeftPanePercent(clamped);
    }

    function handlePointerUp(): void {
      setIsResizing(false);
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.body.classList.add("is-resizing-divider");
    } else {
      document.body.classList.remove("is-resizing-divider");
    }
    return () => {
      document.body.classList.remove("is-resizing-divider");
    };
  }, [isResizing]);

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

  function renderDecisionStatus(value: ApplicationSummary["decisionStatus"]): string {
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

  function renderLifecycleStatus(
    appStatus: ApplicationStatus,
    encodingStatus: ApplicationSummary["encodingStatus"]
  ): string {
    if (appStatus === "EMAIL_RECEIVED") {
      return "Email Received";
    }
    if (appStatus === "ENCODING_IN_PROGRESS") {
      return encodingStatus === "IN_PROGRESS" ? "Encoding In Progress" : "Encoding In Queue";
    }
    return appStatus;
  }

  const columns = useMemo<DataTableColumn<ApplicationSummary>[]>(() => {
    const next: DataTableColumn<ApplicationSummary>[] = [
      {
        key: "applicationId",
        header: "Application ID",
        render: (item) => <span className="app-id-chip">{item.applicationId}</span>
      }
    ];

    if (activeStatus === "INTAKE_IN_PROGRESS" || activeStatus === "ENCODING_COMPLETED") {
      next.push(
        {
          key: "dealerEmailFrom",
          header: "Dealer Email (From)",
          render: (item) => item.dealerEmailFrom
        },
        {
          key: "documentCount",
          header: "Documents",
          render: (item) => item.documentCount
        },
        {
          key: "receivedAt",
          header: "Received Date/Time",
          render: (item) => formatIsoDate(item.receivedAt)
        }
      );
    }

    if (activeStatus === "INTAKE_IN_PROGRESS") {
      next.push({
        key: "status",
        header: "Status",
        render: (item) => renderLifecycleStatus(item.status, item.encodingStatus)
      });
    }

    if (activeStatus === "ENCODING_COMPLETED") {
      next.push(
        {
          key: "encodingStatus",
          header: "Encoding Status",
          render: (item) => renderEncodingStatus(item.encodingStatus)
        },
        {
          key: "extractedFieldCount",
          header: "Extracted Fields",
          render: (item) => item.extractedFieldCount ?? "-"
        },
        {
          key: "averageFieldConfidence",
          header: "Avg Confidence",
          render: (item) =>
            typeof item.averageFieldConfidence === "number"
              ? `${Math.round(item.averageFieldConfidence * 100)}%`
              : "-"
        }
      );
    }

    if (activeStatus === "DECISION_RUNNING" || activeStatus === "DECISION_COMPLETED") {
      next.push(
        {
          key: "decisionStatus",
          header: "Decision Status",
          render: (item) => renderDecisionStatus(item.decisionStatus)
        },
        {
          key: "riskScore",
          header: "Risk Score",
          render: (item) => (typeof item.riskScore === "number" ? item.riskScore.toFixed(2) : "-")
        },
        {
          key: "riskGrade",
          header: "Risk Grade",
          render: (item) => item.riskGrade ?? "-"
        },
        {
          key: "policyVersion",
          header: "Policy Version",
          render: (item) => item.policyVersion ?? "-"
        },
        {
          key: "stpEligible",
          header: "STP",
          render: (item) =>
            typeof item.stpEligible === "boolean" ? (item.stpEligible ? "Yes" : "No") : "-"
        }
      );
    }

    if (activeStatus === "DECISION_COMPLETED") {
      next.push({
        key: "finalDecision",
        header: "Final Decision",
        render: (item) => item.finalDecision ?? "-"
      });
    }

    next.push({
      key: "lastUpdatedAt",
      header: "Updated",
      render: (item) => formatIsoDate(item.lastUpdatedAt)
    });
    return next;
  }, [activeStatus]);

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

      <main
        ref={mainRef}
        className="dashboard-main"
        style={{
          gridTemplateColumns: `${leftPanePercent}% 8px ${100 - leftPanePercent}%`
        }}
      >
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
                <button className="button-primary" onClick={() => void fetchApplications()}>
                  Retry
                </button>
              </div>
            ) : null}
            {tableLoading ? <div className="state-box">Loading queue applications...</div> : null}
            {!tableLoading && !tableError && applications.items.length === 0 ? (
              <div className="state-box">No applications in this state.</div>
            ) : null}
            {!tableLoading && !tableError && applications.items.length > 0 ? (
              <>
                <DataTable<ApplicationSummary>
                  columns={columns}
                  rows={applications.items}
                  rowKey={(row) => row.applicationId}
                  selectedRowKey={selectedAppId}
                  onRowClick={(row) => setSelectedAppId(row.applicationId)}
                />
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

        <div
          className={`pane-resizer ${isResizing ? "active" : ""}`}
          onMouseDown={() => setIsResizing(true)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
        >
          <div className="pane-resizer-handle" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <aside className="detail-column">
          <div className="detail-header">
            <h2>Application Detail</h2>
            {selectedRow ? <span>{selectedRow.applicationId}</span> : null}
          </div>
          <DetailPanel activeStatus={activeStatus} selectedAppId={selectedAppId} state={detailState} />
        </aside>
      </main>
      <footer className="app-footer">
        <span className="footer-version">Release v0.1.0</span>
      </footer>
    </div>
  );
}
