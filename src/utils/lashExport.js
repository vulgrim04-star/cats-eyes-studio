/** Export du schéma : SVG, PNG haute définition, fiche PDF A4, impression.
 *
 * Le schéma est vectoriel de bout en bout, et son aspect est porté par des attributs
 * SVG (voir `LashSector`) : la sérialisation est donc une simple copie du nœud, sans
 * avoir à recopier la moitié d'une feuille de style dans le fichier produit.
 */

import { MARGIN, PAGE_WIDTH, CONTENT_WIDTH, addFooterToAllPages, addHeader, addParagraph, addSectionBand, slug } from './pdfHelpers';
import { SIDE_LABEL, eyeLengths, getEye, lengthRange } from './lashModel';
import { formatMm } from './lashCalculations';
import { VIEWBOX } from './lashGeometry';
import { formatDateLong } from './date';
import { fullName } from './format';

/** Largeur du PNG exporté. 3840 px = 4K : de quoi imprimer la planche en A4 à plus de
 *  400 dpi, ou l'envoyer à une cliente sans qu'elle voie le moindre escalier. */
export const PNG_WIDTH = 3840;

/** Sérialise un `<svg>` du document en fichier autonome.
 *  Les attributs de présentation suffisent ; on ajoute seulement les déclarations
 *  d'espace de noms, absentes du DOM et exigées par les visionneuses.
 */
