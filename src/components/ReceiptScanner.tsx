import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { currentLang } from '../i18n';
import { fmt } from '../model';
import { prepareImage, readReceipt } from '../ocr';
import { parseReceipt } from '../receiptParse';
import { RECEIPT } from '../receiptText';
import Sheet from './Sheet';

export interface ScanResult { amount: number | null; merchant: string; date: string | null }

/** Сканери чек: акс → OCR дар дастгоҳ → маблағ/мағоза/сана (бо имкони ислоҳ). */
export default function ReceiptScanner({ onApply, onClose, initial, initialFile, autoPick }: {
  onApply: (r: ScanResult) => void; onClose: () => void;
  /** Натиҷаи тайёр (аз QR): бевосита ба қадами натиҷа. */
  initial?: { amount: number | null; merchant: string; date: string | null; raw: string };
  /** Акси тайёр (аз галерея): фавран хонда мешавад. */
  initialFile?: File;
  /** Фавран интихоби акс/камера кушода шавад. */
  autoPick?: 'camera' | 'gallery';
}) {
  const lang = currentLang();
  const t = RECEIPT[lang];
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'pick' | 'work' | 'result'>(initial ? 'result' : 'pick');
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [thumb, setThumb] = useState('');
  const [raw, setRaw] = useState(initial?.raw ?? '');
  const [cands, setCands] = useState<number[]>(initial?.amount ? [initial.amount] : []);
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [date, setDate] = useState(initial?.date ?? '');

  useEffect(() => () => { if (thumb) URL.revokeObjectURL(thumb); }, [thumb]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) await run(f);
  };
  useEffect(() => {
    if (initialFile) void run(initialFile);
    else if (autoPick && !initial) setTimeout(() => (autoPick === 'camera' ? cam : gal).current?.click(), 80);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (f: File) => {
    setError(''); setPct(0); setStatus(t.loadingLib); setStep('work');
    setThumb(URL.createObjectURL(f));
    try {
      const img = await prepareImage(f);
      const text = await readReceipt(img, lang === 'tg', (p, s) => { setPct(p); setStatus(s.includes('loading') ? t.loadingLib : t.reading); });
      const r = parseReceipt(text);
      setRaw(text.trim());
      setCands(r.candidates);
      setAmount(r.total !== null ? String(r.total) : '');
      setMerchant(r.merchant);
      setDate(r.date ?? '');
      if (!text.trim()) setError(t.failed);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error && err.message === 'offline' ? t.offline : t.failed);
      setStep('pick');
    }
  };

  const num = parseFloat(amount.replace(',', '.')) || 0;
  const input = (ref: React.RefObject<HTMLInputElement>, capture: boolean) => (
    <input ref={ref} type="file" accept="image/*" {...(capture ? { capture: 'environment' as const } : {})} hidden onChange={e => void onFile(e)} />
  );

  return (
    <Sheet title={t.title} onClose={onClose} tall>
      <div className="rcp">
        {step === 'pick' && (
          <>
            <div className="rcp-hero">🧾</div>
            <p className="fb-lead">{t.lead}</p>
            {error && <div className="alert danger">{error}</div>}
            <button className="btn big" onClick={() => cam.current?.click()}>📷 {t.camera}</button>
            <button className="btn secondary" onClick={() => gal.current?.click()}>🖼 {t.gallery}</button>
            <p className="fb-note">{t.privacy}</p>
            {input(cam, true)}{input(gal, false)}
          </>
        )}

        {step === 'work' && (
          <div className="rcp-work">
            {thumb && <img className="rcp-thumb" src={thumb} alt="" />}
            <div className="rcp-bar"><i style={{ width: `${Math.max(6, Math.round(pct * 100))}%` }} /></div>
            <b>{status}</b>
            <small>{t.firstTime}</small>
          </div>
        )}

        {step === 'result' && (
          <>
            <h4 className="gs-sub">{t.resultTitle}</h4>
            {thumb && <img className="rcp-thumb small" src={thumb} alt="" />}
            {error && <div className="alert danger">{error}</div>}
            <label className="fb-field">
              <span>{t.amount}</span>
              <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
              {num === 0 && <small className="fb-count warn">{t.notFound}</small>}
            </label>
            {cands.length > 1 && (
              <div className="quick-amts" role="group" aria-label={t.found}>
                {cands.map(c => <button key={c} type="button" className={Number(amount) === c ? 'qa on' : 'qa'} onClick={() => setAmount(String(c))}>{fmt(c)}</button>)}
              </div>
            )}
            <label className="fb-field"><span>{t.merchant}</span><input value={merchant} onChange={e => setMerchant(e.target.value)} /></label>
            <label className="fb-field"><span>{t.date}</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
            {raw && <details className="rcp-raw"><summary>{t.raw}</summary><pre>{raw}</pre></details>}
            <button className="btn big" disabled={num <= 0} onClick={() => { onApply({ amount: num > 0 ? num : null, merchant: merchant.trim(), date: date || null }); onClose(); }}>{t.apply}</button>
            <button className="btn secondary" onClick={() => { setStep('pick'); setError(''); }}>{t.retry}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}
