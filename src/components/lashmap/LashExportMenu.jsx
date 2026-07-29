import { useRef, useState } from 'react';
import Icon from '../common/Icon';
import { useToast } from '../../hooks/useToast';
import { exportLashMapPdf, exportPngFile, exportSvgFile, printLashMap } from '../../utils/lashExport';
import styles from './styles/LashMap.module.css';

/** Menu d'export : la planche part en PDF, en image ou à l'imprimante.
 *  Les deux yeux sont toujours inclus — c'est la fiche de la séance, pas une capture. */
export default function LashExportMenu({ client, map, salon, svgs, side }) {
  const details = useRef(null);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (label, action) => {
    if (details.current) details.current.open = false;
    setBusy(true);
    try {
      await action();
    } catch {
      showToast(`Export ${label} impossible sur ce navigateur`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const actions = [
    {
      key: 'pdf',
      label: 'Fiche PDF (A4)',
      hint: 'Les deux yeux, longueurs et notes',
      run: () => exportLashMapPdf({ client, map, salon, svgs: svgs.current }),
    },
    {
      key: 'png',
      label: 'Image PNG 4K',
      hint: "L'œil affiché, 3840 px",
      run: () => exportPngFile(svgs.current[side], client, map),
    },
    {
      key: 'svg',
      label: 'Fichier SVG',
      hint: 'Vectoriel, redimensionnable à l’infini',
      run: async () => exportSvgFile(svgs.current[side], client, map),
    },
    {
      key: 'print',
      label: 'Imprimer',
      hint: 'Planche seule, format A4',
      run: async () => {
        if (!printLashMap({ client, map, svgs: svgs.current })) {
          showToast('Autorisez les fenêtres surgissantes pour imprimer', 'warning');
        }
      },
    },
  ];

  return (
    <details className={styles.exportMenu} ref={details}>
      <summary className={styles.exportSummary} aria-busy={busy}>
        <Icon name="download" size={15} /> {busy ? 'Export…' : 'Exporter'}
      </summary>
      <div className={styles.exportList}>
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            className={styles.exportItem}
            onClick={() => run(action.label, action.run)}
          >
            <span className={styles.exportItemLabel}>{action.label}</span>
            <span className={styles.exportItemHint}>{action.hint}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
