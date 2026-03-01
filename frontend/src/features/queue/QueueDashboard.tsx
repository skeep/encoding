import { useEffect, useMemo, useState } from "react";

import type { QueueStatus } from "../../api/types";
import { DetailPanel } from "../application-detail/DetailPanel";
import { QueueTableContainer } from "./components/QueueTableContainer";
import { QueueTabs } from "./components/QueueTabs";
import { useQueueDashboardData } from "./hooks/useQueueDashboardData";
import { useQueueTableRows } from "./hooks/useQueueTableRows";
import { useResizableSplit } from "./hooks/useResizableSplit";
import { queueTableFeaturesByStatus, type FilterField, type IntakeStatusFilter } from "./types/tableFeatures";
import { useQueueColumns } from "./utils/queueColumns";

export function QueueDashboard(): JSX.Element {
  const [activeStatus, setActiveStatus] = useState<QueueStatus>("INTAKE_IN_PROGRESS");
  const [search, setSearch] = useState("");
  const [filterField, setFilterField] = useState<FilterField>("applicationId");
  const [filterValue, setFilterValue] = useState("");
  const [intakeStatusFilter, setIntakeStatusFilter] = useState<IntakeStatusFilter>("ALL");
  const { mainRef, leftPanePercent, isResizing, setIsResizing } = useResizableSplit(60);
  const [pageSizeByStatus, setPageSizeByStatus] = useState<Record<QueueStatus, number>>({
    INTAKE_IN_PROGRESS: 10,
    ENCODING_COMPLETED: 10,
    DECISION_RUNNING: 10,
    DECISION_COMPLETED: 10
  });
  const activeFeatures = queueTableFeaturesByStatus[activeStatus];

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
    pageEnd,
    pageSize
  } = useQueueDashboardData(activeStatus, search, { pageSizeByStatus });
  const columns = useQueueColumns(activeStatus);
  const visibleRows = useQueueTableRows({
    rows: applications.items,
    activeStatus,
    filterField,
    filterValue,
    intakeStatusFilter
  });
  const filterFieldOptions = useMemo(() => activeFeatures.fieldFilterOptions, [activeFeatures.fieldFilterOptions]);
  const canFilterByCurrentField = useMemo(
    () => filterFieldOptions.includes(filterField),
    [filterField, filterFieldOptions]
  );

  useEffect(() => {
    if (!canFilterByCurrentField) {
      setFilterField(filterFieldOptions[0] ?? "applicationId");
    }
  }, [canFilterByCurrentField, filterFieldOptions]);

  useEffect(() => {
    if (!activeFeatures.showIntakeStatusFilter && intakeStatusFilter !== "ALL") {
      setIntakeStatusFilter("ALL");
    }
  }, [activeFeatures.showIntakeStatusFilter, intakeStatusFilter]);

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
          <QueueTableContainer
            features={activeFeatures}
            columns={columns}
            rows={visibleRows}
            selectedAppId={selectedAppId}
            onSelectRow={(row) => setSelectedAppId(row.applicationId)}
            loading={tableLoading}
            error={tableError}
            hasSourceRows={applications.items.length > 0}
            onRetry={() => void refreshApplications()}
            filterField={filterField}
            onFilterFieldChange={setFilterField}
            filterValue={filterValue}
            onFilterValueChange={setFilterValue}
            intakeStatusFilter={intakeStatusFilter}
            onIntakeStatusFilterChange={setIntakeStatusFilter}
            page={page}
            totalPages={totalPages}
            pageStart={pageStart}
            pageEnd={pageEnd}
            total={applications.total}
            pageSize={pageSize}
            pageSizeOptions={activeFeatures.pageSizeOptions}
            onPageSizeChange={(value) =>
              setPageSizeByStatus((prev) => ({
                ...prev,
                [activeStatus]: value
              }))
            }
            onFirst={() => setPage(1)}
            onPrev={() => setPage((prev) => prev - 1)}
            onNext={() => setPage((prev) => prev + 1)}
            onLast={() => setPage(totalPages)}
          />
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
