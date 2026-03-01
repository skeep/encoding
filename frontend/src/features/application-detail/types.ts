import type { ApplicationDetail, DecisionView, EncodingView } from "../../api/types";

export type DetailPanelState = {
  detail?: ApplicationDetail;
  encoding?: EncodingView;
  decision?: DecisionView;
  loading: boolean;
  error?: string;
};

export type ChangedRow = {
  fieldPath: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
};
