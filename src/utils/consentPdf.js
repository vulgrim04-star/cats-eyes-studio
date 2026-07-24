import { fullName } from './format';
import { MARGIN, PAGE_WIDTH, CONTENT_WIDTH, slug, addHeader, addParagraph, addBulletList, ensureSpace, addSignatureBlock } from './pdfHelpers';
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
