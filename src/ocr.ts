/** OCR-и чек дар худи дастгоҳ (Tesseract.js): акс ба сервер намеравад. Модул танҳо ҳангоми истифода бор мешавад. */
interface TessResult { data: { text: string } }
interface TessApi {
  recognize(image: Blob, langs: string, opts?: { logger?: (m: { status: string; progress: number }) => void }): Promise<TessResult>;
}
declare global { interface Window { Tesseract?: TessApi } }

const SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

let loading: Promise<TessApi> | null = null;
export function loadTesseract(): Promise<TessApi> {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('ocr')));
      s.onerror = () => { loading = null; reject(new Error('offline')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Акс: хурд кардан (то 1800 px) ва баланд кардани контраст — хонишро беҳтар мекунад. */
export async function prepareImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d');
  if (!x) return file;
  x.drawImage(bmp, 0, 0, c.width, c.height);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  let lo = 255; let hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    d[i] = d[i + 1] = d[i + 2] = g;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  }
  const span = Math.max(40, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / span));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  x.putImageData(img, 0, 0);
  return new Promise(res => c.toBlob(b => res(b ?? file), 'image/jpeg', 0.92));
}

export async function readReceipt(blob: Blob, withTajik: boolean, onProgress: (p: number, status: string) => void): Promise<string> {
  const T = await loadTesseract();
  const logger = (m: { status: string; progress: number }) => onProgress(m.progress, m.status);
  try {
    return (await T.recognize(blob, withTajik ? 'rus+tgk+eng' : 'rus+eng', { logger })).data.text;
  } catch {
    // Модули забони тоҷикӣ бор нашуд — бо русӣ ва англисӣ
    return (await T.recognize(blob, 'rus+eng', { logger })).data.text;
  }
}
