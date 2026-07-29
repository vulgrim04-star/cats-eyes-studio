import { fullName, formatPrice } from './format';
import { formatDateLong } from './date';
import {
  MARGIN,
  PAGE_WIDTH,
  CONTENT_WIDTH,
  slug,
  addHeader,
  addParagraph,
  addSectionBand,
  addFooterToAllPages,
  ensureSpace,
  imageFormatOf,
  hexToRgb,
  shade,
} from './pdfHelpers';
import { pathToDataUrl } from './photoStorage';
import { eyeLengths, normalizeLashMap } from './lashModel';
import { formatMm } from './lashCalculations';

function addLabelValueGrid(doc, pairs, y, rgb) {
  const visible = pairs.filter(([, value]) => value);
  const colWidth = CONTENT_WIDTH / 2;
  const labelColor = shade(rgb, 0.15);
  for (let i = 0; i < visible.length; i += 2) {
    y = ensureSpace(doc, y, 12);
    visible.slice(i, i + 2).forEach(([label, value], idx) => {
      const x = MARGIN + idx * colWidth;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(labelColor.r, labelColor.g, labelColor.b);
      doc.text(label.toUpperCase(), x, y);
      doc.setTextColor(35, 30, 32);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(String(value), colWidth - 6);
      doc.text(lines, x, y + 5);
      doc.setTextColor(0);
    });
    y += 13;
  }
  return y;
}

/** Construit le document jsPDF sans le télécharger — utilisé à la fois pour l'aperçu
 * (affiché dans une iframe) et pour le téléchargement final. */
