import { parseDate, toNumber } from './receiptParse';

/** Хондани QR: BarcodeDetector (Chrome/Android) ё jsQR (бор мешавад танҳо вақти зарурат). */
interface Detector { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
declare global {
  interface Window {
    BarcodeDetector?: { new (o?: { formats: string[] }): Detector };
    jsQR?: (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
  }
}

let det: Detector | null | undefined;
const detector = (): Detector | null => {
  if (det !== undefined) return det;
  try { det = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null; } catch { det = null; }
  return det;
};

let jsqrLoad: Promise<void> | null = null;
function loadJsQr(): Promise<void> {
  if (window.jsQR) return Promise.resolve();
  if (!jsqrLoad) {
    jsqrLoad = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      s.async = true;
      s.onload = () => res();
      s.onerror = () => { jsqrLoad = null; rej(new Error('jsqr')); };
      document.head.appendChild(s);
    });
  }
  return jsqrLoad;
}

/** Як кадр (видео ё акс) → матни QR ё null. */
export async function decodeQr(src: HTMLVideoElement | HTMLImageElement | ImageBitmap, canvas: HTMLCanvasElement): Promise<string | null> {
  const d = detector();
  if (d) {
    try { const r = await d.detect(src); if (r[0]?.rawValue) return r[0].rawValue; return null; } catch { /* ба jsQR мегузарем */ }
  }
  try { await loadJsQr(); } catch { return null; }
  const w = 'videoWidth' in src ? src.videoWidth : src.width;
  const h = 'videoHeight' in src ? src.videoHeight : src.height;
  if (!w || !h) return null;
  const k = Math.min(1, 800 / Math.max(w, h));
  canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
  const x = canvas.getContext('2d', { willReadFrequently: true });
  if (!x) return null;
  x.drawImage(src, 0, 0, canvas.width, canvas.height);
  const img = x.getImageData(0, 0, canvas.width, canvas.height);
  return window.jsQR?.(img.data, img.width, img.height)?.data ?? null;
}

export interface QrReceipt { amount: number | null; date: string | null; merchant: string; raw: string }

const AMOUNT_KEYS = ['sum', 'summa', 'amount', 'total', 'price', 's', 'itog', 'jami'];
const DATE_KEYS = ['t', 'date', 'dt', 'time', 'datetime'];

/** Матни QR-и чек: суроға бо параметрҳо (sum=, s=, t=…) ё «Сумма: 59.00». Чекҳои фискалӣ одатан инро доранд. */
export function parseQr(raw: string, now = new Date()): QrReceipt {
  let amount: number | null = null;
  let date: string | null = null;
  let merchant = '';
  const params: [string, string][] = [];
  try {
    const u = new URL(raw);
    u.searchParams.forEach((v, k) => params.push([k.toLowerCase(), v]));
    // параметрҳо дар қисми # ҳам метавонанд бошанд
    if (u.hash.includes('=')) new URLSearchParams(u.hash.replace(/^#\??/, '')).forEach((v, k) => params.push([k.toLowerCase(), v]));
  } catch {
    // на суроға: «k=v&k=v» ё сатрҳои «Калид: қимат»
    if (raw.includes('=')) new URLSearchParams(raw).forEach((v, k) => params.push([k.toLowerCase(), v]));
  }
  for (const [k, v] of params) {
    if (amount === null && AMOUNT_KEYS.includes(k)) amount = toNumber(v);
    if (!date && DATE_KEYS.includes(k)) {
      const m = /^(\d{4})(\d{2})(\d{2})T?/.exec(v);
      date = m ? parseDate(`${m[1]}-${m[2]}-${m[3]}`, now) : parseDate(v, now);
    }
    if (!merchant && ['merchant', 'shop', 'store', 'name', 'org', 'seller'].includes(k)) merchant = v.slice(0, 40);
  }
  if (amount === null) {
    const m = /(?:сумма|итого|всего|total|amount|ҷамъ|чамъ|jami)[^\d]{0,12}(\d[\d .,]*)/i.exec(raw);
    if (m) amount = toNumber(m[1]);
  }
  if (!date) date = parseDate(raw, now);
  return { amount, date, merchant, raw };
}
