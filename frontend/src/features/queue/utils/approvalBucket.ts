import type { ApplicationSummary } from "../../../api/types";

export function getApprovalBucket(item: Pick<ApplicationSummary, "finalDecision" | "stpEligible">): string {
  if (item.finalDecision === "REJECT") {
    return "Rejected";
  }
  if (item.finalDecision === "APPROVE" && item.stpEligible) {
    return "STP";
  }
  return "Human Review Needed";
}
