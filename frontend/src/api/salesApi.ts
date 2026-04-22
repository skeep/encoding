import type {
  PaginatedSalesApplications,
  SalesDashboardSnapshot,
  SalesPendingTask,
  SalesSupplementPayload
} from "./types";
import { apiClientBase, type ApiConfig } from "./baseClient";

export const salesApi = {
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
    return apiClientBase.getSalesApplications(params, config);
  },
  getSalesDashboard(
    params: { q?: string; dateFrom?: string | null; dateTo?: string | null },
    config?: ApiConfig
  ): Promise<SalesDashboardSnapshot> {
    return apiClientBase.getSalesDashboard(params, config);
  },
  getSalesTasks(applicationId: string, config?: ApiConfig): Promise<SalesPendingTask[]> {
    return apiClientBase.getSalesTasks(applicationId, config);
  },
  submitSalesSupplement(
    applicationId: string,
    params: { taskId: string; payload: SalesSupplementPayload },
    config?: ApiConfig
  ): Promise<void> {
    return apiClientBase.submitSalesSupplement(applicationId, params, config);
  }
};
