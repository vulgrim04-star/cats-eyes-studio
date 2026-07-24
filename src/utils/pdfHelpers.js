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

export function imageFormatOf(dataUrl) {
  const match = /^data:image\/(\w+);/i.exec(dataUrl || '');
  const type = (match?.[1] || 'jpeg').toUpperCase();
  return type === 'JPG' ? 'JPEG' : type;
}

const DEFAULT_THEME = '#C8718A';

export function hexToRgb(hex) {
  const clean = (hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) return hexToRgb(DEFAULT_THEME);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Mélange une couleur vers le blanc (amount 0 = couleur pure, 1 = blanc) — pour des fonds pastel. */
export function tint({ r, g, b }, amount) {
  return {
    r: Math.round(r + (255 - r) * amount),
    g: Math.round(g + (255 - g) * amount),
    b: Math.round(b + (255 - b) * amount),
  };
}

/** Assombrit une couleur (amount 0 = couleur pure, 1 = noir) — pour du texte lisible sur fond clair. */
export function shade({ r, g, b }, amount) {
  return {
    r: Math.round(r * (1 - amount)),
    g: Math.round(g * (1 - amount)),
    b: Math.round(b * (1 - amount)),
  };
}

/** En-tête de document : bandeau de couleur, logo du salon (si présent), coordonnées et titre. */
export function addHeader(doc, title, salon, { themeColor = DEFAULT_THEME } = {}) {
  const rgb = hexToRgb(themeColor);
  const hasLogo = !!salon?.logoUrl;

  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(0, 0, PAGE_WIDTH, 3.5, 'F');

  let textX = MARGIN;
  if (hasLogo) {
    try {
      doc.addImage(salon.logoUrl, imageFormatOf(salon.logoUrl), MARGIN, 10, 20, 20, undefined, 'FAST');
      textX = MARGIN + 25;
    } catch {
      // Logo illisible : on continue sans bloquer la génération du PDF.
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(35, 30, 32);
  doc.text(salon?.name || 'Votre institut', textX, hasLogo ? 17 : 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(130);
  const addressLine = [salon?.address, salon?.phone, salon?.email].filter(Boolean).join('  ·  ');
  if (addressLine) doc.text(doc.splitTextToSize(addressLine, CONTENT_WIDTH - (hasLogo ? 25 : 0)), textX, hasLogo ? 23 : 24);
  doc.setTextColor(0);

  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 33, PAGE_WIDTH - MARGIN, 33);
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text(title, MARGIN, 42);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  return 50;
}

/** Bandeau de titre de section : filet coloré + petit accent, à la place d'une simple ligne grise. */
export function addSectionBand(doc, text, y, themeColor = DEFAULT_THEME) {
  const rgb = hexToRgb(themeColor);
  y = ensureSpace(doc, y, 16);
  y += 4;
  const bandTop = y - 5.5;
  const bandH = 8;
  const bg = tint(rgb, 0.87);
  doc.setFillColor(bg.r, bg.g, bg.b);
  doc.rect(MARGIN, bandTop, CONTENT_WIDTH, bandH, 'F');
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(MARGIN, bandTop, 2, bandH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const textColor = shade(rgb, 0.35);
  doc.setTextColor(textColor.r, textColor.g, textColor.b);
  doc.text(text.toUpperCase(), MARGIN + 5, y);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  return y + 8;
}

/** Pied de page (filet + nom du salon + numéro de page) appliqué à toutes les pages déjà générées. */
export function addFooterToAllPages(doc, salon, themeColor = DEFAULT_THEME) {
  const rgb = hexToRgb(themeColor);
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 285, PAGE_WIDTH - MARGIN, 285);
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    doc.text(salon?.name || 'Votre institut', MARGIN, 290);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_WIDTH - MARGIN, 290, { align: 'right' });
    doc.setTextColor(0);
  }
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
