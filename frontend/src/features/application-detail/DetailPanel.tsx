import { useEffect, useMemo, useState } from "react";

import type {
  ApplicationDetail,
  ApplicationStatus,
  DecisionView,
  EncodingView,
  QueueStatus
} from "../../api/types";
import { formatIsoDate } from "../../app/formatters";
import samplePostEncoding from "../../../sample/sample_post_encoding.json";

export type DetailPanelState = {
  detail?: ApplicationDetail;
  encoding?: EncodingView;
  decision?: DecisionView;
  loading: boolean;
  error?: string;
};

const statusLabels: Record<ApplicationStatus, string> = {
  EMAIL_RECEIVED: "Email Received",
  ENCODING_IN_PROGRESS: "Encoding In Progress",
  ENCODING_COMPLETED: "Encoding Completed",
  DECISION_RUNNING: "Decision Running",
  DECISION_COMPLETED: "Decision Completed"
};

type ScalarValue = string | number | boolean | null;

type EditableField = {
  path: string;
  label: string;
  value: ScalarValue;
};

type EditorTarget = {
  id: string;
  sectionKey: string;
  sectionLabel: string;
  itemLabel: string;
  isRepeatable: boolean;
  instanceId?: string;
  fields: EditableField[];
};

type FieldScoringMeta = {
  field_id: string;
  raw_value: string;
  normalized_value: string | number | null;
  field_score: number;
  status: "passed" | "failed";
  component_scores: {
    ocr: number;
    format: number;
    statistical: number;
    cross_field: number;
  };
  details: string[];
  rule_outputs: Array<{
    rule_name: string;
    score: number;
    passed: boolean;
    details: string;
    applicable: boolean;
  }>;
};

function flattenObjectFields(input: unknown, prefix = ""): EditableField[] {
  if (Array.isArray(input)) {
    return [];
  }
  if (input === null || typeof input !== "object") {
    return [];
  }
  const result: EditableField[] = [];
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result.push({ path: nextPath, label: nextPath, value });
      return;
    }
    if (Array.isArray(value)) {
      return;
    }
    result.push(...flattenObjectFields(value, nextPath));
  });
  return result;
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function startsWithSectionLabel(itemLabel: string, sectionLabel: string): boolean {
  return itemLabel.toLowerCase().startsWith(sectionLabel.toLowerCase());
}

function buildEditorTargets(input: unknown): EditorTarget[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return [];
  }

  const targets: EditorTarget[] = [];
  Object.entries(input as Record<string, unknown>).forEach(([sectionKey, sectionValue]) => {
    const sectionLabel = humanizeKey(sectionKey);
    if (Array.isArray(sectionValue)) {
      if (sectionValue.length === 0) {
        targets.push({
          id: `${sectionKey}::empty`,
          sectionKey,
          sectionLabel,
          itemLabel: `${sectionLabel} (0)`,
          isRepeatable: true,
          fields: []
        });
        return;
      }
      sectionValue.forEach((entry, index) => {
        const basePath = `${sectionKey}[${index}]`;
        let fields: EditableField[] = [];
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          fields = flattenObjectFields(entry, "").map((field) => ({
            ...field,
            path: `${basePath}.${field.path}`,
            label: field.label
          }));
        } else {
          fields = [
            {
              path: basePath,
              label: "value",
              value: entry as ScalarValue
            }
          ];
        }
        targets.push({
          id: `${sectionKey}::${index}`,
          sectionKey,
          sectionLabel,
          itemLabel: `#${index + 1}`,
          isRepeatable: true,
          instanceId: `${sectionKey}_${index + 1}`,
          fields
        });
      });
      return;
    }

    if (sectionValue && typeof sectionValue === "object") {
      const fields = flattenObjectFields(sectionValue, "").map((field) => ({
        ...field,
        path: `${sectionKey}.${field.path}`,
        label: field.label
      }));
      targets.push({
        id: `${sectionKey}::single`,
        sectionKey,
        sectionLabel,
        itemLabel: sectionLabel,
        isRepeatable: false,
        fields
      });
      return;
    }

    targets.push({
      id: `${sectionKey}::single`,
      sectionKey,
      sectionLabel,
      itemLabel: sectionLabel,
      isRepeatable: false,
      fields: [
        {
          path: sectionKey,
          label: sectionKey,
          value: sectionValue as ScalarValue
        }
      ]
    });
  });

  return targets;
}

function normalizeValue(value: string): string | number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const numeric = Number(trimmed.replace(/,/g, ""));
  if (!Number.isNaN(numeric) && trimmed !== "true" && trimmed !== "false") {
    return numeric;
  }
  return trimmed;
}

