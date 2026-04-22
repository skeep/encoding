import type {
  ApplicationDetail,
  DecisionView,
  EncodingView,
  PaginatedApplications,
  PaginatedSalesApplications,
  QueueStatus,
  QueueSummary,
  SalesDashboardSnapshot,
  SalesPendingTask,
  SalesSupplementPayload,
  TimelineEvent
} from "./types";
import { mockHandlers } from "../mocks/handlers";

const MOCK_LATENCY_MS = 220;

export type ApiConfig = {
  failureRate?: number;
};

const defaultConfig: ApiConfig = {
  failureRate: 0
};

function withMockLatency<T>(operation: () => T, config: ApiConfig = defaultConfig): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const randomFail = Math.random() < (config.failureRate ?? 0);
    setTimeout(() => {
      if (randomFail) {
        reject(new Error("Mock API failure"));
        return;
      }
      try {
        resolve(operation());
      } catch (error) {
        reject(error);
      }
    }, MOCK_LATENCY_MS);
  });
}

export const apiClientBase = {
  getQueueSummary(config?: ApiConfig): Promise<QueueSummary[]> {
    return withMockLatency(() => mockHandlers.getQueueSummary(), config);
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
    return withMockLatency(() => mockHandlers.getApplications(params), config);
  },
  getApplicationById(applicationId: string, config?: ApiConfig): Promise<ApplicationDetail> {
    return withMockLatency(() => mockHandlers.getApplicationById(applicationId), config);
  },
  getEncodingView(applicationId: string, config?: ApiConfig): Promise<EncodingView> {
    return withMockLatency(() => mockHandlers.getEncodingView(applicationId), config);
  },
  getDecisionView(applicationId: string, config?: ApiConfig): Promise<DecisionView> {
    return withMockLatency(() => mockHandlers.getDecisionView(applicationId), config);
  },
  getTimeline(applicationId: string, config?: ApiConfig): Promise<TimelineEvent[]> {
    return withMockLatency(() => mockHandlers.getTimeline(applicationId), config);
  },
  getSalesApplications(
    params: {
      q?: string;
      page?: number;
      size?: number;
      dateFrom?: string | null;
      dateTo?: string | null;
    },
    config?: ApiConfig
  ): Promise<PaginatedSalesApplications> {
    return withMockLatency(() => mockHandlers.getSalesApplications(params), config);
  },
  getSalesDashboard(
    params: { q?: string; dateFrom?: string | null; dateTo?: string | null },
    config?: ApiConfig
  ): Promise<SalesDashboardSnapshot> {
    return withMockLatency(() => mockHandlers.getSalesDashboard(params), config);
  },
  getSalesTasks(applicationId: string, config?: ApiConfig): Promise<SalesPendingTask[]> {
    return withMockLatency(() => mockHandlers.getSalesTasks(applicationId), config);
  },
  submitSalesSupplement(
    applicationId: string,
    params: { taskId: string; payload: SalesSupplementPayload },
    config?: ApiConfig
  ): Promise<void> {
    return withMockLatency(() => {
      mockHandlers.submitSalesSupplement(applicationId, params);
    }, config);
  }
};
