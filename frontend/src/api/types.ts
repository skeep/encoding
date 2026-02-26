export const queueStatuses = [
  "EMAIL_RECEIVED",
  "ENCODING_QUEUED",
  "ENCODING_RUNNING",
  "ENCODING_COMPLETED",
  "DECISION_QUEUED",
  "DECISION_RUNNING",
  "DECISION_COMPLETED"
] as const;

export type QueueStatus = (typeof queueStatuses)[number];

export type QueueSummary = {
  status: QueueStatus;
  count: number;
  stale: boolean;
};

export type ApplicationSummary = {
  applicationId: string;
  status: QueueStatus;
  applicantName: string;
  product: string;
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

export type ApplicationDetail = {
  applicationId: string;
  status: QueueStatus;
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
  description: string;
  inputValues: Record<string, string>;
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