function buildScoringMeta(path: string, value: string): FieldScoringMeta {
  const normalized = normalizeValue(value);
  const looksNumeric = typeof normalized === "number";
  const baseScore = path.includes("income") || path.includes("amount") ? 0.95 : 0.91;
  return {
    field_id: path,
    raw_value: value,
    normalized_value: normalized,
    field_score: baseScore,
    status: "passed",
    component_scores: {
      ocr: 0.93,
      format: looksNumeric ? 1 : 0.98,
      statistical: looksNumeric ? 0.94 : 0.9,
      cross_field: 1
    },
    details: [
      "type_check passed; bounds/format checks passed",
      "z=0.2637, z_cap=4.0",
      "2 applicable cross-field rules evaluated"
    ],
    rule_outputs: [
      {
        rule_name: "value_present",
        score: 1,
        passed: true,
        details: `${path} has non-empty extracted value`,
        applicable: true
      },
      {
        rule_name: "cross_field_consistency",
        score: 1,
        passed: true,
        details: "No cross-field inconsistencies detected",
        applicable: true
      }
    ]
  };
}

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

function getAttachmentTypeLabel(mimeType: string, fileName: string): string {
  const badge = getAttachmentBadge(mimeType, fileName);
  if (badge === "IMG") {
    return "Image";
  }
  if (badge === "PDF") {
    return "PDF";
  }
  if (badge === "DOC") {
    return "Document";
  }
  if (badge === "XLS") {
    return "Spreadsheet";
  }
  return "File";
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

function AttachmentList(props: { detail: ApplicationDetail; compact?: boolean }): JSX.Element {
  const { detail, compact = false } = props;
  if (compact) {
    return (
      <ol className="attachment-list attachment-list-compact">
        {detail.attachments.map((attachment) => (
          <li key={attachment.name}>
            <a
              className="attachment-link attachment-link-compact"
              href={buildAttachmentPreviewUrl(attachment.name, attachment.mimeType, attachment.sizeKb)}
              target="_blank"
              rel="noreferrer"
              title={`${attachment.name} (${attachment.mimeType}, ${attachment.sizeKb} KB)`}
            >
              <span className="attachment-badge">{getAttachmentBadge(attachment.mimeType, attachment.name)}</span>
              <span className="attachment-name">{attachment.name}</span>
              <span className="attachment-meta-inline">
                {getAttachmentTypeLabel(attachment.mimeType, attachment.name)} • {attachment.sizeKb} KB
              </span>
            </a>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className="attachment-list">
      {detail.attachments.map((attachment) => (
        <li key={attachment.name}>
          <a
            className="attachment-link"
            href={buildAttachmentPreviewUrl(attachment.name, attachment.mimeType, attachment.sizeKb)}
            target="_blank"
            rel="noreferrer"
          >
            <span className="attachment-badge">{getAttachmentBadge(attachment.mimeType, attachment.name)}</span>
            <span>{attachment.name}</span>
          </a>
          <span className="attachment-meta">
            ({attachment.mimeType}, {attachment.sizeKb} KB)
          </span>
        </li>
      ))}
    </ol>
  );
}

export function DetailPanel(props: {
  activeStatus: QueueStatus;
  selectedAppId: string | null;
  state: DetailPanelState;
}): JSX.Element {
  const { activeStatus, selectedAppId, state } = props;
  const editorTargets = useMemo(() => buildEditorTargets(samplePostEncoding), []);
  const [editableValues, setEditableValues] = useState<Record<string, string>>({});
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [openMetaFieldPath, setOpenMetaFieldPath] = useState<string | null>(null);

  useEffect(() => {
    const initialValues: Record<string, string> = {};
    editorTargets.forEach((target) => {
      target.fields.forEach((field) => {
        initialValues[field.path] = field.value === null ? "" : String(field.value);
      });
    });
    setEditableValues(initialValues);
    setFeedbackNotes({});
    setSaveMessage("");
    setOpenMetaFieldPath(null);
    setSelectedTargetId(editorTargets[0]?.id ?? "");
  }, [selectedAppId, activeStatus, editorTargets]);

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

  const baselineValues = editorTargets.reduce<Record<string, string>>((acc, target) => {
    target.fields.forEach((field) => {
      acc[field.path] = field.value === null ? "" : String(field.value);
    });
    return acc;
  }, {});
  const changedFields = Object.keys(editableValues).filter(
    (path) => editableValues[path] !== baselineValues[path]
  );
  const feedbackPayload = changedFields.map((path) => ({
    application_id: selectedAppId,
    field_path: path,
    old_value: baselineValues[path],
    new_value: editableValues[path],
    feedback_type: "extraction_incorrect",
    analyst_feedback: feedbackNotes[path] ?? "",
    prompt_improvement_required: true,
    captured_at: new Date().toISOString()
  }));
  const selectedTarget = editorTargets.find((target) => target.id === selectedTargetId) ?? editorTargets[0];
  const isEncodingCompletedView = activeStatus === "ENCODING_COMPLETED" && !!state.encoding;

  return (
    <div className="detail-content">
      {!isEncodingCompletedView ? (
        <>
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
            <AttachmentList detail={state.detail} />
          </section>
        </>
      ) : null}

      {isEncodingCompletedView && state.encoding ? (
        <section className="detail-section encoding-detail-section">
          <div className="encoding-workbench">
            <div className="encoding-field-list">
              {editorTargets.map((target) => {
                const hasChanges = target.fields.some(
                  (field) => (editableValues[field.path] ?? "") !== (baselineValues[field.path] ?? "")
                );
                const menuLabel = target.isRepeatable
                  ? startsWithSectionLabel(target.itemLabel, target.sectionLabel)
                    ? target.itemLabel
                    : `${target.sectionLabel} ${target.itemLabel}`
                  : target.sectionLabel;
                return (
                  <button
                    key={target.id}
                    type="button"
                    className={`encoding-field-item ${selectedTarget?.id === target.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedTargetId(target.id);
                      setOpenMetaFieldPath(null);
                    }}
                  >
                    <span>{menuLabel}</span>
                    {hasChanges ? <em>changed</em> : null}
                    <span className="menu-item-chevron" aria-hidden="true">
                      ›
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="encoding-field-editor">
              {selectedTarget ? (
                <article className="field-card analyst-field-card">
                  <h4>
                    {selectedTarget.sectionLabel}
                    {selectedTarget.isRepeatable ? ` ${selectedTarget.itemLabel}` : ""}
                  </h4>

                  {selectedTarget.fields.length === 0 ? (
                    <p className="muted-text">No extracted rows for this section.</p>
                  ) : (
                    <div className="nested-field-table">
                      {selectedTarget.fields.map((field) => {
                        const currentValue = editableValues[field.path] ?? "";
                        const previousValue = baselineValues[field.path] ?? "";
                        const fieldChanged = currentValue !== previousValue;
                        const meta = buildScoringMeta(field.path, currentValue);
                        const isMetaOpen = openMetaFieldPath === field.path;
                        const confidenceLabel = `${Math.round(meta.field_score * 100)}%`;
                        return (
                          <div
                            key={field.path}
                            className={`nested-field-row ${fieldChanged ? "field-changed" : ""}`}
                          >
                            <div className="field-row-main">
                              <button
                                type="button"
                                className="field-confidence-button"
                                onClick={() =>
                                  setOpenMetaFieldPath((prev) => (prev === field.path ? null : field.path))
                                }
                                aria-label={`Show confidence details for ${field.label}`}
                              >
                                {confidenceLabel}
                              </button>
                              <span className="nested-field-name">{field.label}</span>
                              <input
                                className="analyst-input"
                                value={currentValue}
                                onChange={(event) =>
                                  setEditableValues((prev) => ({
                                    ...prev,
                                    [field.path]: event.target.value
                                  }))
                                }
                              />
                            </div>

                            {isMetaOpen ? (
                              <div className="field-meta-popover">
                                <div className="field-meta-grid">
                                  <div className="field-meta-label">field_id</div>
                                  <div className="field-meta-value">{meta.field_id}</div>

                                  <div className="field-meta-label">raw_value</div>
                                  <div className="field-meta-value">{meta.raw_value || "<empty>"}</div>

                                  <div className="field-meta-label">normalized_value</div>
                                  <div className="field-meta-value">
                                    {meta.normalized_value === null ? "<null>" : String(meta.normalized_value)}
                                  </div>

                                  <div className="field-meta-label">field_score</div>
                                  <div className="field-meta-value">{meta.field_score}</div>

                                  <div className="field-meta-label">status</div>
                                  <div className="field-meta-value">{meta.status}</div>

                                  <div className="field-meta-label">component_scores</div>
                                  <div className="field-meta-value">
                                    ocr={meta.component_scores.ocr}, format={meta.component_scores.format},
                                    statistical={meta.component_scores.statistical}, cross_field=
                                    {meta.component_scores.cross_field}
                                  </div>

                                  <div className="field-meta-label">details</div>
                                  <div className="field-meta-value">{meta.details.join(" | ")}</div>

                                  <div className="field-meta-label">rule_outputs</div>
                                  <div className="field-meta-value">
                                    {meta.rule_outputs.map((rule) => rule.rule_name).join(", ")}
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {fieldChanged ? (
                              <label className="analyst-input-label">
                                <span>Feedback for Prompt Improvement</span>
                                <textarea
                                  className="analyst-textarea"
                                  placeholder="Why extraction was incorrect and how prompt should improve..."
                                  value={feedbackNotes[field.path] ?? ""}
                                  onChange={(event) =>
                                    setFeedbackNotes((prev) => ({
                                      ...prev,
                                      [field.path]: event.target.value
                                    }))
                                  }
                                />
                              </label>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              ) : (
                <div className="state-box">No editable fields found.</div>
              )}

              <div className="encoding-submit-panel">
                <p>
                  <strong>Changed fields:</strong> {changedFields.length}
                </p>
                <button
                  type="button"
                  className="button-primary"
                  disabled={changedFields.length === 0}
                  onClick={() => setSaveMessage("Adjustments captured. Ready to trigger Decision AI.")}
                >
                  Save Adjustments & Trigger Decision
                </button>
                {saveMessage ? <p className="muted-text">{saveMessage}</p> : null}
                {feedbackPayload.length > 0 ? (
                  <>
                    <h4>Feedback Capture Preview</h4>
                    <pre className="feedback-preview">{JSON.stringify(feedbackPayload, null, 2)}</pre>
                  </>
                ) : null}
              </div>
            </div>

            <div className="encoding-doc-panel">
              <AttachmentList detail={state.detail} compact />
            </div>
          </div>
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
