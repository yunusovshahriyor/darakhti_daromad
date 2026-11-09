/**
 * Сабти овоз бо микрофон → WAV (16 кГц, моно) → Worker (Whisper) → матн. Ба Web Speech API вобаста нест:
 * дар ҳама браузер/дастгоҳе, ки микрофон дорад, ҳамон сифат кор мекунад. Танҳо барои корбари воридшуда.
 */
import { BOT_API } from './firebaseConfig';
import { getIdToken } from './sync';

export type RecError = 'denied' | 'none' | 'network' | 'auth' | 'rate' | 'other';

export const recordSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

const MAX_MS = 12_000;      // дарозии ҳадди аксар
const NO_SPEECH_MS = 6_000; // агар ин қадар чизе нагуфта бошанд
const SILENCE_MS = 1_300;   // хомӯшӣ баъди гап → қатъ
const THRESHOLD = 0.02;     // ҳадди баландии овоз (RMS)

function wav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

export async function toWav(blob: Blob): Promise<Blob> {
  const ctx = new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  try {
    const dec = await ctx.decodeAudioData(await blob.arrayBuffer());
    const rate = 16000;
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(dec.duration * rate)), rate);
    const src = off.createBufferSource();
    src.buffer = dec; src.connect(off.destination); src.start();
    const out = await off.startRendering();
    return wav(out.getChannelData(0), rate);
  } finally { void ctx.close(); }
}

/** Сабт + шинохт. `stop()` — қатъи дастӣ. `onState` — «listening» → «working». */
export function recordToText(lang: 'tg' | 'ru' | 'en', h: { onState: (s: 'listening' | 'working') => void }): { stop: () => void; result: Promise<string> } {
  let stopFn: () => void = () => {};
  const result = (async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch { throw 'denied' as RecError; }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const ac = new AudioContext();
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    ac.createMediaStreamSource(stream).connect(an);
    const data = new Float32Array(an.fftSize);
    const started = Date.now();
    let spoke = false;
    let lastLoud = started;
    let heard = false;
    const finished = new Promise<void>(res => { rec.onstop = () => res(); });
    const tick = setInterval(() => {
      an.getFloatTimeDomainData(data);
      let sum = 0;
      for (const x of data) sum += x * x;
      const now = Date.now();
      if (Math.sqrt(sum / data.length) > THRESHOLD) { spoke = true; heard = true; lastLoud = now; }
      if (now - started > MAX_MS || (spoke && now - lastLoud > SILENCE_MS) || (!spoke && now - started > NO_SPEECH_MS)) stopFn();
    }, 80);
    stopFn = () => { clearInterval(tick); if (rec.state !== 'inactive') rec.stop(); };
    h.onState('listening');
    rec.start();
    await finished;
    clearInterval(tick);
    stream.getTracks().forEach(t => t.stop());
    void ac.close();
    if (!heard) throw 'none' as RecError;
    h.onState('working');
    const token = await getIdToken();
    if (!token) throw 'auth' as RecError;
    let body: Blob;
    try { body = await toWav(new Blob(chunks, { type: rec.mimeType })); } catch { throw 'other' as RecError; }
    let res: Response;
    try {
      res = await fetch(`${BOT_API}/voice`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'x-lang': lang, 'content-type': 'audio/wav' }, body });
    } catch { throw 'network' as RecError; }
    if (res.status === 401) throw 'auth' as RecError;
    if (res.status === 429) throw 'rate' as RecError;
    if (!res.ok) throw 'other' as RecError;
    const text = ((await res.json()) as { text?: string }).text?.trim() ?? '';
    if (!text) throw 'none' as RecError;
    return text;
  })();
  return { stop: () => stopFn(), result };
}

export const recordAvailable = () => !!BOT_API && recordSupported();
