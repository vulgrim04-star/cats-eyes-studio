import { fullName } from './format';
import { formatDateLong } from './date';
import {
  GDPR_INTRO,
  GDPR_CLAUSES,
  GDPR_AGREEMENT_LABEL,
  HEALTH_FORM_TITLE,
  HEALTH_FORM_INTRO,
  HEALTH_FORM_CONDITIONS,
  HEALTH_FORM_WARNING,
  HEALTH_FORM_PATCH_TEST,
  HEALTH_FORM_POST_CARE_INTRO,
  HEALTH_FORM_POST_CARE,
  HEALTH_FORM_IMAGE_RIGHTS_LABEL,
  HEALTH_FORM_ACKNOWLEDGEMENTS,
} from '../data/consentText';

const MARGIN = 18;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function slug(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function addHeader(doc, title, salon) {
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

function addParagraph(doc, text, y, { fontSize = 10, lineHeight = 5, bold = false } = {}) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(lines, MARGIN, y);
  return y + lines.length * lineHeight;
}

function addBulletList(doc, items, y, { fontSize = 10, lineHeight = 5 } = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  items.forEach((item) => {
    const lines = doc.splitTextToSize(`•  ${item}`, CONTENT_WIDTH - 4);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * lineHeight;
  });
  return y;
}

function ensureSpace(doc, y, needed) {
  if (y + needed > 280) {
    doc.addPage();
    return 20;
  }
  return y;
}

function addSignatureBlock(doc, y, { clientName, clientSignatureUrl, date, managerName }) {
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

export async function generateGdprConsentPdf(client, salon) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = addHeader(doc, 'Consentement RGPD & protection des données', salon);

  y = addParagraph(doc, `Cliente : ${fullName(client)}`, y, { bold: true });
  y += 3;
  y = addParagraph(doc, GDPR_INTRO, y);
  y += 2;
  y = addBulletList(doc, GDPR_CLAUSES, y);
  y += 3;
  y = addParagraph(doc, GDPR_AGREEMENT_LABEL, y, { bold: true });

  addSignatureBlock(doc, y, {
    clientName: fullName(client),
    clientSignatureUrl: client.consentSignatureUrl,
    date: client.consentDate,
    managerName: salon?.managerName,
  });

  doc.save(`consentement-rgpd-${slug(fullName(client))}.pdf`);
}

function ouiNon(value) {
  if (value === 'oui') return 'Oui';
  if (value === 'non') return 'Non';
  return '—';
}

export async function generateHealthFormPdf(client, salon) {
  const { jsPDF } = await import('jspdf');
  const answers = client.healthFormAnswers ?? {};
  const doc = new jsPDF();
  let y = addHeader(doc, HEALTH_FORM_TITLE, salon);

  y = addParagraph(doc, `Cliente : ${fullName(client)}`, y, { bold: true });
  y += 3;
  y = addParagraph(doc, HEALTH_FORM_INTRO, y);
  y += 4;

  y = addParagraph(doc, 'Déclaration de santé', y, { bold: true, fontSize: 11 });
  y += 1;
  HEALTH_FORM_CONDITIONS.forEach((cond) => {
    y = ensureSpace(doc, y, 10);
    const lines = doc.splitTextToSize(cond.label, CONTENT_WIDTH - 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(lines, MARGIN, y);
    doc.setFont('helvetica', 'bold');
    doc.text(ouiNon(answers.conditions?.[cond.key]), PAGE_WIDTH - MARGIN - 12, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += lines.length * 5 + 1;
  });
  y += 2;
  doc.setTextColor(150, 90, 40);
  y = addParagraph(doc, HEALTH_FORM_WARNING, y, { fontSize: 8.5 });
  doc.setTextColor(0);
  y += 3;

  y = ensureSpace(doc, y, 20);
  y = addParagraph(doc, 'Test de sensibilité (patch test)', y, { bold: true, fontSize: 11 });
  y += 1;
  y = addBulletList(
    doc,
    HEALTH_FORM_PATCH_TEST.map((label, i) => `[${(i === 0 ? answers.patchTestDone : answers.patchTestAcknowledged) ? 'x' : ' '}] ${label}`),
    y
  );
  y += 3;

  y = ensureSpace(doc, y, 30);
  y = addParagraph(doc, HEALTH_FORM_POST_CARE_INTRO, y, { bold: true, fontSize: 11 });
  y += 1;
  y = addBulletList(doc, HEALTH_FORM_POST_CARE, y);
  y += 3;

  y = ensureSpace(doc, y, 15);
  y = addParagraph(doc, 'Droit à l\'image', y, { bold: true, fontSize: 11 });
  y += 1;
  y = addParagraph(
    doc,
    `${HEALTH_FORM_IMAGE_RIGHTS_LABEL} : ${answers.imageRights === 'authorize' ? 'Autorisé par la cliente' : 'Non autorisé par la cliente'}`,
    y
  );
  y += 3;

  y = ensureSpace(doc, y, 30);
  y = addParagraph(doc, 'Je reconnais que :', y, { bold: true, fontSize: 11 });
  y += 1;
  y = addBulletList(doc, HEALTH_FORM_ACKNOWLEDGEMENTS, y);

  addSignatureBlock(doc, y, {
    clientName: fullName(client),
    clientSignatureUrl: client.healthFormSignatureUrl,
    date: client.healthFormDate,
    managerName: salon?.managerName,
  });

  doc.save(`fiche-sante-consentement-${slug(fullName(client))}.pdf`);
}
