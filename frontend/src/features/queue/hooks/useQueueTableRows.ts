import { useMemo } from "react";

import type { ApplicationSummary, QueueStatus } from "../../../api/types";
import { renderLifecycleStatus } from "../utils/statusFormatters";
import { getApprovalBucket } from "../utils/approvalBucket";
import type { ApprovalBucketFilter, FilterField, IntakeStatusFilter } from "../types/tableFeatures";

function getIntakeStatusRank(status: string): number {
  if (status === "Encoding In Progress") {
    return 0;
  }
  if (status === "Document Requested") {
    return 0.5;
  }
  if (status === "Encoding In Queue") {
    return 1;
  }
  if (status === "Email Received") {
    return 2;
  }
  return 3;
}

export function useQueueTableRows(params: {
  rows: ApplicationSummary[];
  activeStatus: QueueStatus;
  filterField: FilterField;
  filterValue: string;
  intakeStatusFilter: IntakeStatusFilter;
  approvalBucketFilter: ApprovalBucketFilter;
}): ApplicationSummary[] {
  const { rows, activeStatus, filterField, filterValue, intakeStatusFilter, approvalBucketFilter } = params;

  return useMemo(() => {
    const query = filterValue.trim().toLowerCase();
    const filteredByField = query
      ? rows.filter((row) => String(row[filterField] ?? "").toLowerCase().includes(query))
      : rows;

    if (activeStatus === "DECISION_COMPLETED" && approvalBucketFilter !== "ALL") {
      const next = filteredByField.filter((row) => {
        const bucket = getApprovalBucket(row);
        if (approvalBucketFilter === "STP") {
          return bucket === "STP";
        }
        if (approvalBucketFilter === "REJECTED") {
          return bucket === "Rejected";
        }
        return bucket === "Human Review Needed";
      });
      return next;
    }

    if (activeStatus !== "INTAKE_IN_PROGRESS") {
      return filteredByField;
    }

    const filteredByStatus =
      intakeStatusFilter === "ALL"
        ? filteredByField
        : filteredByField.filter((row) => {
            if (intakeStatusFilter === "EMAIL_RECEIVED") {
              return row.status === "EMAIL_RECEIVED";
            }
            if (row.status !== "ENCODING_IN_PROGRESS") {
              return false;
            }
            if (intakeStatusFilter === "ENCODING_IN_PROGRESS") {
              return row.encodingStatus === "IN_PROGRESS";
            }
            return row.encodingStatus === "IN_QUEUE";
          });

    return [...filteredByStatus].sort((left, right) => {
      const leftRank = getIntakeStatusRank(renderLifecycleStatus(left.status, left.encodingStatus));
      const rightRank = getIntakeStatusRank(renderLifecycleStatus(right.status, right.encodingStatus));
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.applicationId.localeCompare(right.applicationId);
    });
  }, [activeStatus, approvalBucketFilter, filterField, filterValue, intakeStatusFilter, rows]);
}
