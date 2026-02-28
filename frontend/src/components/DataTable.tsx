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
};

export function DataTable<T>(props: DataTableProps<T>): JSX.Element {
  const {
    columns,
    rows,
    rowKey,
    selectedRowKey,
    onRowClick,
    tableClassName = "queue-table",
    wrapperClassName = "queue-table-wrap"
  } = props;

  return (
    <div className={wrapperClassName}>
      <table className={tableClassName}>
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
