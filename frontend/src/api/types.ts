export const queueStatuses = [
  "INTAKE_IN_PROGRESS",
  "ENCODING_COMPLETED",
  "DECISION_RUNNING",
  "DECISION_COMPLETED"
] as const;

export type QueueStatus = (typeof queueStatuses)[number];
export type ApplicationStatus =
  | "EMAIL_RECEIVED"
  | "ENCODING_IN_PROGRESS"
  | "DOCUMENT_REQUESTED"
  | "ENCODING_COMPLETED"
  | "DECISION_RUNNING"
  | "DECISION_COMPLETED"
  | "LOAN_DISBURSED";

export type QueueSummary = {
  status: QueueStatus;
  count: number;
  stale: boolean;
};

export type ApplicationSummary = {
  applicationId: string;
  status: ApplicationStatus;
  applicantName: string;
  product: string;
  market: "Philippines";
  dealerEmailFrom: string;
  documentCount: number;
  encodingStatus?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  decisionStatus?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  finalDecision?: "APPROVE" | "REJECT" | "REFER";
  riskScore?: number;
  riskGrade?: string;
  policyVersion?: string;
  stpEligible?: boolean;
  extractedFieldCount?: number;
  averageFieldConfidence?: number;
  receivedAt: string;
  lastUpdatedAt: string;
  slaAgeMinutes: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  riskFlag?: "NONE" | "MEDIUM" | "HIGH";
};

export type PaginatedApplications = {
  items: ApplicationSummary[];
  page: number;
  size: number;
  total: number;
};

export type SalesSupplementPayload = Record<string, string>;

export type SalesPendingTaskSource = "ENCODER" | "CREDIT";

export type SalesPendingTask = {
  id: string;
  title: string;
  body: string;
  source: SalesPendingTaskSource;
  createdAt: string;
  fieldsRequested?: string[];
};

export type SalesQueueRow = ApplicationSummary & {
  pendingTaskCount: number;
};

export type PaginatedSalesApplications = {
  items: SalesQueueRow[];
  page: number;
  size: number;
  total: number;
};

export type SalesStatusBreakdownItem = {
  status: ApplicationStatus;
  count: number;
};

export type SalesDealerBreakdownRow = {
  dealerEmail: string;
  count: number;
  byStatus: Partial<Record<ApplicationStatus, number>>;
};

export type SalesDashboardSnapshot = {
  dateFrom: string | null;
  dateTo: string | null;
  distinctDealerCount: number;
  totalOpenApplications: number;
  byStatus: SalesStatusBreakdownItem[];
  byDealer: SalesDealerBreakdownRow[];
};

export type ApplicationDetail = {
  applicationId: string;
  status: ApplicationStatus;
  applicantName: string;
  receivedAt: string;
  updatedAt: string;
  emailSubject: string;
  emailFrom: string;
  attachments: Array<{ name: string; mimeType: string; sizeKb: number }>;
  metadata: Record<string, string>;
};

export type SourceTrace = {
  documentName: string;
  page: number;
  location: string;
};

export type TransformationStep = {
  step: string;
  input: string;
  output: string;
  rationale: string;
};

export type TriangulationCandidate = {
  source: string;
  value: string;
  confidence: number;
  selected: boolean;
  reason: string;
};

export type EncodingFieldView = {
  fieldName: string;
  extractedValue: string;
  confidence: number;
  sourceTrace: SourceTrace;
  originalOcrValue: string;
  transformationLog: TransformationStep[];
  triangulation?: {
    selectedValue: string;
    selectionReason: string;
    candidates: TriangulationCandidate[];
  };
};

export type EncodingView = {
  applicationId: string;
  documentPreview: Array<{ name: string; pages: number; type: string }>;
  fields: EncodingFieldView[];
};

export type RuleResult = {
  ruleId: string;
  ruleName?: string;
  description: string;
  inputValues: Record<string, string>;
  inputValue?: string;
  outputValue?: string;
  executionStatus?: "PASSED" | "FAILED" | "REJECTED" | "NOT_EXECUTED" | "SKIPPED";
  isPrimaryCause?: boolean;
  conditionEvaluated: string;
  passed: boolean;
  explanation: string;
  impact: string;
};

export type DecisionView = {
  applicationId: string;
  summary: {
    finalDecision: "APPROVE" | "REJECT" | "REFER";
    riskScore: number;
    riskGrade: string;
    policyVersion: string;
    stpEligible: boolean;
  };
  rules: RuleResult[];
  creditMemo: string;
};

export type TimelineEvent = {
  eventId: string;
  timestamp: string;
  actor: string;
  type: string;
  description: string;
};
