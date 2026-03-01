import type { ApplicationDetail } from "./types";
import { apiClientBase, type ApiConfig } from "./baseClient";

export const applicationApi = {
  getApplicationById(applicationId: string, config?: ApiConfig): Promise<ApplicationDetail> {
    return apiClientBase.getApplicationById(applicationId, config);
  }
};
