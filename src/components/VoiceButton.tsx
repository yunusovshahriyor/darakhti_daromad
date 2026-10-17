import { useEffect, useRef, useState } from 'react';
import { currentLang } from '../i18n';
import { listen, voiceSupported } from '../voice';
import { parseVoice } from '../voiceParse';
import type { VoiceResult } from '../voiceParse';
import { VOICE } from '../voiceText';

/** Тугмаи микрофон: як ҷумла мешунавад, мефаҳмад (маблағ, навъ, эзоҳ, сана) ва ба шакл мефиристад. Агар дастгоҳ дастгирӣ накунад — нест. */
export default function VoiceButton({ onResult, onMessage }: { onResult: (r: VoiceResult) => void; onMessage: (m: string) => void }) {
  const t = VOICE[currentLang()];
  const [on, setOn] = useState(false);
  const [live, setLive] = useState('');
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  if (!voiceSupported()) return null;

  const start = () => {
    if (on) { stop.current?.(); return; }
    setOn(true); setLive(''); onMessage('');
    stop.current = listen(currentLang(), {
      onInterim: setLive,
      onFinal: txt => {
        const r = parseVoice(txt);
        if (r.kind === 'debt') { onMessage(`${t.heard} «${txt}»\n${t.debt}`); return; }
        onResult(r);
        onMessage(`${t.heard} «${txt}»${r.amount === null ? `\n${t.noAmount}` : ''}`);
      },
      onError: e => onMessage(e === 'denied' ? t.denied : e === 'none' ? t.none : e === 'network' ? t.network : t.other),
      onEnd: () => { setOn(false); setLive(''); },
    });
  };

  return (
    <button type="button" className={on ? 'voice-btn on' : 'voice-btn'} onClick={start} aria-pressed={on}>
      <i aria-hidden>🎤</i>
      <span>{on ? (live || t.listening) : t.button}</span>
    </button>
  );
}
