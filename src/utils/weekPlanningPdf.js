import { formatDateLong } from './date';
import { MARGIN, addHeader, addSectionBand, addFooterToAllPages, ensureSpace } from './pdfHelpers';
import { addAppointmentRows, addPlanningSummary } from './dayPlanningPdf';

export async function generateWeekPlanningPdf(daysWithAppointments, salon, themeColor) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = addHeader(doc, 'Planning de la semaine', salon, { themeColor });

  const first = daysWithAppointments[0]?.date;
  const last = daysWithAppointments[daysWithAppointments.length - 1]?.date;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(35, 30, 32);
  doc.text(`Du ${formatDateLong(first)} au ${formatDateLong(last)}`, MARGIN, y + 2);
  doc.setTextColor(0);
  y += 11;

  let totalCount = 0;
  let totalRevenue = 0;

  daysWithAppointments.forEach(({ date, appointments }) => {
    y = addSectionBand(doc, formatDateLong(date), y, themeColor);
    if (appointments.length === 0) {
      y = ensureSpace(doc, y, 8);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(150);
      doc.text('Aucun rendez-vous.', MARGIN + 3, y);
      doc.setTextColor(0);
      y += 7;
    } else {
      y = addAppointmentRows(doc, appointments, y);
    }
    const active = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no-show');
    totalCount += appointments.length;
    totalRevenue += active.reduce((sum, a) => sum + (a.price ?? 0), 0);
    y += 3;
  });

  addPlanningSummary(doc, totalCount, totalRevenue, y, themeColor, { label: `${totalCount} rendez-vous sur la semaine` });

  addFooterToAllPages(doc, salon, themeColor);
  doc.save(`planning-semaine-${first}.pdf`);
}
