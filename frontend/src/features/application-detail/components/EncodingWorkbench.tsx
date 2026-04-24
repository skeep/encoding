import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";

import type { ApplicationDetail } from "../../../api/types";
import { LOW_CONFIDENCE_NAV_TARGET_ID, LOW_CONFIDENCE_THRESHOLD } from "../encodingConstants";
import type { EncodingMetaPane, EncodingOpenMeta } from "../hooks/useEncodingEditorState";
import { useEncodingEditorState } from "../hooks/useEncodingEditorState";
import type { ChangedRow } from "../types";
import { startsWithSectionLabel, type EditableField, type EditorTarget } from "../utils/editorTargets";
import { buildScoringMeta } from "../utils/scoringMeta";
import { AttachmentList } from "./AttachmentList";

type EncodingWorkbenchProps = {
  selectedAppId: string;
  activeStatus: string;
  detail: ApplicationDetail;
  editorTargets: EditorTarget[];
};

type LowConfidenceGroup = {
  id: string;
  heading: string;
  rows: EditableField[];
};

function targetSectionHeading(target: EditorTarget): string {
  return target.isRepeatable ? `${target.sectionLabel} ${target.itemLabel}` : target.sectionLabel;
}

export function EncodingWorkbench(props: EncodingWorkbenchProps): JSX.Element {
  const { selectedAppId, activeStatus, detail, editorTargets } = props;
  const {
    editableValues,
    setEditableValues,
    saveMessage,
    setSaveMessage,
    selectedTargetId,
    setSelectedTargetId,
    openMeta,
    setOpenMeta,
    editorTab,
    setEditorTab,
    baselineValues,
    changedRows,
    changedCount
  } = useEncodingEditorState(selectedAppId, activeStatus, editorTargets);

  const isLowConfidenceNav = selectedTargetId === LOW_CONFIDENCE_NAV_TARGET_ID;
  const selectedTarget = isLowConfidenceNav
    ? undefined
    : (editorTargets.find((target) => target.id === selectedTargetId) ?? editorTargets[0]);

  const lowConfidenceGroups = useMemo((): LowConfidenceGroup[] => {
    const groups: LowConfidenceGroup[] = [];
    for (const target of editorTargets) {
      const rows: EditableField[] = [];
      for (const field of target.fields) {
        const current = editableValues[field.path] ?? "";
        const meta = buildScoringMeta(field.path, current, selectedAppId);
        if (meta.field_score < LOW_CONFIDENCE_THRESHOLD) {
          rows.push(field);
        }
      }
      if (rows.length > 0) {
        groups.push({ id: target.id, heading: targetSectionHeading(target), rows });
      }
    }
    return groups;
  }, [editorTargets, editableValues, selectedAppId]);

  const totalLowConfidenceFields = lowConfidenceGroups.reduce((n, g) => n + g.rows.length, 0);

  const lowConfidenceNavHasChanges = useMemo(() => {
    for (const group of lowConfidenceGroups) {
      for (const field of group.rows) {
        if ((editableValues[field.path] ?? "") !== (baselineValues[field.path] ?? "")) {
          return true;
        }
      }
    }
    return false;
  }, [lowConfidenceGroups, editableValues, baselineValues]);

  return (
    <section className="detail-section encoding-detail-section">
      <div className="encoding-workbench">
        <div className="encoding-field-list">
          <button
            type="button"
            className={`encoding-field-item ${isLowConfidenceNav ? "active" : ""} ${lowConfidenceNavHasChanges ? "encoding-field-item--modified" : ""}`}
            aria-label={
              lowConfidenceNavHasChanges ? "Low confidence fields, contains unsaved edits" : "Low confidence fields"
            }
            title={lowConfidenceNavHasChanges ? "Contains unsaved edits" : undefined}
            onClick={() => {
              setSelectedTargetId(LOW_CONFIDENCE_NAV_TARGET_ID);
              setOpenMeta(null);
            }}
          >
            <span>Low confidence fields</span>
            <span className="menu-item-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <div className="encoding-field-list-divider" role="separator" aria-hidden="true" />
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
                className={`encoding-field-item ${!isLowConfidenceNav && selectedTarget?.id === target.id ? "active" : ""} ${hasChanges ? "encoding-field-item--modified" : ""}`}
                aria-label={hasChanges ? `${menuLabel}, contains unsaved edits` : menuLabel}
                title={hasChanges ? "Contains unsaved edits" : undefined}
                onClick={() => {
                  setSelectedTargetId(target.id);
                  setOpenMeta(null);
                }}
              >
                <span>{menuLabel}</span>
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
            isLowConfidenceNav ? (
              <article className="field-card analyst-field-card">
                <h4>Low confidence fields</h4>
                {totalLowConfidenceFields === 0 ? (
                  <p className="muted-text">No fields below 85% confidence.</p>
                ) : (
                  lowConfidenceGroups.map((group) => (
                    <div key={group.id} className="encoding-low-confidence-group">
                      <h5 className="encoding-low-confidence-subheading">{group.heading}</h5>
                      <div className="nested-field-table">
                        {group.rows.map((field) => (
                          <EncodingFieldRow
                            key={field.path}
                            field={field}
                            pane="lowConfidence"
                            selectedAppId={selectedAppId}
                            editableValues={editableValues}
                            baselineValues={baselineValues}
                            setEditableValues={setEditableValues}
                            openMeta={openMeta}
                            setOpenMeta={setOpenMeta}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </article>
            ) : selectedTarget ? (
              <article className="field-card analyst-field-card">
                <h4>
                  {selectedTarget.sectionLabel}
                  {selectedTarget.isRepeatable ? ` ${selectedTarget.itemLabel}` : ""}
                </h4>

                {selectedTarget.fields.length === 0 ? (
                  <p className="muted-text">No extracted rows for this section.</p>
                ) : (
                  <div className="nested-field-table">
                    {selectedTarget.fields.map((field) => (
                      <EncodingFieldRow
                        key={field.path}
                        field={field}
                        pane="section"
                        selectedAppId={selectedAppId}
                        editableValues={editableValues}
                        baselineValues={baselineValues}
                        setEditableValues={setEditableValues}
                        openMeta={openMeta}
                        setOpenMeta={setOpenMeta}
                      />
                    ))}
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

type EncodingFieldRowProps = {
  field: EditableField;
  pane: EncodingMetaPane;
  selectedAppId: string;
  editableValues: Record<string, string>;
  baselineValues: Record<string, string>;
  setEditableValues: Dispatch<SetStateAction<Record<string, string>>>;
  openMeta: EncodingOpenMeta | null;
  setOpenMeta: Dispatch<SetStateAction<EncodingOpenMeta | null>>;
};

function EncodingFieldRow(props: EncodingFieldRowProps): JSX.Element {
  const {
    field,
    pane,
    selectedAppId,
    editableValues,
    baselineValues,
    setEditableValues,
    openMeta,
    setOpenMeta
  } = props;

  const currentValue = editableValues[field.path] ?? "";
  const previousValue = baselineValues[field.path] ?? "";
  const fieldChanged = currentValue !== previousValue;
  const meta = buildScoringMeta(field.path, currentValue, selectedAppId);
  const isMetaOpen = openMeta?.pane === pane && openMeta.path === field.path;
  const confidenceLabel = `${Math.round(meta.field_score * 100)}%`;
  const toPercent = (score: number): string => `${Math.round(score * 100)}%`;
  const componentTitle = (component: string): string => {
    if (component === "ocr") {
      return "OCR";
    }
    return component.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
  };

  return (
    <div className={`nested-field-row ${fieldChanged ? "field-changed" : ""}`}>
      <div className="field-row-main">
        <button
          type="button"
          className="field-confidence-button"
          onClick={() =>
            setOpenMeta((prev) =>
              prev?.pane === pane && prev.path === field.path ? null : { pane, path: field.path }
            )
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
          <div className="field-meta-narrative">
            <div className="field-meta-facts">
              <div className="field-meta-fact">
                <span className="field-meta-fact-label">Field</span>
                <span className="field-meta-fact-value">{meta.field_id}</span>
              </div>
              <div className="field-meta-fact">
                <span className="field-meta-fact-label">Status</span>
                <span className="field-meta-fact-value">{meta.status}</span>
              </div>
              <div className="field-meta-fact">
                <span className="field-meta-fact-label">Raw Value</span>
                <span className="field-meta-fact-value">{meta.raw_value || "<empty>"}</span>
              </div>
              <div className="field-meta-fact">
                <span className="field-meta-fact-label">Normalized Value</span>
                <span className="field-meta-fact-value">
                  {meta.normalized_value === null ? "<null>" : String(meta.normalized_value)}
                </span>
              </div>
            </div>

            <div className="field-meta-components">
              {meta.explainability.component_narratives.map((item) => (
                <div key={item.component} className="field-meta-component-card">
                  <div className="field-meta-component-header">
                    <strong>{componentTitle(item.component)}</strong>
                    <button
                      type="button"
                      className="field-meta-info-icon"
                      aria-label={`More info about ${componentTitle(item.component)}`}
                      title={item.narrative}
                    >
                      i
                    </button>
                    <span>{toPercent(item.score)}</span>
                  </div>
                  {item.evidence ? <p className="field-meta-evidence">{item.evidence}</p> : null}
                </div>
              ))}
            </div>

            <div className="field-meta-composite">
              <p>{meta.explainability.final_narrative}</p>
              <p className="field-meta-formula">Formula: {meta.explainability.weighted_formula}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
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
