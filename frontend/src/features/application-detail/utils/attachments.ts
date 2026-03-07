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

export function buildAttachmentPreviewUrl(fileName: string, mimeType: string, sizeKb: number): string {
  const safeName = fileName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeMime = mimeType.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const detectedKind = getDetectedAttachmentKind(fileName, mimeType)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; max-width: 600px; }
          .meta { color: #475569; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Mock Attachment Preview</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p class="meta"><strong>Detected Kind:</strong> ${detectedKind}</p>
          <p class="meta"><strong>Type:</strong> ${safeMime}</p>
          <p class="meta"><strong>Size:</strong> ${sizeKb} KB</p>
          <p class="meta">This is a mock preview tab for frontend-only development.</p>
        </div>
      </body>
    </html>
  `;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
