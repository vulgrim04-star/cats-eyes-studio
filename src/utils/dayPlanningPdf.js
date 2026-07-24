import { fullName, formatPrice } from './format';
import { formatDateLong } from './date';
import { MARGIN, PAGE_WIDTH, CONTENT_WIDTH, addHeader, addFooterToAllPages, ensureSpace, hexToRgb, shade } from './pdfHelpers';

const STATUS_LABELS = { cancelled: 'Annulé', 'no-show': 'No-show' };

export function addAppointmentRows(doc, appointments, y) {
  appointments.forEach((apt) => {
    y = ensureSpace(doc, y, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(apt.time, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const label = `${apt.client ? fullName(apt.client) : 'Cliente'} — ${apt.service?.name ?? 'Prestation'}`;
    doc.text(doc.splitTextToSize(label, CONTENT_WIDTH - 70), MARGIN + 16, y);
    const isOff = apt.status === 'cancelled' || apt.status === 'no-show';
    doc.setFont('helvetica', isOff ? 'italic' : 'normal');
    doc.setTextColor(isOff ? 170 : 90);
    doc.text(isOff ? STATUS_LABELS[apt.status] : formatPrice(apt.price ?? 0), PAGE_WIDTH - MARGIN, y, { align: 'right' });
    doc.setTextColor(0);
    y += 7;
  });
  return y;
}

export function addPlanningSummary(doc, count, revenue, y, themeColor, { label = `${count} rendez-vous` } = {}) {
  const rgb = hexToRgb(themeColor);
  y = ensureSpace(doc, y, 16);
  y += 4;
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(35, 30, 32);
  doc.text(label, MARGIN, y);
  const shaded = shade(rgb, 0.1);
  doc.setTextColor(shaded.r, shaded.g, shaded.b);
  doc.text(`Chiffre d'affaires prévu : ${formatPrice(revenue)}`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  doc.setTextColor(0);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(140);
  doc.text('(hors annulations et no-show)', PAGE_WIDTH - MARGIN, y, { align: 'right' });
  doc.setTextColor(0);
  return y + 6;
}

export async function generateDayPlanningPdf(date, appointments, salon, themeColor) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = addHeader(doc, 'Planning du jour', salon, { themeColor });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(35, 30, 32);
  doc.text(formatDateLong(date), MARGIN, y + 2);
  doc.setTextColor(0);
  y += 12;

  if (appointments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(130);
    doc.text('Aucun rendez-vous ce jour-là.', MARGIN, y);
    doc.setTextColor(0);
  } else {
    y = addAppointmentRows(doc, appointments, y);
    const active = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no-show');
    const revenue = active.reduce((sum, a) => sum + (a.price ?? 0), 0);
    addPlanningSummary(doc, appointments.length, revenue, y, themeColor);
  }

  addFooterToAllPages(doc, salon, themeColor);
  doc.save(`planning-${date}.pdf`);
}
