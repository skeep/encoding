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
        },
        {
          key: "averageFieldConfidence",
          header: "Avg Confidence",
          render: (item) =>
            typeof item.averageFieldConfidence === "number"
              ? `${Math.round(item.averageFieldConfidence * 100)}%`
              : "-"
        }
      );
    }

    if (activeStatus === "DECISION_RUNNING" || activeStatus === "DECISION_COMPLETED") {
      next.push(
        {
          key: "decisionStatus",
          header: "Decision Status",
          render: (item) => renderDecisionStatus(item.decisionStatus)
        },
        {
          key: "riskScore",
          header: "Risk Score",
          render: (item) => (typeof item.riskScore === "number" ? item.riskScore.toFixed(2) : "-")
        },
        {
          key: "riskGrade",
          header: "Risk Grade",
          render: (item) => item.riskGrade ?? "-"
        },
        {
          key: "policyVersion",
          header: "Policy Version",
          render: (item) => item.policyVersion ?? "-"
        },
        {
          key: "stpEligible",
          header: "STP",
          render: (item) =>
            typeof item.stpEligible === "boolean" ? (item.stpEligible ? "Yes" : "No") : "-"
        }
      );
    }

    if (activeStatus === "DECISION_COMPLETED") {
      next.push({
        key: "finalDecision",
        header: "Final Decision",
        render: (item) => item.finalDecision ?? "-"
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
