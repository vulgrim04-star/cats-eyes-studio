import { useMemo, useRef, useState } from 'react';
import Icon from '../common/Icon';
import { useToast } from '../../hooks/useToast';
import { fileToResizedDataUrl } from '../../utils/image';
import { slug } from '../../utils/pdfHelpers';
import { todayISO } from '../../utils/date';
import { EFFECTS, LOCAL_WIDTH, LASH_LINE_ARC, buildLashLines } from '../../utils/lashOverlayShapes';
import styles from './LashSimulatorTab.module.css';

const OVERLAY_SIZE = 260; // taille de rendu de l'aperçu SVG, en px CSS, à l'échelle 1

const DEFAULT_TRANSFORM = { x: 0, y: -10, scale: 1, rotation: 0 };

function LashOverlaySvg({ style, size }) {
  const lines = useMemo(() => buildLashLines(style), [style]);
  const half = LOCAL_WIDTH / 2;
  const { p0, p1, p2 } = LASH_LINE_ARC;
  return (
    <svg viewBox={`${-half} -80 ${LOCAL_WIDTH} 160`} width={size} height={(size * 160) / LOCAL_WIDTH} style={{ overflow: 'visible' }}>
      <path
        d={`M${p0.x} ${p0.y} Q${p1.x} ${p1.y} ${p2.x} ${p2.y}`}
        fill="none"
        stroke="rgba(20, 14, 10, 0.55)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#160f0a" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export default function LashSimulatorTab({ client }) {
  const { showToast } = useToast();
  const [photoUrl, setPhotoUrl] = useState('');
  const [style, setStyle] = useState(EFFECTS[0]);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const containerRef = useRef(null);

  const beforePhotos = (client.photos ?? []).filter((p) => p.beforeUrl);

  const handleFile = async (file) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 900);
      setPhotoUrl(dataUrl);
      setTransform(DEFAULT_TRANSFORM);
    } catch {
      showToast("Impossible de lire cette photo", 'error');
    }
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = transform.x;
    const origY = transform.y;
    const onMove = (ev) => {
      setTransform((t) => ({ ...t, x: origX + (ev.clientX - startX), y: origY + (ev.clientY - startY) }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleExport = () => {
    const imgEl = containerRef.current?.querySelector('img');
    if (!imgEl || !containerRef.current) return;

    const nw = imgEl.naturalWidth;
    const nh = imgEl.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, nw, nh);

    const rect = containerRef.current.getBoundingClientRect();
    const scaleFactor = nw / rect.width;
    const cx = nw / 2 + transform.x * scaleFactor;
    const cy = nh / 2 + transform.y * scaleFactor;
    const overlayPxWidth = OVERLAY_SIZE * scaleFactor * transform.scale;
    const localScale = overlayPxWidth / LOCAL_WIDTH;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(localScale, localScale);

    const { p0, p1, p2 } = LASH_LINE_ARC;
    ctx.strokeStyle = 'rgba(20, 14, 10, 0.55)';
    ctx.lineWidth = 3 / localScale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
    ctx.stroke();

    ctx.strokeStyle = '#160f0a';
    ctx.lineWidth = 2 / localScale;
    buildLashLines(style).forEach((l) => {
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    });
    ctx.restore();

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-${slug(style)}-${todayISO()}.png`;
    a.click();
    showToast('Aperçu téléchargé', 'success');
  };

  return (
    <div>
      <p className={styles.intro}>
        Positionnez un style de cils sur une photo pour donner un aperçu à la cliente avant la
        pose — placement manuel, à ajuster à la souris ou au doigt.
      </p>

      {!photoUrl && (
        <div className={styles.photoPicker}>
          <label htmlFor="sim-photo-input" className={styles.uploadCard}>
            <Icon name="camera" size={22} />
            Prendre ou choisir une photo
            <input
              id="sim-photo-input"
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
          </label>

          {beforePhotos.length > 0 && (
            <div className={styles.existingRow}>
              <span className={styles.existingLabel}>Ou reprendre une photo existante :</span>
              <div className={styles.existingThumbs}>
                {beforePhotos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={styles.existingThumb}
                    onClick={() => { setPhotoUrl(p.beforeUrl); setTransform(DEFAULT_TRANSFORM); }}
                  >
                    <img src={p.beforeUrl} alt={p.label} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {photoUrl && (
        <>
          <div className={styles.stageWrap}>
            <div className={styles.stage} ref={containerRef}>
              <img src={photoUrl} alt="" className={styles.photo} />
              <div
                className={styles.overlayHandle}
                style={{
                  transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
                }}
                onPointerDown={handlePointerDown}
              >
                <LashOverlaySvg style={style} size={OVERLAY_SIZE} />
              </div>
            </div>
            <button type="button" className={styles.changePhotoBtn} onClick={() => setPhotoUrl('')}>
              <Icon name="x" size={12} /> Changer de photo
            </button>
          </div>

          <div className={styles.chipRow}>
            {EFFECTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`${styles.chip} ${style === s ? styles.chipActive : ''}`}
                onClick={() => setStyle(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className={styles.sliders}>
            <label className={styles.sliderRow}>
              <span>Taille</span>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={transform.scale}
                onChange={(e) => setTransform((t) => ({ ...t, scale: parseFloat(e.target.value) }))}
              />
            </label>
            <label className={styles.sliderRow}>
              <span>Rotation</span>
              <input
                type="range"
                min="-45"
                max="45"
                step="1"
                value={transform.rotation}
                onChange={(e) => setTransform((t) => ({ ...t, rotation: parseFloat(e.target.value) }))}
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTransform(DEFAULT_TRANSFORM)}>
              Réinitialiser la position
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleExport}>
              <Icon name="download" size={14} /> Télécharger l'aperçu
            </button>
          </div>
        </>
      )}
    </div>
  );
}
