import type { ApplicationStatus, ApplicationSummary, QueueStatus } from "../../../api/types";

export const statusLabels: Record<QueueStatus, string> = {
  INTAKE_IN_PROGRESS: "Encoding Queue",
  ENCODING_COMPLETED: "Encoding Completed",
  DECISION_RUNNING: "Decision Queue",
  DECISION_COMPLETED: "Decision Completed"
};

export function renderEncodingStatus(value: ApplicationSummary["encodingStatus"]): string {
  if (value === "IN_QUEUE") {
    return "In Queue";
  }
  if (value === "IN_PROGRESS") {
    return "In Progress";
  }
  if (value === "COMPLETED") {
    return "Completed";
  }
  return "-";
}

export function renderDecisionStatus(value: ApplicationSummary["decisionStatus"]): string {
  if (value === "COMPLETED") {
    return "Completed";
  }
  if (value === "IN_QUEUE") {
    return "In Queue";
  }
  if (value === "IN_PROGRESS") {
    return "Running";
  }
  return "Received";
}

export function renderLifecycleStatus(
  appStatus: ApplicationStatus,
  encodingStatus: ApplicationSummary["encodingStatus"]
): string {
  if (appStatus === "EMAIL_RECEIVED") {
    return "Email Received";
  }
  if (appStatus === "DOCUMENT_REQUESTED") {
    return "Document Requested";
  }
  if (appStatus === "ENCODING_IN_PROGRESS") {
    return encodingStatus === "IN_PROGRESS" ? "Encoding In Progress" : "Encoding In Queue";
  }
  return appStatus;
}

export function renderSalesPipelineStatus(item: ApplicationSummary): string {
  switch (item.status) {
    case "EMAIL_RECEIVED":
      return "Email Received";
    case "DOCUMENT_REQUESTED":
      return "Document Requested";
    case "ENCODING_IN_PROGRESS":
      return item.encodingStatus === "IN_PROGRESS" ? "Encoding In Progress" : "Encoding In Queue";
    case "ENCODING_COMPLETED":
      return "Encoding Completed";
    case "DECISION_RUNNING":
      return renderDecisionStatus(item.decisionStatus);
    case "DECISION_COMPLETED":
      return "Decision Completed";
    case "LOAN_DISBURSED":
      return "Loan Disbursed";
    default:
      return item.status;
  }
}
