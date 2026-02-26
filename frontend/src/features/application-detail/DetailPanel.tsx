import type { ApplicationDetail, DecisionView, EncodingView, QueueStatus } from "../../api/types";
import { formatIsoDate, formatPercent } from "../../app/formatters";

export type DetailPanelState = {
  detail?: ApplicationDetail;
  encoding?: EncodingView;
  decision?: DecisionView;
  loading: boolean;
  error?: string;
};

const statusLabels: Record<QueueStatus, string> = {
  EMAIL_RECEIVED: "Email Received",
  ENCODING_IN_PROGRESS: "Encoding In Progress",
  ENCODING_COMPLETED: "Encoding Completed",
  DECISION_QUEUED: "Decision Queued",
  DECISION_RUNNING: "Decision Running",
  DECISION_COMPLETED: "Decision Completed"
};

function getAttachmentBadge(mimeType: string, fileName: string): string {
  const lowerMime = mimeType.toLowerCase();
  const lowerFile = fileName.toLowerCase();
  if (lowerMime.includes("image/") || /\.(png|jpg|jpeg|gif|webp)$/.test(lowerFile)) {
    return "IMG";
  }
  if (lowerMime.includes("pdf") || lowerFile.endsWith(".pdf")) {
    return "PDF";
  }
  if (
    lowerMime.includes("word") ||
    lowerMime.includes("document") ||
    /\.(doc|docx)$/.test(lowerFile)
  ) {
    return "DOC";
  }
  if (
    lowerMime.includes("sheet") ||
    lowerMime.includes("excel") ||
    /\.(xls|xlsx|csv)$/.test(lowerFile)
  ) {
    return "XLS";
  }
  return "FILE";
}

function buildAttachmentPreviewUrl(fileName: string, mimeType: string, sizeKb: number): string {
  const safeName = fileName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeMime = mimeType.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; max-width: 600px; }
          .meta { color: #475569; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Mock Attachment Preview</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p class="meta"><strong>Type:</strong> ${safeMime}</p>
          <p class="meta"><strong>Size:</strong> ${sizeKb} KB</p>
          <p class="meta">This is a mock preview tab for frontend-only development.</p>
        </div>
      </body>
    </html>
  `;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function DetailPanel(props: {
  activeStatus: QueueStatus;
  selectedAppId: string | null;
  state: DetailPanelState;
}): JSX.Element {
  const { activeStatus, selectedAppId, state } = props;
  if (!selectedAppId) {
    return <div className="state-box">Select an application to view details.</div>;
  }
  if (state.loading) {
    return <div className="state-box">Loading application details...</div>;
  }
  if (state.error) {
    return <div className="state-box error-box">{state.error}</div>;
  }
  if (!state.detail) {
    return <div className="state-box">No details available.</div>;
  }

  return (
    <div className="detail-content">
      <section className="detail-section">
        <h3>Overview</h3>
        <p>
          <strong>Applicant:</strong> {state.detail.applicantName}
        </p>
        <p>
          <strong>Status:</strong> {statusLabels[state.detail.status]}
        </p>
        <p>
          <strong>Received:</strong> {formatIsoDate(state.detail.receivedAt)}
        </p>
        <p>
          <strong>Email:</strong> {state.detail.emailFrom}
        </p>
      </section>

      <section className="detail-section">
        <h3>Attachments</h3>
        <ol className="attachment-list">
          {state.detail.attachments.map((attachment) => (
            <li key={attachment.name}>
              <a
                className="attachment-link"
                href={buildAttachmentPreviewUrl(attachment.name, attachment.mimeType, attachment.sizeKb)}
                target="_blank"
                rel="noreferrer"
              >
                <span className="attachment-badge">
                  {getAttachmentBadge(attachment.mimeType, attachment.name)}
                </span>
                <span>{attachment.name}</span>
              </a>
              <span className="attachment-meta">
                ({attachment.mimeType}, {attachment.sizeKb} KB)
              </span>
            </li>
          ))}
        </ol>
      </section>

      {activeStatus === "ENCODING_COMPLETED" && state.encoding ? (
        <section className="detail-section">
          <h3>Encoding Completed</h3>
          <p className="muted-text">Document Viewer (placeholder) and extracted structured fields</p>
          {state.encoding.fields.map((field) => (
            <article key={field.fieldName} className="field-card">
              <h4>{field.fieldName}</h4>
              <p>
                <strong>Extracted Value:</strong> {field.extractedValue}
              </p>
              <p>
                <strong>Confidence:</strong> {formatPercent(field.confidence)}
              </p>
              <p>
                <strong>Source:</strong> {field.sourceTrace.documentName} p{field.sourceTrace.page} (
                {field.sourceTrace.location})
              </p>
              <p>
                <strong>Original OCR:</strong> {field.originalOcrValue}
              </p>
              <div>
                <strong>Transformation Log</strong>
                <ul>
                  {field.transformationLog.map((step) => (
                    <li key={`${field.fieldName}-${step.step}-${step.output}`}>
                      {step.step}: {step.input} → {step.output} ({step.rationale})
                    </li>
                  ))}
                </ul>
              </div>
              {field.triangulation ? (
                <div>
                  <strong>Triangulation</strong>
                  <p>
                    Selected: {field.triangulation.selectedValue} ({field.triangulation.selectionReason})
                  </p>
                  <ul>
                    {field.triangulation.candidates.map((candidate) => (
                      <li key={`${field.fieldName}-${candidate.source}-${candidate.value}`}>
                        {candidate.source}: {candidate.value}, conf {formatPercent(candidate.confidence)}{" "}
                        [{candidate.selected ? "selected" : "rejected"}] - {candidate.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {activeStatus === "DECISION_COMPLETED" && state.decision ? (
        <section className="detail-section">
          <h3>Decision Completed</h3>
          <p>
            <strong>Decision:</strong> {state.decision.summary.finalDecision}
          </p>
          <p>
            <strong>Risk Score:</strong> {state.decision.summary.riskScore}
          </p>
          <p>
            <strong>Risk Grade:</strong> {state.decision.summary.riskGrade}
          </p>
          <p>
            <strong>Policy Version:</strong> {state.decision.summary.policyVersion}
          </p>
          <p>
            <strong>STP Eligible:</strong> {state.decision.summary.stpEligible ? "Yes" : "No"}
          </p>
          <h4>Rule Matrix</h4>
          <div className="rule-matrix">
            {state.decision.rules.map((rule) => (
              <article key={rule.ruleId} className="rule-card">
                <p>
                  <strong>{rule.ruleId}</strong> - {rule.description}
                </p>
                <p>
                  <strong>Condition:</strong> {rule.conditionEvaluated}
                </p>
                <p>
                  <strong>Outcome:</strong> {rule.passed ? "Passed" : "Failed"}
                </p>
                <p>
                  <strong>Explanation:</strong> {rule.explanation}
                </p>
                <p>
                  <strong>Impact:</strong> {rule.impact}
                </p>
              </article>
            ))}
          </div>
          <h4>Credit Memo</h4>
          <p>{state.decision.creditMemo}</p>
        </section>
      ) : null}

      {activeStatus === "DECISION_RUNNING" ? (
        <section className="detail-section">
          <h3>Decision Running</h3>
          <p>Camunda task: TASK-20391 (mock)</p>
          <p>Redirect URL: https://camunda.example/tasks/TASK-20391</p>
        </section>
      ) : null}
    </div>
  );
}
