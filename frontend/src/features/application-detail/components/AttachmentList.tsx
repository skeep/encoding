import type { ApplicationDetail } from "../../../api/types";
import { File, FileImage, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import {
  buildAttachmentPreviewUrl,
  getAttachmentBadge,
  getDetectedAttachmentKind,
  getAttachmentTypeLabel
} from "../utils/attachments";

function renderAttachmentIcon(mimeType: string, fileName: string): JSX.Element {
  const badge = getAttachmentBadge(mimeType, fileName);
  if (badge === "IMG") {
    return <FileImage className="attachment-icon-svg" aria-hidden="true" />;
  }
  if (badge === "PDF") {
    return <FileText className="attachment-icon-svg" aria-hidden="true" />;
  }
  if (badge === "DOC") {
    return <FileType2 className="attachment-icon-svg" aria-hidden="true" />;
  }
  if (badge === "XLS") {
    return <FileSpreadsheet className="attachment-icon-svg" aria-hidden="true" />;
  }
  return <File className="attachment-icon-svg" aria-hidden="true" />;
}

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
              <span
                className="attachment-badge"
                title={getAttachmentTypeLabel(attachment.mimeType, attachment.name)}
                aria-label={getAttachmentTypeLabel(attachment.mimeType, attachment.name)}
              >
                {renderAttachmentIcon(attachment.mimeType, attachment.name)}
              </span>
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
            <span
              className="attachment-badge"
              title={getAttachmentTypeLabel(attachment.mimeType, attachment.name)}
              aria-label={getAttachmentTypeLabel(attachment.mimeType, attachment.name)}
            >
              {renderAttachmentIcon(attachment.mimeType, attachment.name)}
            </span>
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
