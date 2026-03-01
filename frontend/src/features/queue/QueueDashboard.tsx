import { useEffect, useMemo, useState } from "react";

import type { QueueStatus } from "../../api/types";
import { DataTable } from "../../components/DataTable";
import { DetailPanel } from "../application-detail/DetailPanel";
import { PaginationControls } from "./components/PaginationControls";
import { QueueTabs } from "./components/QueueTabs";
import { useQueueDashboardData } from "./hooks/useQueueDashboardData";
import { useResizableSplit } from "./hooks/useResizableSplit";
import { useQueueColumns } from "./utils/queueColumns";
import { renderLifecycleStatus } from "./utils/statusFormatters";

type FilterField = "applicationId" | "dealerEmailFrom";
type IntakeStatusFilter = "ALL" | "ENCODING_IN_PROGRESS" | "ENCODING_IN_QUEUE" | "EMAIL_RECEIVED";

export function QueueDashboard(): JSX.Element {
  const [activeStatus, setActiveStatus] = useState<QueueStatus>("INTAKE_IN_PROGRESS");
  const [search, setSearch] = useState("");
  const [filterField, setFilterField] = useState<FilterField>("applicationId");
  const [filterValue, setFilterValue] = useState("");
  const [intakeStatusFilter, setIntakeStatusFilter] = useState<IntakeStatusFilter>("ALL");
  const { mainRef, leftPanePercent, isResizing, setIsResizing } = useResizableSplit(60);
  const {
    page,
    setPage,
    selectedAppId,
    setSelectedAppId,
    summary,
    applications,
    tableLoading,
    tableError,
    detailState,
    refreshApplications,
    totalPages,
    pageStart,
    pageEnd
  } = useQueueDashboardData(activeStatus, search);
  const columns = useQueueColumns(activeStatus);
  const filteredRows = useMemo(() => {
    if (!filterValue.trim()) {
      return applications.items;
    }
    const query = filterValue.trim().toLowerCase();
    return applications.items.filter((row) => String(row[filterField] ?? "").toLowerCase().includes(query));
  }, [applications.items, filterField, filterValue]);
  const canFilterByDealer = activeStatus === "INTAKE_IN_PROGRESS" || activeStatus === "ENCODING_COMPLETED";
  const isIntakeTab = activeStatus === "INTAKE_IN_PROGRESS";

  const visibleRows = useMemo(() => {
    let next = filteredRows;
    if (isIntakeTab && intakeStatusFilter !== "ALL") {
      next = next.filter((row) => {
        if (intakeStatusFilter === "EMAIL_RECEIVED") {
          return row.status === "EMAIL_RECEIVED";
        }
        if (row.status !== "ENCODING_IN_PROGRESS") {
          return false;
        }
        if (intakeStatusFilter === "ENCODING_IN_PROGRESS") {
          return row.encodingStatus === "IN_PROGRESS";
        }
        return row.encodingStatus === "IN_QUEUE";
      });
    }
    if (!isIntakeTab) {
      return next;
    }
    return [...next].sort((left, right) => {
      const rank = (status: string): number => {
        if (status === "Encoding In Progress") {
          return 0;
        }
        if (status === "Encoding In Queue") {
          return 1;
        }
        if (status === "Email Received") {
          return 2;
        }
        return 3;
      };
      const leftStatus = renderLifecycleStatus(left.status, left.encodingStatus);
      const rightStatus = renderLifecycleStatus(right.status, right.encodingStatus);
      const rankDelta = rank(leftStatus) - rank(rightStatus);
      if (rankDelta !== 0) {
        return rankDelta;
      }
      return left.applicationId.localeCompare(right.applicationId);
    });
  }, [filteredRows, intakeStatusFilter, isIntakeTab]);

  useEffect(() => {
    if (!canFilterByDealer && filterField === "dealerEmailFrom") {
      setFilterField("applicationId");
    }
  }, [canFilterByDealer, filterField]);

  useEffect(() => {
    if (!isIntakeTab && intakeStatusFilter !== "ALL") {
      setIntakeStatusFilter("ALL");
    }
  }, [intakeStatusFilter, isIntakeTab]);

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
            <div className="table-toolbar">
              <div className="table-filter-controls">
                <select
                  className="table-filter-select"
                  value={filterField}
                  onChange={(event) => setFilterField(event.target.value as FilterField)}
                >
                  <option value="applicationId">Application ID</option>
                  {canFilterByDealer ? <option value="dealerEmailFrom">Dealer Email</option> : null}
                </select>
                <input
                  className="table-filter-input"
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                  placeholder={`Filter visible rows by ${
                    filterField === "dealerEmailFrom" ? "dealer email" : "application ID"
                  }`}
                />
                {isIntakeTab ? (
                  <select
                    className="table-filter-select"
                    value={intakeStatusFilter}
                    onChange={(event) => setIntakeStatusFilter(event.target.value as IntakeStatusFilter)}
                    aria-label="Filter by intake status"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ENCODING_IN_PROGRESS">Encoding In Progress</option>
                    <option value="ENCODING_IN_QUEUE">Encoding In Queue</option>
                    <option value="EMAIL_RECEIVED">Email Received</option>
                  </select>
                ) : null}
              </div>
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
            {!tableLoading && !tableError && applications.items.length > 0 && visibleRows.length === 0 ? (
              <div className="state-box">No applications match the selected filters.</div>
            ) : null}
            {!tableLoading && !tableError && applications.items.length > 0 && visibleRows.length > 0 ? (
              <>
                <DataTable
                  columns={columns}
                  rows={visibleRows}
                  rowKey={(row) => row.applicationId}
                  selectedRowKey={selectedAppId}
                  onRowClick={(row) => setSelectedAppId(row.applicationId)}
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
