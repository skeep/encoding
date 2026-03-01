import { useMemo } from "react";

import type { ApplicationSummary, QueueStatus } from "../../../api/types";
import { formatIsoDate } from "../../../app/formatters";
import type { DataTableColumn } from "../../../components/DataTable";
import {
  renderDecisionStatus,
  renderEncodingStatus,
  renderLifecycleStatus
} from "./statusFormatters";

export function useQueueColumns(activeStatus: QueueStatus): DataTableColumn<ApplicationSummary>[] {
  const renderApprovalBucket = (item: ApplicationSummary): string => {
    if (item.finalDecision === "REJECT") {
      return "Rejected";
    }
    if (item.finalDecision === "APPROVE" && item.stpEligible) {
      return "STP";
    }
    return "Checking Required";
  };

  return useMemo<DataTableColumn<ApplicationSummary>[]>(() => {
    const next: DataTableColumn<ApplicationSummary>[] = [
      {
        key: "applicationId",
        header: "Application ID",
        render: (item) => <span className="app-id-chip">{item.applicationId}</span>
      }
    ];

    if (activeStatus === "INTAKE_IN_PROGRESS" || activeStatus === "ENCODING_COMPLETED") {
      next.push(
        {
          key: "dealerEmailFrom",
          header: "Dealer Email (From)",
          render: (item) => item.dealerEmailFrom
        },
        {
          key: "documentCount",
          header: "Documents",
          render: (item) => item.documentCount
        },
        {
          key: "receivedAt",
          header: "Received Date/Time",
          render: (item) => formatIsoDate(item.receivedAt)
        }
      );
    }

    if (activeStatus === "INTAKE_IN_PROGRESS") {
      next.push({
        key: "status",
        header: "Status",
        render: (item) => renderLifecycleStatus(item.status, item.encodingStatus)
      });
    }

    if (activeStatus === "ENCODING_COMPLETED") {
      next.push(
        {
          key: "encodingStatus",
          header: "Encoding Status",
          render: (item) => renderEncodingStatus(item.encodingStatus)
        },
        {
          key: "extractedFieldCount",
          header: "Extracted Fields",
          render: (item) => item.extractedFieldCount ?? "-"
        }
      );
    }

    if (activeStatus === "DECISION_RUNNING") {
      next.push(
        {
          key: "decisionStatus",
          header: "Queue Status",
          render: (item) => renderDecisionStatus(item.decisionStatus)
        },
        {
          key: "decisionWorkflow",
          header: "Workflow",
          render: (item) => (
            <a
              className="queue-inline-link"
              href={`https://camunda.example.local/process/${item.applicationId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open Queue
            </a>
          )
        }
      );
    }

    if (activeStatus === "DECISION_COMPLETED") {
      next.push({
        key: "approvalBucket",
        header: "Approval Bucket",
        render: (item) => renderApprovalBucket(item)
      });
    }

    next.push({
      key: "lastUpdatedAt",
      header: "Updated",
      render: (item) => formatIsoDate(item.lastUpdatedAt)
    });
    return next;
  }, [activeStatus]);
}
