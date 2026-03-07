import { useMemo, useState } from "react";

import type { ApplicationDetail, DecisionView } from "../../../api/types";
import { formatIsoDate } from "../../../app/formatters";
import { AttachmentList } from "./AttachmentList";

type DecisionTab = "RULE_MATRIX" | "DECISION_MEMO" | "CASE_DETAILS";

function getRuleTone(rule: DecisionView["rules"][number]): "pass" | "fail" | "memo" | "neutral" {
  const combined = `${rule.impact} ${rule.explanation} ${rule.conditionEvaluated}`.toLowerCase();
  if (!rule.passed) {
    return "fail";
  }
  if (combined.includes("memo") || combined.includes("comment") || combined.includes("manual")) {
    return "memo";
  }
  if (combined.includes("not applicable") || combined.includes("not run") || combined.includes("skipped")) {
    return "neutral";
  }
  return "pass";
}

export function DecisionCompletedPanel(props: { detail: ApplicationDetail; decision: DecisionView }): JSX.Element {
  const { detail, decision } = props;
  const [activeTab, setActiveTab] = useState<DecisionTab>("RULE_MATRIX");

  const approvalBucket = useMemo(() => {
    if (decision.summary.finalDecision === "REJECT") {
      return "Rejected";
    }
    if (decision.summary.finalDecision === "APPROVE" && decision.summary.stpEligible) {
      return "STP";
    }
    return "Human Review Needed";
  }, [decision.summary.finalDecision, decision.summary.stpEligible]);

  return (
    <section className="detail-section decision-completed-section">
      <div className="decision-summary-bar">
        <span className="decision-summary-label">Decision Completed</span>
        <span className="decision-bucket-pill">{approvalBucket}</span>
      </div>

      <div className="decision-tab-row">
        <button
          type="button"
          className={`decision-tab-button ${activeTab === "RULE_MATRIX" ? "active" : ""}`}
          onClick={() => setActiveTab("RULE_MATRIX")}
        >
          Rule Matrix
        </button>
        <button
          type="button"
          className={`decision-tab-button ${activeTab === "DECISION_MEMO" ? "active" : ""}`}
          onClick={() => setActiveTab("DECISION_MEMO")}
        >
          Decision Memo
        </button>
        <button
          type="button"
          className={`decision-tab-button ${activeTab === "CASE_DETAILS" ? "active" : ""}`}
          onClick={() => setActiveTab("CASE_DETAILS")}
        >
          Case Details
        </button>
      </div>

      {activeTab === "RULE_MATRIX" ? (
        <ul className="decision-rule-list">
          {decision.rules.map((rule) => {
            const tone = getRuleTone(rule);
            return (
              <li key={rule.ruleId} className={`decision-rule-item ${tone}`}>
                <span className="decision-rule-dot" aria-hidden="true" />
                <div className="decision-rule-main">
                  <p className="decision-rule-title">
                    <strong>{rule.ruleId}</strong> - {rule.description}
                  </p>
                  <p>
                    <strong>Rule Output:</strong> {rule.passed ? "Passed" : "Failed"}
                  </p>
                  <p>
                    <strong>Explanation:</strong> {rule.explanation}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {activeTab === "DECISION_MEMO" ? (
        <div className="decision-memo-panel">
          <p>{decision.creditMemo}</p>
        </div>
      ) : null}

      {activeTab === "CASE_DETAILS" ? (
        <div className="decision-case-grid">
          <section className="detail-section">
            <h4>Application</h4>
            <p>
              <strong>Application ID:</strong> {detail.applicationId}
            </p>
            <p>
              <strong>Applicant:</strong> {detail.applicantName}
            </p>
            <p>
              <strong>Received:</strong> {formatIsoDate(detail.receivedAt)}
            </p>
            <p>
              <strong>Email:</strong> {detail.emailFrom}
            </p>
          </section>
          <section className="detail-section">
            <h4>Attachments</h4>
            <AttachmentList detail={detail} />
          </section>
        </div>
      ) : null}
    </section>
  );
}
