import type { QueueTableFeatureConfig } from "../queue/types/tableFeatures";
import { defaultQueueTableFeatures } from "../queue/types/tableFeatures";

export const salesQueueTableFeatures: QueueTableFeatureConfig = {
  ...defaultQueueTableFeatures,
  showIntakeStatusFilter: false,
  showApprovalBucketFilter: false,
  fieldFilterOptions: ["applicationId", "dealerEmailFrom"]
};
