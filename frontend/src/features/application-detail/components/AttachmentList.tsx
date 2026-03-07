import type { ApplicationDetail } from "../../../api/types";
import {
  buildAttachmentPreviewUrl,
  getAttachmentBadge,
  getDetectedAttachmentKind,
  getAttachmentTypeLabel
} from "../utils/attachments";

export function AttachmentList(props: { detail: ApplicationDetail; compact?: boolean }): JSX.Element {
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
              title={`${attachment.name} (${getDetectedAttachmentKind(
                attachment.name,
                attachment.mimeType
              )}, ${attachment.mimeType}, ${attachment.sizeKb} KB)`}
            >
              <span className="attachment-badge">{getAttachmentBadge(attachment.mimeType, attachment.name)}</span>
              <span className="attachment-name">{attachment.name}</span>
              <span className="attachment-meta-inline">
                {getDetectedAttachmentKind(attachment.name, attachment.mimeType)} -{" "}
                {getAttachmentTypeLabel(attachment.mimeType, attachment.name)} - {attachment.sizeKb} KB
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
            ({getDetectedAttachmentKind(attachment.name, attachment.mimeType)} -{" "}
            {getAttachmentTypeLabel(attachment.mimeType, attachment.name)} - {attachment.mimeType},{" "}
            {attachment.sizeKb} KB)
          </span>
        </li>
      ))}
    </ol>
  );
}
