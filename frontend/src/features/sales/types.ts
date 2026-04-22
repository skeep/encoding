import type { ApplicationDetail, SalesPendingTask } from "../../api/types";

export type SalesDetailPanelState = {
  detail?: ApplicationDetail;
  tasks?: SalesPendingTask[];
  loading: boolean;
  error?: string;
};
