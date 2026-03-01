import type { DecisionView } from "./types";
import { apiClientBase, type ApiConfig } from "./baseClient";

export const decisionApi = {
  getDecisionView(applicationId: string, config?: ApiConfig): Promise<DecisionView> {
    return apiClientBase.getDecisionView(applicationId, config);
  }
};
