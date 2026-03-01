import type { ApplicationStatus, ApplicationSummary, QueueStatus } from "../../../api/types";

export const statusLabels: Record<QueueStatus, string> = {
  INTAKE_IN_PROGRESS: "Intake & Encoding In Progress",
  ENCODING_COMPLETED: "Encoding Complete",
  DECISION_RUNNING: "Decision Running",
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

export function renderLifecycleStatus(
  appStatus: ApplicationStatus,
  encodingStatus: ApplicationSummary["encodingStatus"]
): string {
  if (appStatus === "EMAIL_RECEIVED") {
    return "Email Received";
  }
  if (appStatus === "ENCODING_IN_PROGRESS") {
    return encodingStatus === "IN_PROGRESS" ? "Encoding In Progress" : "Encoding In Queue";
  }
  return appStatus;
}
