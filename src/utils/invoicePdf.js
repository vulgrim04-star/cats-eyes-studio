import { fullName, formatPriceFull } from './format';
import { formatDateLong } from './date';
import { MARGIN, PAGE_WIDTH, CONTENT_WIDTH, slug, addHeader, addSectionBand, addFooterToAllPages, hexToRgb } from './pdfHelpers';

const PAYMENT_LABELS = { cb: 'Carte bancaire', especes: 'Espèces', virement: 'Virement' };

function totalRow(doc, label, value, y, { bold = false, rgb } = {}) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(bold ? 12 : 9.5);
  if (bold && rgb) doc.setTextColor(rgb.r, rgb.g, rgb.b);
  else doc.setTextColor(bold ? 35 : 130);
  doc.text(label, PAGE_WIDTH - MARGIN - 78, y);
  doc.text(value, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  doc.setTextColor(0);
  return y + (bold ? 8 : 6.5);
}

export async function generateInvoicePdf(appointment, salon, themeColor) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const rgb = hexToRgb(themeColor);
  let y = addHeader(doc, 'Reçu / Facture', salon, { themeColor });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text(`N° ${appointment.id}`, PAGE_WIDTH - MARGIN, 38, { align: 'right' });
  doc.text(formatDateLong(appointment.date), PAGE_WIDTH - MARGIN, 43, { align: 'right' });
  doc.setTextColor(0);

  y = addSectionBand(doc, 'Cliente', y, themeColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(appointment.client ? fullName(appointment.client) : 'Cliente', MARGIN, y);
  y += 6;
  if (appointment.client?.phone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(120);
    doc.text(appointment.client.phone, MARGIN, y);
    doc.setTextColor(0);
    y += 6;
  }
  y += 5;

  const vatRate = salon?.vatRate ?? 20;
  const priceTTC = appointment.price ?? 0;
  const priceHT = priceTTC / (1 + vatRate / 100);
  const vatAmount = priceTTC - priceHT;

  const rowH = 10;
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PRESTATION', MARGIN + 4, y + rowH / 2 + 1.5);
  doc.text('PRIX TTC', PAGE_WIDTH - MARGIN - 4, y + rowH / 2 + 1.5, { align: 'right' });
  doc.setTextColor(0);
  y += rowH + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(appointment.service?.name || 'Prestation', MARGIN + 4, y);
  doc.text(formatPriceFull(priceTTC), PAGE_WIDTH - MARGIN - 4, y, { align: 'right' });
  y += 6;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  y = totalRow(doc, `TVA (${vatRate}%)`, formatPriceFull(vatAmount), y);
  y = totalRow(doc, 'Total HT', formatPriceFull(priceHT), y);
  y += 1;
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(0.5);
  doc.line(PAGE_WIDTH - MARGIN - 78, y, PAGE_WIDTH - MARGIN, y);
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  y += 7;
  y = totalRow(doc, 'Total TTC', formatPriceFull(priceTTC), y, { bold: true, rgb });
  y += 6;

  if (appointment.paymentMethod) {
    y = addSectionBand(doc, 'Paiement', y, themeColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(PAYMENT_LABELS[appointment.paymentMethod] || appointment.paymentMethod, MARGIN, y);
    y += 8;
  }

  y += 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(130);
  doc.text(`Merci de votre confiance — ${salon?.name || "Votre institut"}`, PAGE_WIDTH / 2, y, { align: 'center' });
  doc.setTextColor(0);

  addFooterToAllPages(doc, salon, themeColor);
  doc.save(`recu-${slug(appointment.client ? fullName(appointment.client) : 'client')}-${appointment.date}.pdf`);
}