export function serializeSvg(svgElement) {
  if (!svgElement) return '';
  const clone = svgElement.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(VIEWBOX.width));
  clone.setAttribute('height', String(VIEWBOX.height));
  // Les états d'interaction n'ont rien à faire dans un fichier exporté.
  clone.querySelectorAll('[tabindex], [role="button"]').forEach((node) => {
    node.removeAttribute('tabindex');
    node.removeAttribute('role');
    node.removeAttribute('aria-pressed');
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Révocation différée : Safari lit l'URL après le clic, pas pendant.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Rasterise un SVG en PNG.
 *
 * Seul endroit du module où un canvas apparaît : il ne sert QU'À convertir, jamais à
 * dessiner — le schéma reste vectoriel partout ailleurs.
 * @returns {Promise<Blob>}
 */
export function svgToPngBlob(svgElement, width = PNG_WIDTH) {
  const markup = serializeSvg(svgElement);
  const height = Math.round((width * VIEWBOX.height) / VIEWBOX.width);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Rastérisation impossible'))), 'image/png');
    };
    image.onerror = () => reject(new Error('SVG illisible'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

function baseName(client, map) {
  return `lash-map-${slug(fullName(client))}-${map.date}`;
}

export function exportSvgFile(svgElement, client, map) {
  const blob = new Blob([serializeSvg(svgElement)], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, `${baseName(client, map)}.svg`);
}

export async function exportPngFile(svgElement, client, map) {
  const blob = await svgToPngBlob(svgElement);
  downloadBlob(blob, `${baseName(client, map)}.png`);
}

/** Tableau des longueurs d'un œil, du coin interne au coin externe. */
function addSectorTable(doc, eye, y) {
  const lengths = eyeLengths(eye);
  const columns = Math.min(lengths.length, 12);
  const cellWidth = CONTENT_WIDTH / columns;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text('INTERNE', MARGIN, y);
  doc.text('EXTERNE', PAGE_WIDTH - MARGIN, y, { align: 'right' });
  y += 4;

  doc.setDrawColor(220, 210, 195);
  doc.setFillColor(250, 247, 242);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 9, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(43, 39, 36);
  lengths.slice(0, columns).forEach((mm, index) => {
    doc.text(formatMm(mm), MARGIN + cellWidth * (index + 0.5), y + 6, { align: 'center' });
  });
  doc.setTextColor(0);
  return y + 14;
}

/** Fiche PDF A4 : en-tête du salon, cliente, les deux yeux en haute définition,
 *  longueurs chiffrées et notes. C'est cette fiche qui remplace le papier.
 * @param {{client:object, map:object, salon:object, svgs:{left:Element, right:Element}}} params
 */
export async function exportLashMapPdf({ client, map, salon, svgs }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  let y = addHeader(doc, 'Lash map', salon);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(fullName(client), MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${formatDateLong(map.date)}  ·  ${map.poseType}`, MARGIN, y + 5);
  doc.setTextColor(0);
  y += 12;

  const imageWidth = CONTENT_WIDTH;
  const imageHeight = (imageWidth * VIEWBOX.height) / VIEWBOX.width;

  for (const side of ['right', 'left']) {
    const element = svgs?.[side];
    if (!element) continue;
    const eye = getEye(map, side);

    y = addSectionBand(doc, `${SIDE_LABEL[side]} — ${lengthRange(eye)}`, y);

    if (y + imageHeight > 275) {
      doc.addPage();
      y = 20;
    }

    try {
      const blob = await svgToPngBlob(element, 1600);
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      doc.addImage(dataUrl, 'PNG', MARGIN, y, imageWidth, imageHeight, undefined, 'FAST');
      y += imageHeight + 4;
    } catch {
      // Rastérisation impossible (navigateur restrictif) : la fiche reste utilisable,
      // les longueurs chiffrées ci-dessous portent l'essentiel de l'information.
      doc.setFontSize(9);
      doc.text('Schéma non disponible dans cet export.', MARGIN, y);
      y += 6;
    }

    y = addSectorTable(doc, eye, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const specs = [
      `Technique : ${eye.global.style}`,
      `Courbure : ${eye.global.curl}`,
      `Épaisseur : ${eye.global.diameter} mm`,
      `Densité : ${eye.global.density}`,
      `Couleur : ${eye.global.color}`,
    ].join('   ·   ');
    doc.text(doc.splitTextToSize(specs, CONTENT_WIDTH), MARGIN, y);
    y += 8;

    const custom = eye.zones
      .map((zone, index) => ({ zone, index }))
      .filter(({ zone }) => zone.notes || ['curl', 'diameter', 'style', 'color', 'density'].some((f) => zone[f]));
    if (custom.length > 0) {
      const text = custom
        .map(({ zone, index }) => {
          const details = ['curl', 'diameter', 'style', 'color', 'density']
            .filter((f) => zone[f])
            .map((f) => zone[f])
            .join(', ');
          return `S${index + 1} : ${[details, zone.notes].filter(Boolean).join(' — ')}`;
        })
        .join('   ·   ');
      y = addParagraph(doc, `Personnalisations : ${text}`, y, { fontSize: 8.5 });
    }
    y += 4;
  }

  const notes = [
    ['Cils naturels', map.lashHealth],
    ['Colle', map.adhesive],
    ['Produits', map.products],
    ['Temps de pose', map.poseDuration],
    ['Sensibilités', map.sensitivities],
    ['Conseils', map.advice],
    ['Observations', map.notes],
  ].filter(([, value]) => value);

  if (notes.length > 0) {
    y = addSectionBand(doc, 'Notes', y);
    notes.forEach(([label, value]) => {
      y = addParagraph(doc, `${label} : ${value}`, y, { fontSize: 9 });
    });
  }

  addFooterToAllPages(doc, salon);
  doc.save(`${baseName(client, map)}.pdf`);
}

/** Impression : on ouvre une fenêtre ne contenant QUE la planche, en A4.
 *  Passer par `window.print()` sur la page complète imprimerait la navigation, les
 *  panneaux et la frise — la praticienne veut la planche, rien d'autre. */
export function printLashMap({ client, map, svgs }) {
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) return false;

  const sections = ['right', 'left']
    .filter((side) => svgs?.[side])
    .map((side) => `
      <section>
        <h2>${SIDE_LABEL[side]} — ${lengthRange(getEye(map, side))}</h2>
        ${serializeSvg(svgs[side]).replace(/<\?xml.*?\?>\n/, '')}
      </section>`)
    .join('');

  win.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Lash map — ${fullName(client)}</title>
    <style>
      @page { size: A4 portrait; margin: 14mm; }
      body { font-family: 'DM Sans', 'Segoe UI', sans-serif; color: #2B2724; margin: 0; }
      header { border-bottom: 2px solid #C9A961; padding-bottom: 8px; margin-bottom: 16px; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p.meta { margin: 0; color: #9C8A73; font-size: 12px; }
      section { page-break-inside: avoid; margin-bottom: 18px; }
      h2 { font-size: 13px; margin: 0 0 6px; color: #7A612A; }
      svg { width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <header>
      <h1>Lash map — ${fullName(client)}</h1>
      <p class="meta">${formatDateLong(map.date)} · ${map.poseType} · ${salonLine(map)}</p>
    </header>
    ${sections}
  </body>
</html>`);
  win.document.close();
  win.focus();
  // Laisse au navigateur le temps de mettre en page avant d'ouvrir la boîte d'impression.
  setTimeout(() => win.print(), 400);
  return true;
}

function salonLine(map) {
  const eye = getEye(map, 'right');
  return `${eye.global.style} · ${eye.global.curl} · ${eye.global.diameter} mm · ${eye.global.density}`;
}
