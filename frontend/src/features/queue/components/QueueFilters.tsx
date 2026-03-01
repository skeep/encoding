import type { FilterField, IntakeStatusFilter, QueueTableFeatureConfig } from "../types/tableFeatures";

const filterFieldLabels: Record<FilterField, string> = {
  applicationId: "Application ID",
  dealerEmailFrom: "Dealer Email"
};

export function QueueFilters(props: {
  features: QueueTableFeatureConfig;
  filterField: FilterField;
  onFilterFieldChange: (value: FilterField) => void;
  filterValue: string;
  onFilterValueChange: (value: string) => void;
  intakeStatusFilter: IntakeStatusFilter;
  onIntakeStatusFilterChange: (value: IntakeStatusFilter) => void;
}): JSX.Element | null {
  const {
    features,
    filterField,
    onFilterFieldChange,
    filterValue,
    onFilterValueChange,
    intakeStatusFilter,
    onIntakeStatusFilterChange
  } = props;

  if (!features.showFilters) {
    return null;
  }

  return (
    <div className="table-filter-controls">
      {features.showFieldFilter ? (
        <>
          <select
            className="table-filter-select"
            value={filterField}
            onChange={(event) => onFilterFieldChange(event.target.value as FilterField)}
            aria-label="Select filter field"
          >
            {features.fieldFilterOptions.map((option) => (
              <option key={option} value={option}>
                {filterFieldLabels[option]}
              </option>
            ))}
          </select>
          <input
            className="table-filter-input"
            value={filterValue}
            onChange={(event) => onFilterValueChange(event.target.value)}
            placeholder={`Filter visible rows by ${
              filterField === "dealerEmailFrom" ? "dealer email" : "application ID"
            }`}
          />
        </>
      ) : null}
      {features.showIntakeStatusFilter ? (
        <select
          className="table-filter-select"
          value={intakeStatusFilter}
          onChange={(event) => onIntakeStatusFilterChange(event.target.value as IntakeStatusFilter)}
          aria-label="Filter by intake status"
        >
          <option value="ALL">All Statuses</option>
          <option value="ENCODING_IN_PROGRESS">Encoding In Progress</option>
          <option value="ENCODING_IN_QUEUE">Encoding In Queue</option>
          <option value="EMAIL_RECEIVED">Email Received</option>
        </select>
      ) : null}
    </div>
  );
}