export async function buildClientSheetPdf(client, appointments, salon, sections) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const rgb = hexToRgb(BRAND_GOLD);
  let y = addHeader(doc, 'Fiche cliente', salon);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(35, 30, 32);
  doc.text(fullName(client), MARGIN, y + 2);
  doc.setTextColor(0);
  const nameLineY = y;
  y += 11;

  if (sections.identity) {
    if (client.photoUrl) {
      try {
        const size = 26;
        doc.addImage(client.photoUrl, imageFormatOf(client.photoUrl), PAGE_WIDTH - MARGIN - size, nameLineY - 6, size, size, undefined, 'FAST');
        y = Math.max(y, nameLineY - 6 + size + 4);
      } catch {
        // Photo illisible : on continue sans bloquer la génération du PDF.
      }
    }
    y = addSectionBand(doc, 'Informations générales', y);
    y = addLabelValueGrid(doc, [
      ['Téléphone', client.phone],
      ['Email', client.email],
      ['Instagram', client.instagram ? `@${client.instagram}` : ''],
      ['Cliente depuis', client.createdAt ? formatDateLong(client.createdAt) : ''],
      ['Anniversaire', client.birthday ? formatDateLong(client.birthday) : ''],
      ['Préférence de contact', client.contactPreference],
      ['Comment elle nous a connus', client.referralSource],
      ['Type de cils', client.lashType],
      ['Courbure habituelle', client.curl],
      ['Longueur habituelle', client.length],
      ['Allergies', client.allergies],
      ['Contre-indications', client.contraindications],
    ], y, rgb);
    y += 3;
  }

  if (sections.notes && client.notes) {
    y = addSectionBand(doc, 'Notes', y);
    y = addParagraph(doc, client.notes, y, { fontSize: 9.5 });
    y += 3;
  }

  if (sections.history && appointments.length > 0) {
    y = addSectionBand(doc, 'Historique des rendez-vous', y);
    const STATUS_LABELS = { confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', 'no-show': 'No-show', pending: 'En attente' };
    appointments.forEach((apt) => {
      y = ensureSpace(doc, y, 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const label = `${formatDateLong(apt.date)} à ${apt.time} — ${apt.service?.name ?? 'Prestation'}`;
      doc.text(doc.splitTextToSize(label, CONTENT_WIDTH - 55), MARGIN, y);
      doc.setFont('helvetica', 'bold');
      const rightLabel = apt.status === 'cancelled' || apt.status === 'no-show'
        ? (STATUS_LABELS[apt.status] ?? apt.status)
        : formatPrice(apt.price ?? 0);
      doc.text(rightLabel, PAGE_WIDTH - MARGIN, y, { align: 'right' });
      y += 6;
    });
    y += 2;
  }

  if (sections.lashMaps && (client.lashMaps ?? []).length > 0) {
    y = addSectionBand(doc, 'Lash Maps', y);
    const mapTitleColor = shade(rgb, 0.1);
    client.lashMaps.forEach((map) => {
      y = ensureSpace(doc, y, 26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(mapTitleColor.r, mapTitleColor.g, mapTitleColor.b);
      doc.text(`${formatDateLong(map.date)} — ${map.poseType || 'Séance'}`, MARGIN, y);
      doc.setTextColor(0);
      y += 5.5;

      // La fiche peut dater d'avant le modèle par secteurs : on la normalise pour lire
      // les deux formes sans dupliquer la logique de conversion.
      const lashMap = normalizeLashMap(map);
      const { global } = lashMap.rightEye;
      const sameGlobals = JSON.stringify(global) === JSON.stringify(lashMap.leftEye.global);
      const specs = [
        ["Forme de l'œil", lashMap.eyeShape],
        ['Forme de la pose', lashMap.setShape],
        ['Technique', global.style],
        ['Courbure', global.curl],
        ['Épaisseur', global.diameter && `${global.diameter} mm`],
        ['Densité', global.density],
        ['Couleur', global.color],
        ['Colle', lashMap.adhesive],
        ['Durée de pose', lashMap.poseDuration],
        ['Durée de remplissage', lashMap.fillDuration],
        ['Réglages œil gauche', sameGlobals ? '' : `${lashMap.leftEye.global.style} · ${lashMap.leftEye.global.curl} · ${lashMap.leftEye.global.diameter} mm`],
      ].filter(([, v]) => v);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const specText = specs.map(([l, v]) => `${l} : ${v}`).join('   ·   ');
      if (specText) {
        const lines = doc.splitTextToSize(specText, CONTENT_WIDTH);
        doc.text(lines, MARGIN, y);
        y += lines.length * 4.5;
      }

      // Longueurs listées du coin interne vers le coin externe, pour les deux yeux.
      const zonesL = eyeLengths(lashMap.leftEye).map(formatMm).join(' · ');
      const zonesR = eyeLengths(lashMap.rightEye).map(formatMm).join(' · ');
      if (zonesL || zonesR) {
        y += 1;
        doc.text(`Œil gauche, interne → externe (mm) : ${zonesL || '—'}`, MARGIN, y);
        y += 4.5;
        doc.text(`Œil droit, interne → externe (mm) : ${zonesR || '—'}`, MARGIN, y);
        y += 4.5;
      }

      [['Conseils', lashMap.advice], ['Produits', lashMap.products], ['Sensibilités', lashMap.sensitivities], ['Notes', lashMap.notes]]
        .filter(([, value]) => value)
        .forEach(([label, value]) => {
          y += 1;
          y = addParagraph(doc, `${label} : ${value}`, y, { fontSize: 8.5 });
        });
      y += 5;
    });
  }

  if (sections.photos && (client.photos ?? []).length > 0) {
    y = addSectionBand(doc, 'Photos avant / après', y);

    // jsPDF ne sait pas charger une URL distante : on résout d'abord toutes les photos
    // stockées en data URL, en parallèle, avant de commencer à dessiner.
    const resolved = new Map();
    await Promise.all(
      client.photos.flatMap((photo) =>
        [photo.beforePath, photo.afterPath].filter(Boolean).map(async (path) => {
          const dataUrl = await pathToDataUrl(path);
          if (dataUrl) resolved.set(path, dataUrl);
        })
      )
    );
    const srcFor = (path, legacyUrl) => (path ? resolved.get(path) : legacyUrl) || null;

    client.photos.forEach((photo) => {
      y = ensureSpace(doc, y, 65);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`${formatDateLong(photo.sessionDate)}${photo.label ? ' — ' + photo.label : ''}`, MARGIN, y);
      y += 5;

      const imgW = (CONTENT_WIDTH - 6) / 2;
      const imgH = 50;
      const beforeSrc = srcFor(photo.beforePath, photo.beforeUrl);
      const afterSrc = srcFor(photo.afterPath, photo.afterUrl);
      if (beforeSrc) {
        try {
          doc.addImage(beforeSrc, imageFormatOf(beforeSrc), MARGIN, y, imgW, imgH, undefined, 'FAST');
        } catch {
          // Photo illisible : on continue sans bloquer la génération du PDF.
        }
      }
      if (afterSrc) {
        try {
          doc.addImage(afterSrc, imageFormatOf(afterSrc), MARGIN + imgW + 6, y, imgW, imgH, undefined, 'FAST');
        } catch {
          // Photo illisible : on continue sans bloquer la génération du PDF.
        }
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text('Avant', MARGIN, y + imgH + 4);
      doc.text('Après', MARGIN + imgW + 6, y + imgH + 4);
      doc.setTextColor(0);
      y += imgH + 11;
    });
  }

  addFooterToAllPages(doc, salon);
  return doc;
}

export async function generateClientSheetPdf(client, appointments, salon, sections) {
  const doc = await buildClientSheetPdf(client, appointments, salon, sections);
  doc.save(`fiche-cliente-${slug(fullName(client))}.pdf`);
}
