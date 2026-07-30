import { fullName, formatPriceFull } from './format';
import { PAYMENT_LABELS_LONG } from './payments';
import { extrasOf, serviceRevenue, tipOf } from './billing';
import { formatDateLong } from './date';
import { MARGIN, PAGE_WIDTH, CONTENT_WIDTH, slug, addHeader, addSectionBand, addFooterToAllPages, hexToRgb } from './pdfHelpers';


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

export async function generateInvoicePdf(appointment, salon) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const rgb = hexToRgb(BRAND_GOLD);
  let y = addHeader(doc, 'Reçu / Facture', salon);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text(`N° ${appointment.id}`, PAGE_WIDTH - MARGIN, 38, { align: 'right' });
  doc.text(formatDateLong(appointment.date), PAGE_WIDTH - MARGIN, 43, { align: 'right' });
  doc.setTextColor(0);

  y = addSectionBand(doc, 'Cliente', y);
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
  const subjectToVat = vatRate > 0;
  const extras = extrasOf(appointment);
  const tip = tipOf(appointment);
  // La TVA porte sur la prestation ET ses suppléments — ce sont des prestations vendues.
  // Le pourboire en est exclu : il s'ajoute après le total, sans jamais entrer dans
  // l'assiette taxable.
  const priceTTC = serviceRevenue(appointment);
  const priceHT = priceTTC / (1 + vatRate / 100);
  const vatAmount = priceTTC - priceHT;

  const rowH = 10;
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(MARGIN, y, CONTENT_WIDTH, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PRESTATION', MARGIN + 4, y + rowH / 2 + 1.5);
  doc.text(subjectToVat ? 'PRIX TTC' : 'PRIX', PAGE_WIDTH - MARGIN - 4, y + rowH / 2 + 1.5, { align: 'right' });
  doc.setTextColor(0);
  y += rowH + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(appointment.service?.name || 'Prestation', MARGIN + 4, y);
  doc.text(formatPriceFull(appointment.price ?? 0), PAGE_WIDTH - MARGIN - 4, y, { align: 'right' });
  y += 6;
  // Une ligne par supplément : une facture qui affiche un total supérieur au tarif annoncé
  // sans dire pourquoi est une facture qu'on doit justifier de vive voix.
  extras.forEach((extra) => {
    doc.text(extra.label, MARGIN + 4, y);
    doc.text(formatPriceFull(extra.amount), PAGE_WIDTH - MARGIN - 4, y, { align: 'right' });
    y += 6;
  });
  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  // Une institutrice non assujettie à la TVA ne doit voir ni « TVA (0%) », ni « HT/TTC » :
  // ce vocabulaire laisse croire à une facturation avec TVA qu'elle n'a pas le droit d'émettre.
  if (subjectToVat) {
    y = totalRow(doc, `TVA (${vatRate}%)`, formatPriceFull(vatAmount), y);
    y = totalRow(doc, 'Total HT', formatPriceFull(priceHT), y);
  }
  y += 1;
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(0.5);
  doc.line(PAGE_WIDTH - MARGIN - 78, y, PAGE_WIDTH - MARGIN, y);
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  y += 7;
  y = totalRow(doc, subjectToVat ? 'Total TTC' : 'Total', formatPriceFull(priceTTC), y, { bold: true, rgb });
  if (tip > 0) {
    y = totalRow(doc, 'Pourboire', formatPriceFull(tip), y);
    y = totalRow(doc, 'Total réglé', formatPriceFull(priceTTC + tip), y, { bold: true, rgb });
  }
  y += 6;

  if (appointment.paymentMethod) {
    y = addSectionBand(doc, 'Paiement', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(PAYMENT_LABELS_LONG[appointment.paymentMethod] || appointment.paymentMethod, MARGIN, y);
    y += 8;
  }

  y += 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(130);
  doc.text(`Merci de votre confiance — ${salon?.name || "Votre institut"}`, PAGE_WIDTH / 2, y, { align: 'center' });
  doc.setTextColor(0);

  addFooterToAllPages(doc, salon);
  doc.save(`recu-${slug(appointment.client ? fullName(appointment.client) : 'client')}-${appointment.date}.pdf`);
}
