import { useState } from 'react';
import { DRAG_MIME } from '../../hooks/useSectorInteractions';
import { CURLS, DENSITIES, DIAMETERS, QUICK_LENGTHS, effectiveZone, getEye } from '../../utils/lashModel';
import { formatMm } from '../../utils/lashCalculations';
import styles from './styles/LashMap.module.css';

/** Rangées de réglage rapide, sous le schéma.
 *
 * Deux façons de s'en servir, l'une pour chaque main : toucher une pastille l'applique
 * au secteur sélectionné (le geste du téléphone), la faire glisser sur un secteur
 * l'applique à celui-là (le geste de la souris). Sans secteur sélectionné, les
 * réglages autres que la longueur s'appliquent à l'œil entier.
 */
export default function LashQuickPicker({ editor, selectedIndex }) {
  const [draggingValue, setDraggingValue] = useState(null);
  const eye = getEye(editor.map, editor.side);
  const zone = selectedIndex === null ? null : effectiveZone(eye, selectedIndex);

  const rows = [
    {
      field: 'length',
      label: 'Longueurs',
      options: QUICK_LENGTHS,
      format: (value) => `${value}`,
      current: zone ? zone.length : null,
      needsSector: true,
    },
    { field: 'curl', label: 'Courbure', options: CURLS, current: zone ? zone.curl : eye.global.curl },
    { field: 'diameter', label: 'Épaisseur', options: DIAMETERS, current: zone ? zone.diameter : eye.global.diameter },
    { field: 'density', label: 'Densité', options: DENSITIES, current: zone ? zone.density : eye.global.density },
  ];

  const apply = (field, value) => {
    if (field === 'length') {
      if (selectedIndex === null) return;
      editor.setLength(selectedIndex, value);
      return;
    }
    if (selectedIndex === null) editor.setGlobal(field, value);
    else editor.setZoneProperty(selectedIndex, field, value);
  };

  return (
    <div className={styles.picker}>
      {rows.map((row) => {
        const disabled = row.needsSector && selectedIndex === null;
        return (
          <div className={styles.pickerRow} key={row.field}>
            <span className={styles.pickerLabel}>{row.label}</span>
            <div className={styles.pickerChips} role="group" aria-label={row.label}>
              {row.options.map((option) => {
                const active = String(row.current) === String(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={[
                      styles.chip,
                      active ? styles.chipActive : '',
                      draggingValue === `${row.field}:${option}` ? styles.chipDragging : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={active}
                    disabled={disabled}
                    draggable={!disabled}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_MIME, JSON.stringify({ field: row.field, value: option }));
                      event.dataTransfer.effectAllowed = 'copy';
                      setDraggingValue(`${row.field}:${option}`);
                    }}
                    onDragEnd={() => setDraggingValue(null)}
                    onClick={() => apply(row.field, option)}
                  >
                    {row.format ? row.format(option) : option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className={styles.pickerHint}>
        {selectedIndex === null
          ? 'Touchez un secteur du schéma pour le modifier — sans sélection, courbure, épaisseur et densité s’appliquent à tout l’œil.'
          : `Secteur ${selectedIndex + 1} sélectionné (${formatMm(zone.length)} mm) — touchez une valeur, ou faites-la glisser sur un autre secteur.`}
      </p>
    </div>
  );
}
