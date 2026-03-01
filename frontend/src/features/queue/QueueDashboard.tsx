import { useMemo, useState } from "react";

import type { QueueStatus } from "../../api/types";
import { formatIsoDate } from "../../app/formatters";
import { DataTable } from "../../components/DataTable";
import { DetailPanel } from "../application-detail/DetailPanel";
import { PaginationControls } from "./components/PaginationControls";
import { QueueTabs } from "./components/QueueTabs";
import { useQueueDashboardData } from "./hooks/useQueueDashboardData";
import { useResizableSplit } from "./hooks/useResizableSplit";
import { useQueueColumns } from "./utils/queueColumns";
import { statusLabels } from "./utils/statusFormatters";

export function QueueDashboard(): JSX.Element {
  const [activeStatus, setActiveStatus] = useState<QueueStatus>("INTAKE_IN_PROGRESS");
  const [search, setSearch] = useState("");
  const { mainRef, leftPanePercent, isResizing, setIsResizing } = useResizableSplit(60);
  const {
    page,
    setPage,
    selectedAppId,
    setSelectedAppId,
    lastRefreshedAt,
    summary,
    applications,
    tableLoading,
    tableError,
    detailState,
    refreshSummary,
    refreshApplications,
    totalPages,
    pageStart,
    pageEnd
  } = useQueueDashboardData(activeStatus, search);
  const columns = useQueueColumns(activeStatus);
  const activeSummary = useMemo(
    () => summary.find((item) => item.status === activeStatus),
    [summary, activeStatus]
  );

  return (
    <div className="dashboard-root">
      <header className="top-nav">
        <div className="top-nav-left">
          <img className="header-logo" src="/assets/BPHLY_BIG.D.svg" alt="BPI logo" />
          <div className="header-title">
            <h1>Credit Trace Platform</h1>
            <p className="muted-text">Workflow Dashboard</p>
          </div>
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
          <QueueTabs activeStatus={activeStatus} summary={summary} onChange={setActiveStatus} />

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
                <button className="button-primary" onClick={() => void refreshApplications()}>
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
                <DataTable
                  columns={columns}
                  rows={applications.items}
                  rowKey={(row) => row.applicationId}
                  selectedRowKey={selectedAppId}
                  onRowClick={(row) => setSelectedAppId(row.applicationId)}
                />
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  total={applications.total}
                  onFirst={() => setPage(1)}
                  onPrev={() => setPage((prev) => prev - 1)}
                  onNext={() => setPage((prev) => prev + 1)}
                  onLast={() => setPage(totalPages)}
                />
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
          <DetailPanel activeStatus={activeStatus} selectedAppId={selectedAppId} state={detailState} />
        </aside>
      </main>
      <footer className="app-footer">
        <span className="footer-version">Release v0.1.0</span>
      </footer>
    </div>
  );
}
