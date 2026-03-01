import { PaginationControls } from "./PaginationControls";
import { QueueFilters } from "./QueueFilters";
import type { FilterField, IntakeStatusFilter, QueueTableFeatureConfig } from "../types/tableFeatures";

export function QueueTableToolbar(props: {
  features: QueueTableFeatureConfig;
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
  onPageSizeChange: (value: number) => void;
  pageSizeOptions: number[];
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}): JSX.Element {
  const { features } = props;

  return (
    <div className="table-toolbar">
      <QueueFilters
        features={features}
        filterField={props.filterField}
        onFilterFieldChange={props.onFilterFieldChange}
        filterValue={props.filterValue}
        onFilterValueChange={props.onFilterValueChange}
        intakeStatusFilter={props.intakeStatusFilter}
        onIntakeStatusFilterChange={props.onIntakeStatusFilterChange}
      />
      {features.showPagination ? (
        <PaginationControls
          page={props.page}
          totalPages={props.totalPages}
          pageStart={props.pageStart}
          pageEnd={props.pageEnd}
          total={props.total}
          pageSize={props.pageSize}
          onPageSizeChange={props.onPageSizeChange}
          pageSizeOptions={features.showRowsPerPage ? props.pageSizeOptions : undefined}
          onFirst={props.onFirst}
          onPrev={props.onPrev}
          onNext={props.onNext}
          onLast={props.onLast}
        />
      ) : null}
    </div>
  );
}
