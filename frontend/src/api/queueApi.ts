import type { PaginatedApplications, QueueStatus, QueueSummary } from "./types";
import { apiClientBase, type ApiConfig } from "./baseClient";

export const queueApi = {
  getQueueSummary(config?: ApiConfig): Promise<QueueSummary[]> {
    return apiClientBase.getQueueSummary(config);
  },
  getApplications(
    params: {
      status: QueueStatus;
      q?: string;
      page?: number;
      size?: number;
    },
    config?: ApiConfig
  ): Promise<PaginatedApplications> {
    return apiClientBase.getApplications(params, config);
  }
};
