import { queueStatuses, type QueueStatus, type QueueSummary } from "../../../api/types";
import { statusLabels } from "../utils/statusFormatters";

export function QueueTabs(props: {
  activeStatus: QueueStatus;
  summary: QueueSummary[];
  onChange: (status: QueueStatus) => void;
}): JSX.Element {
  const { activeStatus, summary, onChange } = props;
  return (
    <div className="tab-row" role="tablist" aria-label="Workflow state tabs">
      {queueStatuses.map((status) => {
        const count = summary.find((item) => item.status === status)?.count ?? 0;
        return (
          <button
            key={status}
            role="tab"
            aria-selected={activeStatus === status}
            className={`queue-tab ${activeStatus === status ? "active" : ""}`}
            onClick={() => onChange(status)}
          >
            <span>{statusLabels[status]}</span>
            <strong>{count}</strong>
          </button>
        );
      })}
    </div>
  );
}
