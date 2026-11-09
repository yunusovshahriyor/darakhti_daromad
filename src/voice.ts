/** Сабти овоз бо Web Speech API (дар браузер, бе сервер). Дар ҳама дастгоҳ нест: `voiceSupported()`. */
interface Rec {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecCtor = new () => Rec;
const ctor = (): RecCtor | null => {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

import { recordAvailable, recordToText } from './voiceRec';
import { getIdToken } from './sync';

export const voiceSupported = () => ctor() !== null || recordAvailable();

export type VoiceError = 'denied' | 'none' | 'network' | 'other';

export interface ListenHandlers { onInterim: (t: string) => void; onFinal: (t: string) => void; onError: (e: VoiceError) => void; onEnd: () => void }

/** Забонҳои сабт: тоҷикӣ → аввал `tg-TJ`, агар дастгирӣ нашавад — русӣ. */
const LANGS = { tg: ['tg-TJ', 'ru-RU'], ru: ['ru-RU'], en: ['en-US'] } as const;

/**
 * Сабти як ҷумла. `onInterim` — матни ҷорӣ (дар вақти гуфтан), `onFinal` — матни тайёр.
 * Қиматбозгашт — функсия барои қатъ кардан.
 */
function listenBrowser(lang: 'tg' | 'ru' | 'en', h: ListenHandlers): () => void {
  const C = ctor();
  if (!C) { h.onError('other'); h.onEnd(); return () => {}; }
  const tries = [...LANGS[lang]];
  let stopped = false;
  let gotFinal = false;

  const run = () => {
    const r = new C();
    r.lang = tries.shift() ?? 'ru-RU';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = e => {
      let txt = '';
      let fin = false;
      for (let i = 0; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
      if (fin) { gotFinal = true; h.onFinal(txt.trim()); } else h.onInterim(txt.trim());
    };
    r.onerror = e => {
      if (e.error === 'language-not-supported' && tries.length) { run(); return; }
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') h.onError('denied');
      else if (e.error === 'no-speech' || e.error === 'aborted') h.onError('none');
      else if (e.error === 'network') h.onError('network');
      else h.onError('other');
    };
    r.onend = () => { if (!stopped && !gotFinal && tries.length) return; h.onEnd(); };
    try { r.start(); } catch { h.onError('other'); h.onEnd(); }
    cur = r;
  };
  let cur: Rec | null = null;
  run();
  return () => { stopped = true; try { cur?.stop(); } catch { /* ignore */ } };
}

/**
 * Сабт: агар корбар ворид шуда бошад ва микрофон бошад — овоз ба сервер (Whisper) меравад: ҳамон сифат дар ҳама дастгоҳ.
 * Дар акс ё агар сервер ҷавоб надиҳад — Web Speech API-и браузер. `working` — матни «коркард…» дар вақти шинохт.
 */
export function listen(lang: 'tg' | 'ru' | 'en', h: ListenHandlers, working = '…'): () => void {
  let cancel: () => void = () => {};
  let dead = false;
  void (async () => {
    if (!recordAvailable() || !(await getIdToken())) { cancel = listenBrowser(lang, h); return; }
    const r = recordToText(lang, { onState: s => { if (s === 'working') h.onInterim(working); } });
    cancel = r.stop;
    try {
      const text = await r.result;
      if (!dead) { h.onFinal(text); h.onEnd(); }
    } catch (e) {
      if (dead) return;
      if (e === 'denied') { h.onError('denied'); h.onEnd(); }
      else if (e === 'none') { h.onError('none'); h.onEnd(); }
      else if (ctor()) cancel = listenBrowser(lang, h); // сервер дастрас нест: Web Speech
      else { h.onError(e === 'network' ? 'network' : 'other'); h.onEnd(); }
    }
  })();
  return () => { dead = true; cancel(); };
}
