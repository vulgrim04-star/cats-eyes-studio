import { formatDateLong } from './date';

export const MARGIN = 18;
export const PAGE_WIDTH = 210;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function addHeader(doc, title, salon) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(salon?.name || 'Cats Eyes Studio', MARGIN, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  const addressLine = [salon?.address, salon?.phone, salon?.email].filter(Boolean).join('  ·  ');
  if (addressLine) doc.text(addressLine, MARGIN, 26);
  doc.setTextColor(0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, MARGIN, 38);
  doc.setFont('helvetica', 'normal');
  return 47;
}

export function addParagraph(doc, text, y, { fontSize = 10, lineHeight = 5, bold = false } = {}) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * lineHeight;
}

export function addBulletList(doc, items, y, { fontSize = 10, lineHeight = 5 } = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  items.forEach((item) => {
    const lines = doc.splitTextToSize(`•  ${item}`, CONTENT_WIDTH - 4);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * lineHeight;
  });
  return y;
}

export function ensureSpace(doc, y, needed) {
  if (y + needed > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function addSignatureBlock(doc, y, { clientName, clientSignatureUrl, date, managerName }) {
  y = ensureSpace(doc, y, 55);
  y += 4;
  doc.setDrawColor(210);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Signé électroniquement le ${formatDateLong(date)}.`, MARGIN, y);
  doc.setTextColor(0);
  y += 10;

  const colWidth = CONTENT_WIDTH / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Cliente', MARGIN, y);
  doc.text('Praticienne', MARGIN + colWidth, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(clientName || '—', MARGIN, y);
  doc.text(managerName || '—', MARGIN + colWidth, y);
  y += 4;

  if (clientSignatureUrl) {
    try {
      doc.addImage(clientSignatureUrl, 'PNG', MARGIN, y, 55, 22);
    } catch {
      // Signature illisible : on continue sans bloquer la génération du PDF.
    }
  }

  return y + 26;
}
