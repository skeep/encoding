import { useMemo, useState } from "react";

import type { ApplicationDetail, DecisionView } from "../../../api/types";
import { formatIsoDate } from "../../../app/formatters";
import { AttachmentList } from "./AttachmentList";

type DecisionTab = "RULE_MATRIX" | "DECISION_MEMO" | "CASE_DETAILS";

type RuleExecutionStatus = "PASSED" | "FAILED" | "REJECTED" | "NOT_EXECUTED" | "SKIPPED";

function getExecutionStatus(rule: DecisionView["rules"][number]): RuleExecutionStatus {
  if (rule.executionStatus) {
    return rule.executionStatus;
  }
  return rule.passed ? "PASSED" : "FAILED";
}

function getStatusLabel(status: RuleExecutionStatus): string {
  if (status === "PASSED") {
    return "Passed";
  }
  if (status === "FAILED") {
    return "Failed";
  }
  if (status === "REJECTED") {
    return "Rejected";
  }
  if (status === "NOT_EXECUTED") {
    return "Not executed";
  }
  return "Skipped";
}

function getStatusIcon(status: RuleExecutionStatus): string {
  if (status === "PASSED") {
    return "P";
  }
  if (status === "FAILED") {
    return "F";
  }
  if (status === "REJECTED") {
    return "R";
  }
  if (status === "NOT_EXECUTED") {
    return "N";
  }
  return "S";
}

function inputText(rule: DecisionView["rules"][number]): string {
  if (rule.inputValue && rule.inputValue.trim().length > 0) {
    return rule.inputValue;
  }
  const compact = Object.entries(rule.inputValues)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
  return compact || "-";
}

function outputText(rule: DecisionView["rules"][number]): string {
  return rule.outputValue?.trim() || rule.impact || "-";
}

export function DecisionCompletedPanel(props: { detail: ApplicationDetail; decision: DecisionView }): JSX.Element {
  const { detail, decision } = props;
  const [activeTab, setActiveTab] = useState<DecisionTab>("RULE_MATRIX");
  const [openAttachmentRuleId, setOpenAttachmentRuleId] = useState<string | null>(null);

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
        <div className="decision-rule-matrix-wrap">
          <div className="decision-rule-legend">
            {(["PASSED", "FAILED", "REJECTED", "NOT_EXECUTED", "SKIPPED"] as RuleExecutionStatus[]).map((status) => (
              <div key={status} className="decision-legend-item">
                <span className={`decision-status-icon ${status.toLowerCase()}`}>{getStatusIcon(status)}</span>
                <span>{getStatusLabel(status)}</span>
              </div>
            ))}
          </div>

          <div className="decision-rule-table-wrap">
            <table className="decision-rule-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Rule</th>
                  <th>Input Value</th>
                  <th>Output Value</th>
                  <th>Explanation</th>
                </tr>
              </thead>
              <tbody>
                {decision.rules.map((rule) => {
                  const status = getExecutionStatus(rule);
                  return (
                    <tr key={rule.ruleId}>
                      <td>
                        <span className={`decision-status-pill ${status.toLowerCase()}`}>
                          <span className={`decision-status-icon ${status.toLowerCase()}`} aria-hidden="true">
                            {getStatusIcon(status)}
                          </span>
                        </span>
                      </td>
                      <td>
                        <div className="decision-rule-cell-rule">
                          <strong>{rule.ruleId}</strong>
                          <span>{rule.ruleName ?? rule.description}</span>
                        </div>
                      </td>
                      <td>
                        <div className="decision-rule-cell-io">
                          <span>{inputText(rule)}</span>
                          {rule.inputValues.attachments_count ? (
                            <div className="decision-attachments-inline">
                              <button
                                type="button"
                                className="decision-inline-button"
                                onClick={() =>
                                  setOpenAttachmentRuleId((prev) => (prev === rule.ruleId ? null : rule.ruleId))
                                }
                              >
                                attachments={detail.attachments.length}
                              </button>
                              {openAttachmentRuleId === rule.ruleId ? (
                                <div className="decision-attachments-popover">
                                  <strong>Attachments</strong>
                                  <ul>
                                    {detail.attachments.map((attachment) => (
                                      <li key={attachment.name}>
                                        {attachment.name} ({attachment.sizeKb} KB)
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {rule.inputValues.email_from ? (
                            <span className="decision-inline-subtle">email_from={detail.emailFrom}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{outputText(rule)}</td>
                      <td>
                        {rule.explanation}
                        {rule.isPrimaryCause ? (
                          <span className="decision-primary-cause-tag">Primary rejection cause</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
