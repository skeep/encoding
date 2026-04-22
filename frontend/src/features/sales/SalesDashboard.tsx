import { useEffect, useMemo, useState } from "react";

import { AppShell } from "../../app/AppShell";
import { QueueTableContainer } from "../queue/components/QueueTableContainer";
import type {
  ApprovalBucketFilter,
  FilterField,
  IntakeStatusFilter
} from "../queue/types/tableFeatures";
import { useResizableSplit } from "../queue/hooks/useResizableSplit";
import { SalesMetricsStrip } from "./components/SalesMetricsStrip";
import { SalesDetailPanel } from "./components/SalesDetailPanel";
import { salesQueueTableFeatures } from "./salesTableFeatures";
import { useSalesQueueColumns } from "./hooks/useSalesQueueColumns";
import { useSalesQueueData } from "./hooks/useSalesQueueData";
import { useSalesTableRows } from "./hooks/useSalesTableRows";

const intakeStatusFilter: IntakeStatusFilter = "ALL";
const approvalBucketFilter: ApprovalBucketFilter = "ALL";

export function SalesDashboard(): JSX.Element {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [filterField, setFilterField] = useState<FilterField>("applicationId");
  const [filterValue, setFilterValue] = useState("");
  const [pageSize, setPageSize] = useState(10);

  const { mainRef, leftPanePercent, isResizing, setIsResizing } = useResizableSplit(40);

  const {
    page,
    setPage,
    selectedAppId,
    setSelectedAppId,
    dashboardSnapshot,
    snapshotLoading,
    snapshotError,
    applications,
    tableLoading,
    tableError,
    detailState,
    refreshDashboard,
    refreshApplications,
    refreshDetail,
    totalPages,
    pageStart,
    pageEnd,
    pageSize: effectivePageSize
  } = useSalesQueueData(search, dateFrom, dateTo, pageSize);

  const columns = useSalesQueueColumns();
  const visibleRows = useSalesTableRows(applications.items, filterField, filterValue);

  const activeFeatures = salesQueueTableFeatures;

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

  async function handleAfterSubmit(): Promise<void> {
    await refreshApplications();
    await refreshDashboard();
    await refreshDetail();
  }

  function handlePreset(preset: "all" | "feb2026"): void {
    if (preset === "all") {
      setDateFrom(null);
      setDateTo(null);
      return;
    }
    setDateFrom("2026-02-01");
    setDateTo("2026-02-28");
  }

  return (
    <AppShell
      headerCenter={
        <input
          className="top-nav-search"
          placeholder="Search by application ID or dealer email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      }
    >
      <div className="sales-page-body">
        <SalesMetricsStrip
          snapshot={dashboardSnapshot}
          loading={snapshotLoading}
          error={snapshotError}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onPreset={handlePreset}
        />

        <main
          ref={mainRef}
          className="dashboard-main"
          style={{
            gridTemplateColumns: `${leftPanePercent}% 8px ${100 - leftPanePercent}%`
          }}
        >
        <section className="queue-column">
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
            onIntakeStatusFilterChange={() => undefined}
            approvalBucketFilter={approvalBucketFilter}
            onApprovalBucketFilterChange={() => undefined}
            page={page}
            totalPages={totalPages}
            pageStart={pageStart}
            pageEnd={pageEnd}
            total={applications.total}
            pageSize={effectivePageSize}
            pageSizeOptions={activeFeatures.pageSizeOptions}
            onPageSizeChange={setPageSize}
            onFirst={() => setPage(1)}
            onPrev={() => setPage((prev) => prev - 1)}
            onNext={() => setPage((prev) => prev + 1)}
            onLast={() => setPage(totalPages)}
            loadingLabel="Loading sales applications…"
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
          <SalesDetailPanel
            selectedAppId={selectedAppId}
            state={detailState}
            onAfterSubmit={handleAfterSubmit}
          />
        </aside>
      </main>
      </div>
    </AppShell>
  );
}
