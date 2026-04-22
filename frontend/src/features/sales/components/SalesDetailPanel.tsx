import { useEffect, useState } from "react";

import type { ApplicationDetail, ApplicationStatus } from "../../../api/types";
import { salesApi } from "../../../api/salesApi";
import { formatIsoDate } from "../../../app/formatters";
import { AttachmentList } from "../../application-detail/components/AttachmentList";
import type { SalesDetailPanelState } from "../types";

const statusLabels: Record<ApplicationStatus, string> = {
  EMAIL_RECEIVED: "Email Received",
  ENCODING_IN_PROGRESS: "Encoding In Progress",
  DOCUMENT_REQUESTED: "Document Requested",
  ENCODING_COMPLETED: "Encoding Completed",
  DECISION_RUNNING: "Decision Running",
  DECISION_COMPLETED: "Decision Completed",
  LOAN_DISBURSED: "Loan Disbursed"
};

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
  address: "Address"
};

export function SalesDetailPanel(props: {
  selectedAppId: string | null;
  state: SalesDetailPanelState;
  onAfterSubmit: () => void | Promise<void>;
}): JSX.Element {
  const { selectedAppId, state, onAfterSubmit } = props;
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  const activeTask = state.tasks?.find((task) => task.id === activeTaskId) ?? null;

  useEffect(() => {
    const ids = state.tasks ?? [];
    if (!activeTaskId || !ids.some((task) => task.id === activeTaskId)) {
      setActiveTaskId(null);
    }
  }, [state.tasks, activeTaskId]);

  async function handleSubmit(taskId: string, payload: Record<string, string>): Promise<void> {
    if (!selectedAppId) {
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      await salesApi.submitSalesSupplement(selectedAppId, { taskId, payload });
      setActiveTaskId(null);
      setFormValues({});
      await onAfterSubmit();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save");
    } finally {
      setSubmitting(false);
    }
  }

  function openTask(taskId: string, task: { fieldsRequested?: string[] }): void {
    setActiveTaskId(taskId);
    setSubmitError(undefined);
    const next: Record<string, string> = {};
    const keys = task.fieldsRequested?.length ? task.fieldsRequested : [];
    for (const key of keys) {
      next[key] = "";
    }
    setFormValues(next);
  }

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

  const detail: ApplicationDetail = state.detail;
  const tasks = state.tasks ?? [];

  return (
    <div className="detail-content sales-detail-content">
      <section className="detail-section">
        <h3>Overview</h3>
        <p>
          <strong>Applicant:</strong> {detail.applicantName}
        </p>
        <p>
          <strong>Status:</strong> {statusLabels[detail.status]}
        </p>
        <p>
          <strong>Sent:</strong> {formatIsoDate(detail.receivedAt)}
        </p>
        <p>
          <strong>Dealer email:</strong> {detail.emailFrom}
        </p>
      </section>

      <section className="detail-section">
        <h3>Attachments</h3>
        <AttachmentList detail={detail} />
      </section>

      <section className="detail-section">
        <h3>Pending actions</h3>
        {tasks.length === 0 ? (
          <p className="muted-text">No pending requests from encoding or credit.</p>
        ) : (
          <ul className="sales-task-list">
            {tasks.map((task) => (
              <li key={task.id} className="sales-task-card">
                <div className="sales-task-card-head">
                  <span className={`sales-task-source sales-task-source-${task.source.toLowerCase()}`}>
                    {task.source === "ENCODER" ? "Encoder" : "Credit"}
                  </span>
                  <span className="sales-task-date">{formatIsoDate(task.createdAt)}</span>
                </div>
                <h4 className="sales-task-title">{task.title}</h4>
                <p className="sales-task-body">{task.body}</p>
                <div className="sales-task-actions">
                  {task.fieldsRequested && task.fieldsRequested.length > 0 ? (
                    <button type="button" className="button-primary" onClick={() => openTask(task.id, task)}>
                      Fill requested fields
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => void handleSubmit(task.id, {})}
                      disabled={submitting}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeTask ? (
        <div
          className="sales-modal-backdrop"
          role="presentation"
          onClick={() => !submitting && setActiveTaskId(null)}
        >
          <div
            className="sales-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sales-modal-header">
              <h2 id="sales-modal-title">{activeTask.title}</h2>
              <button
                type="button"
                className="sales-modal-close"
                aria-label="Close"
                onClick={() => !submitting && setActiveTaskId(null)}
              >
                ×
              </button>
            </div>
            <p className="sales-modal-body-text">{activeTask.body}</p>
            {activeTask.fieldsRequested && activeTask.fieldsRequested.length > 0 ? (
              <form
                className="sales-modal-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit(activeTask.id, formValues);
                }}
              >
                {activeTask.fieldsRequested.map((fieldKey) => (
                  <label key={fieldKey} className="sales-field-label">
                    <span>{FIELD_LABELS[fieldKey] ?? fieldKey}</span>
                    <input
                      className="sales-field-input"
                      value={formValues[fieldKey] ?? ""}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, [fieldKey]: event.target.value }))
                      }
                      autoComplete="off"
                    />
                  </label>
                ))}
                {submitError ? <p className="sales-modal-error">{submitError}</p> : null}
                <div className="sales-modal-footer">
                  <button type="button" className="button-secondary" onClick={() => setActiveTaskId(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="button-primary" disabled={submitting}>
                    {submitting ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
