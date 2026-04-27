import dfaPassportUrl from "../../../../sample/attachments/DFA Passport.jpg";
import loanAppFormUrl from "../../../../sample/attachments/Loan_App_Form.png";

const SAMPLE_ATTACHMENT_URLS: readonly [string, string] = [loanAppFormUrl, dfaPassportUrl];

function stableSampleIndex(fileName: string): 0 | 1 {
  let h = 0;
  for (let i = 0; i < fileName.length; i += 1) {
    h = (Math.imul(31, h) + fileName.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 2) as 0 | 1;
}

export function getAttachmentBadge(mimeType: string, fileName: string): string {
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

export function getAttachmentTypeLabel(mimeType: string, fileName: string): string {
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

export function getDetectedAttachmentKind(fileName: string, mimeType: string): string {
  const lowerFile = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (/(salary|payslip|pay_slip)/.test(lowerFile)) {
    return "Salary Slip";
  }
  if (/(bank_statement|statement|soa)/.test(lowerFile)) {
    return "Bank Statement";
  }
  if (/(income_statement|income_sheet|itr|bir_2316)/.test(lowerFile)) {
    return "Income Document";
  }
  if (/(application_form|loan_application|dealership_request)/.test(lowerFile)) {
    return "Loan Application";
  }
  if (/(borrower_id|gov_id|id_scan|id_front|id_back|passport|drivers_license)/.test(lowerFile)) {
    return "Government ID";
  }
  if (/(dealer_quote|quote|quotation)/.test(lowerFile)) {
    return "Dealer Quote";
  }
  if (/(vehicle_spec|spec_sheet)/.test(lowerFile)) {
    return "Vehicle Specification";
  }
  if (/(signed_consent|consent)/.test(lowerFile)) {
    return "Signed Consent";
  }

  if (lowerMime.includes("image/")) {
    return "Image Attachment";
  }
  if (lowerMime.includes("pdf")) {
    return "PDF Attachment";
  }
  if (lowerMime.includes("word") || lowerMime.includes("document")) {
    return "Word Document";
  }
  if (lowerMime.includes("sheet") || lowerMime.includes("excel") || lowerMime.includes("csv")) {
    return "Spreadsheet";
  }
  return "General Attachment";
}

/** Opens a bundled sample image in a new tab (see `AttachmentList` `target="_blank"`). */
export function buildAttachmentPreviewUrl(fileName: string, _mimeType: string, _sizeKb: number): string {
  return SAMPLE_ATTACHMENT_URLS[stableSampleIndex(fileName)];
}
