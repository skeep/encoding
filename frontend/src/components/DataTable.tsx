import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectedRowKey?: string | null;
  onRowClick?: (row: T) => void;
  tableClassName?: string;
  wrapperClassName?: string;
  stickyHeader?: boolean;
  scrollBody?: boolean;
};

export function DataTable<T>(props: DataTableProps<T>): JSX.Element {
  const {
    columns,
    rows,
    rowKey,
    selectedRowKey,
    onRowClick,
    tableClassName = "queue-table",
    wrapperClassName = "queue-table-wrap",
    stickyHeader = true,
    scrollBody = true
  } = props;
  const effectiveWrapperClassName = [
    wrapperClassName,
    scrollBody ? "table-body-scroll" : "",
    stickyHeader ? "table-sticky-header" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const effectiveTableClassName = [tableClassName, stickyHeader ? "sticky-header-enabled" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={effectiveWrapperClassName}>
      <table className={effectiveTableClassName}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr
                key={key}
                className={key === selectedRowKey ? "selected-row" : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td key={`${key}-${column.key}`}>{column.render(row)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
