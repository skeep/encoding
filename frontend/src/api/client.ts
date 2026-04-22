import { applicationApi } from "./applicationApi";
import { decisionApi } from "./decisionApi";
import { encodingApi } from "./encodingApi";
import { queueApi } from "./queueApi";
import { salesApi } from "./salesApi";
import { apiClientBase, type ApiConfig } from "./baseClient";

// Backward-compatible aggregate client while features migrate to scoped APIs.
export const apiClient = {
  ...queueApi,
  ...applicationApi,
  ...encodingApi,
  ...decisionApi,
  ...salesApi,
  getTimeline: apiClientBase.getTimeline
};

export type { ApiConfig };
