import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { currentLang } from '../i18n';
import { decodeQr, parseQr } from '../qr';
import type { QrReceipt } from '../qr';
import { success } from '../haptic';
import { RECEIPT } from '../receiptText';
import ReceiptScanner from './ReceiptScanner';
import type { ScanResult } from './ReceiptScanner';
import { useHistoryLayer } from './useHistoryLayer';

type Mode = { k: 'live' } | { k: 'sheet'; initial?: QrReceipt; file?: File; autoPick?: 'camera' | 'gallery' };

/** Сканер: саҳифаи пурраи камера (QR-рамзи чек) → натиҷа; агар QR набошад — OCR-и матни чек. */
export default function ScanFlow({ onApply, onClose }: { onApply: (r: ScanResult) => void; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>({ k: 'live' });
  if (mode.k === 'sheet') {
    return <ReceiptScanner onApply={onApply} onClose={onClose} initial={mode.initial} initialFile={mode.file} autoPick={mode.autoPick} />;
  }
  return <LivePage onClose={onClose}
    onQr={q => { success(); setMode({ k: 'sheet', initial: q }); }}
    onOcr={(file, autoPick) => setMode({ k: 'sheet', file, autoPick })} />;
}

function LivePage({ onClose, onQr, onOcr }: { onClose: () => void; onQr: (q: QrReceipt) => void; onOcr: (file?: File, auto?: 'camera' | 'gallery') => void }) {
  const t = RECEIPT[currentLang()];
  useHistoryLayer(true, onClose);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [denied, setDenied] = useState(false);
  const [torch, setTorch] = useState(false);
  const [canTorch, setCanTorch] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    let live = true;
    let timer = 0;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (!live) { s.getTracks().forEach(x => x.stop()); return; }
        stream.current = s;
        const caps = s.getVideoTracks()[0]?.getCapabilities?.() as { torch?: boolean } | undefined;
        setCanTorch(!!caps?.torch);
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        await v.play().catch(() => {});
        let busy = false;
        timer = window.setInterval(async () => {
          if (busy || !live || !canvas.current || v.readyState < 2) return;
          busy = true;
          const raw = await decodeQr(v, canvas.current).catch(() => null);
          busy = false;
          if (raw && live) { live = false; onQr(parseQr(raw)); }
        }, 220);
      } catch { if (live) setDenied(true); }
    })();
    return () => { live = false; clearInterval(timer); stream.current?.getTracks().forEach(x => x.stop()); stream.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTorch = async () => {
    const tr = stream.current?.getVideoTracks()[0];
    if (!tr) return;
    try { await tr.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(x => !x); } catch { /* ignore */ }
  };

  const fromGallery = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f);
      const raw = canvas.current ? await decodeQr(bmp, canvas.current) : null;
      if (raw) { onQr(parseQr(raw)); return; }
    } catch { /* акс хонда нашуд → OCR */ }
    setNote(t.qrNone);
    onOcr(f);
  };

  return (
    <div className="scan" role="dialog" aria-modal="true" aria-label={t.pageTitle}>
      <video ref={video} className="scan-video" playsInline muted />
      <canvas ref={canvas} hidden />
      <div className="scan-shade" />
      <header className="scan-top">
        <button className="scan-btn" onClick={onClose} aria-label={t.back}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5m6-6-6 6 6 6" /></svg>
        </button>
        <b>{t.pageTitle}</b>
        <span className="grow" />
        {canTorch && (
          <button className={torch ? 'scan-btn on' : 'scan-btn'} onClick={() => void toggleTorch()} aria-label={t.torch} aria-pressed={torch}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 2h8v4l-2 3v11a2 2 0 0 1-4 0V9L8 6V2zM8 6h8" /></svg>
          </button>
        )}
      </header>
      <h2 className="scan-title">{t.qrHint}</h2>
      <div className="scan-frame" aria-hidden>
        <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
        <span className="scan-line" />
      </div>
      <div className="scan-bottom">
        {denied && <p className="scan-msg">{t.camDenied}</p>}
        {note && <p className="scan-msg">{note}</p>}
        <button className="scan-pill" onClick={() => gal.current?.click()}>{t.qrGallery}</button>
        <button className="scan-link" onClick={() => onOcr(undefined, 'camera')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5V3zM10 8h4M10 12h4" /></svg>
          <span>{t.qrOcr}</span>
        </button>
        <input ref={gal} type="file" accept="image/*" hidden onChange={e => void fromGallery(e)} />
      </div>
    </div>
  );
}
