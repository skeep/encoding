import { useMemo } from "react";

import type { SalesQueueRow } from "../../../api/types";
import type { FilterField } from "../../queue/types/tableFeatures";

export function useSalesTableRows(
  rows: SalesQueueRow[],
  filterField: FilterField,
  filterValue: string
): SalesQueueRow[] {
  return useMemo(() => {
    const query = filterValue.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter((row) => String(row[filterField] ?? "").toLowerCase().includes(query));
  }, [rows, filterField, filterValue]);
}
