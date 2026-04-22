import { useMemo } from "react";

import type { ApplicationStatus, QueueStatus } from "../../api/types";
import { formatIsoDate } from "../../app/formatters";
import samplePostEncoding from "../../../sample/sample_post_encoding.json";
import { AttachmentList } from "./components/AttachmentList";
import { DecisionCompletedPanel } from "./components/DecisionCompletedPanel";
import { EncodingWorkbench } from "./components/EncodingWorkbench";
import type { DetailPanelState } from "./types";
import { buildEditorTargets } from "./utils/editorTargets";

export type { DetailPanelState } from "./types";

const statusLabels: Record<ApplicationStatus, string> = {
  EMAIL_RECEIVED: "Email Received",
  ENCODING_IN_PROGRESS: "Encoding In Progress",
  DOCUMENT_REQUESTED: "Document Requested",
  ENCODING_COMPLETED: "Encoding Completed",
  DECISION_RUNNING: "Decision Running",
  DECISION_COMPLETED: "Decision Completed",
  LOAN_DISBURSED: "Loan Disbursed"
};

export function DetailPanel(props: {
  activeStatus: QueueStatus;
  selectedAppId: string | null;
  state: DetailPanelState;
}): JSX.Element {
  const { activeStatus, selectedAppId, state } = props;
  const editorTargets = useMemo(() => buildEditorTargets(samplePostEncoding), []);
  const isEncodingCompletedView = activeStatus === "ENCODING_COMPLETED" && !!state.encoding;
  const showBaseOverview = !isEncodingCompletedView && activeStatus !== "DECISION_COMPLETED";

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
    <div className={`detail-content ${isEncodingCompletedView ? "encoding-detail-content" : ""}`}>
      {showBaseOverview ? (
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
        <EncodingWorkbench
          selectedAppId={selectedAppId}
          activeStatus={activeStatus}
          detail={state.detail}
          editorTargets={editorTargets}
        />
      ) : null}

      {activeStatus === "DECISION_COMPLETED" && state.decision ? (
        <DecisionCompletedPanel detail={state.detail} decision={state.decision} />
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
