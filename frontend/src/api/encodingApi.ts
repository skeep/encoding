import type { EncodingView } from "./types";
import { apiClientBase, type ApiConfig } from "./baseClient";

export const encodingApi = {
  getEncodingView(applicationId: string, config?: ApiConfig): Promise<EncodingView> {
    return apiClientBase.getEncodingView(applicationId, config);
  }
};
