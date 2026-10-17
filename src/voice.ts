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

export const voiceSupported = () => ctor() !== null;

export type VoiceError = 'denied' | 'none' | 'network' | 'other';

/** Забонҳои сабт: тоҷикӣ → аввал `tg-TJ`, агар дастгирӣ нашавад — русӣ. */
const LANGS = { tg: ['tg-TJ', 'ru-RU'], ru: ['ru-RU'], en: ['en-US'] } as const;

/**
 * Сабти як ҷумла. `onInterim` — матни ҷорӣ (дар вақти гуфтан), `onFinal` — матни тайёр.
 * Қиматбозгашт — функсия барои қатъ кардан.
 */
export function listen(lang: 'tg' | 'ru' | 'en', h: { onInterim: (t: string) => void; onFinal: (t: string) => void; onError: (e: VoiceError) => void; onEnd: () => void }): () => void {
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
