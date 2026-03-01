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

export function buildAttachmentPreviewUrl(fileName: string, mimeType: string, sizeKb: number): string {
  const safeName = fileName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeMime = mimeType.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
          <p class="meta"><strong>Type:</strong> ${safeMime}</p>
          <p class="meta"><strong>Size:</strong> ${sizeKb} KB</p>
          <p class="meta">This is a mock preview tab for frontend-only development.</p>
        </div>
      </body>
    </html>
  `;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
