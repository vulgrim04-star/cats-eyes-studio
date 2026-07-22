import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import styles from './SignaturePad.module.css';

export default function SignaturePad({ onChange, resetKey }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);

  const getContext = () => canvasRef.current?.getContext('2d');

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = getContext();
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3B2A30';
  };

  useEffect(() => {
    resizeCanvas();
    setHasSignature(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const pointFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFromEvent(e);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const ctx = getContext();
    const point = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (!hasSignature) setHasSignature(true);
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div>
      <div className={styles.wrap}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => { if (drawingRef.current) handlePointerUp(); }}
        />
        {!hasSignature && <span className={styles.placeholder}>Signez ici avec le doigt ou la souris</span>}
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.clearBtn} onClick={handleClear}>
          <Icon name="x" size={12} /> Effacer
        </button>
      </div>
    </div>
  );
}
