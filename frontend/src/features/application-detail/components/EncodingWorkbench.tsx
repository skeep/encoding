import type { ApplicationDetail } from "../../../api/types";
import type { ChangedRow } from "../types";
import { useEncodingEditorState } from "../hooks/useEncodingEditorState";
import { startsWithSectionLabel, type EditorTarget } from "../utils/editorTargets";
import { buildScoringMeta } from "../utils/scoringMeta";
import { AttachmentList } from "./AttachmentList";

type EncodingWorkbenchProps = {
  selectedAppId: string;
  activeStatus: string;
  detail: ApplicationDetail;
  editorTargets: EditorTarget[];
};

export function EncodingWorkbench(props: EncodingWorkbenchProps): JSX.Element {
  const { selectedAppId, activeStatus, detail, editorTargets } = props;
  const {
    editableValues,
    setEditableValues,
    saveMessage,
    setSaveMessage,
    selectedTargetId,
    setSelectedTargetId,
    openMetaFieldPath,
    setOpenMetaFieldPath,
    editorTab,
    setEditorTab,
    baselineValues,
    changedRows,
    changedCount
  } = useEncodingEditorState(selectedAppId, activeStatus, editorTargets);

  const selectedTarget = editorTargets.find((target) => target.id === selectedTargetId) ?? editorTargets[0];

  return (
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
          <div className="editor-tab-row" role="tablist" aria-label="Encoding editor tabs">
            <button
              type="button"
              role="tab"
              aria-selected={editorTab === "fields"}
              className={`editor-tab-button ${editorTab === "fields" ? "active" : ""}`}
              onClick={() => setEditorTab("fields")}
            >
              Fields
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={editorTab === "changes"}
              className={`editor-tab-button ${editorTab === "changes" ? "active" : ""}`}
              onClick={() => setEditorTab("changes")}
            >
              Changes ({changedRows.length})
            </button>
          </div>

          {editorTab === "fields" ? (
            selectedTarget ? (
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
                        <div key={field.path} className={`nested-field-row ${fieldChanged ? "field-changed" : ""}`}>
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
                                  ocr={meta.component_scores.ocr}, format={meta.component_scores.format}, statistical=
                                  {meta.component_scores.statistical}, cross_field={meta.component_scores.cross_field}
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            ) : (
              <div className="state-box">No editable fields found.</div>
            )
          ) : (
            <ChangesTable rows={changedRows} />
          )}

          <div className="encoding-submit-panel">
            <button
              type="button"
              className="button-primary"
              disabled={changedCount === 0}
              onClick={() => setSaveMessage("Adjustments captured. Ready to trigger Decision AI.")}
            >
              Save Adjustments & Trigger Decision
            </button>
            {saveMessage ? <p className="muted-text">{saveMessage}</p> : null}
          </div>
        </div>

        <div className="encoding-doc-panel">
          <AttachmentList detail={detail} compact />
        </div>
      </div>
    </section>
  );
}

function ChangesTable(props: { rows: ChangedRow[] }): JSX.Element {
  const { rows } = props;
  return (
    <div className="changes-table-wrap">
      {rows.length === 0 ? (
        <div className="state-box">No changes yet.</div>
      ) : (
        <table className="changes-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Previous Value</th>
              <th>New Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.fieldPath}>
                <td>{row.fieldLabel}</td>
                <td>{row.oldValue || "<empty>"}</td>
                <td>{row.newValue || "<empty>"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
