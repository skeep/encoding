import { useMemo } from "react";

import type { SalesQueueRow } from "../../../api/types";
import { formatIsoDate } from "../../../app/formatters";
import type { DataTableColumn } from "../../../components/DataTable";
import { renderLoanTypeIcon } from "../../queue/utils/renderLoanTypeIcon";
import { renderSalesPipelineStatus } from "../../queue/utils/statusFormatters";

export function useSalesQueueColumns(): DataTableColumn<SalesQueueRow>[] {
  return useMemo<DataTableColumn<SalesQueueRow>[]>(
    () => [
      {
        key: "loanType",
        header: "Type",
        render: (item) => renderLoanTypeIcon(item.loanType)
      },
      {
        key: "applicationId",
        header: "Application ID",
        render: (item) => <span className="app-id-chip">{item.applicationId}</span>
      },
      {
        key: "dealerEmailFrom",
        header: "Dealer Email",
        render: (item) => item.dealerEmailFrom
      },
      {
        key: "documentCount",
        header: "Documents",
        render: (item) => item.documentCount
      },
      {
        key: "receivedAt",
        header: "Sent",
        render: (item) => formatIsoDate(item.receivedAt)
      },
      {
        key: "slaAgeMinutes",
        header: "Delay (min)",
        render: (item) => item.slaAgeMinutes
      },
      {
        key: "status",
        header: "Status",
        render: (item) => renderSalesPipelineStatus(item)
      },
      {
        key: "pendingTaskCount",
        header: "Actions",
        render: (item) =>
          item.pendingTaskCount > 0 ? (
            <span className="sales-pending-pill" title="Pending sales action">
              {item.pendingTaskCount} needed
            </span>
          ) : (
            <span className="muted-text">—</span>
          )
      }
    ],
    []
  );
}
