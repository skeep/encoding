import type { ApplicationSummary } from "../../../api/types";
import { DataTable, type DataTableColumn } from "../../../components/DataTable";
import type { FilterField, IntakeStatusFilter, QueueTableFeatureConfig } from "../types/tableFeatures";
import { QueueTableToolbar } from "./QueueTableToolbar";

export function QueueTableContainer(props: {
  features: QueueTableFeatureConfig;
  columns: DataTableColumn<ApplicationSummary>[];
  rows: ApplicationSummary[];
  selectedAppId: string | null;
  onSelectRow: (row: ApplicationSummary) => void;
  loading: boolean;
  error?: string;
  hasSourceRows: boolean;
  onRetry: () => void;
  filterField: FilterField;
  onFilterFieldChange: (value: FilterField) => void;
  filterValue: string;
  onFilterValueChange: (value: string) => void;
  intakeStatusFilter: IntakeStatusFilter;
  onIntakeStatusFilterChange: (value: IntakeStatusFilter) => void;
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (value: number) => void;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}): JSX.Element {
  const {
    features,
    columns,
    rows,
    selectedAppId,
    onSelectRow,
    loading,
    error,
    hasSourceRows,
    onRetry
  } = props;

  return (
    <div className="table-shell" aria-busy={loading}>
      <QueueTableToolbar
        features={features}
        filterField={props.filterField}
        onFilterFieldChange={props.onFilterFieldChange}
        filterValue={props.filterValue}
        onFilterValueChange={props.onFilterValueChange}
        intakeStatusFilter={props.intakeStatusFilter}
        onIntakeStatusFilterChange={props.onIntakeStatusFilterChange}
        page={props.page}
        totalPages={props.totalPages}
        pageStart={props.pageStart}
        pageEnd={props.pageEnd}
        total={props.total}
        pageSize={props.pageSize}
        onPageSizeChange={props.onPageSizeChange}
        pageSizeOptions={props.pageSizeOptions}
        onFirst={props.onFirst}
        onPrev={props.onPrev}
        onNext={props.onNext}
        onLast={props.onLast}
      />
      {error ? (
        <div className="state-box error-box">
          <p>{error}</p>
          <button className="button-primary" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}
      {loading ? <div className="state-box">Loading queue applications...</div> : null}
      {!loading && !error && !hasSourceRows ? <div className="state-box">No applications in this state.</div> : null}
      {!loading && !error && hasSourceRows && rows.length === 0 ? (
        <div className="state-box">No applications match the selected filters.</div>
      ) : null}
      {!loading && !error && rows.length > 0 ? (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.applicationId}
          selectedRowKey={selectedAppId}
          onRowClick={onSelectRow}
          stickyHeader={features.stickyHeader}
          scrollBody={features.scrollBody}
        />
      ) : null}
    </div>
  );
}
