import type { QueueStatus } from "../../../api/types";

export type FilterField = "applicationId" | "dealerEmailFrom";

export type IntakeStatusFilter = "ALL" | "ENCODING_IN_PROGRESS" | "ENCODING_IN_QUEUE" | "EMAIL_RECEIVED";

export type QueueTableFeatureConfig = {
  showFilters: boolean;
  showFieldFilter: boolean;
  showIntakeStatusFilter: boolean;
  showPagination: boolean;
  showRowsPerPage: boolean;
  stickyHeader: boolean;
  scrollBody: boolean;
  fieldFilterOptions: FilterField[];
  pageSizeOptions: number[];
};

export const defaultQueueTableFeatures: QueueTableFeatureConfig = {
  showFilters: true,
  showFieldFilter: true,
  showIntakeStatusFilter: false,
  showPagination: true,
  showRowsPerPage: true,
  stickyHeader: true,
  scrollBody: true,
  fieldFilterOptions: ["applicationId", "dealerEmailFrom"],
  pageSizeOptions: [10, 20, 40, 50]
};

export const queueTableFeaturesByStatus: Record<QueueStatus, QueueTableFeatureConfig> = {
  INTAKE_IN_PROGRESS: {
    ...defaultQueueTableFeatures,
    showIntakeStatusFilter: true,
    fieldFilterOptions: ["applicationId", "dealerEmailFrom"]
  },
  ENCODING_COMPLETED: {
    ...defaultQueueTableFeatures,
    showIntakeStatusFilter: false,
    fieldFilterOptions: ["applicationId", "dealerEmailFrom"]
  },
  DECISION_RUNNING: {
    ...defaultQueueTableFeatures,
    showIntakeStatusFilter: false,
    fieldFilterOptions: ["applicationId"]
  },
  DECISION_COMPLETED: {
    ...defaultQueueTableFeatures,
    showIntakeStatusFilter: false,
    fieldFilterOptions: ["applicationId"]
  }
};
