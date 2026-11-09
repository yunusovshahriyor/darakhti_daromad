import { useEffect, useRef, useState } from 'react';
import { currentLang } from '../i18n';
import { listen } from '../voice';
import { parseVoice } from '../voiceParse';
import type { VoiceResult } from '../voiceParse';
import { VOICE } from '../voiceText';

/** Сабти овозӣ: бо пахши дарози «+» кушода мешавад ва худаш гӯш мекунад; натиҷа шакли «Амалиёти нав»-ро пур мекунад. */
export default function VoiceOverlay({ onResult, onText, onClose }: {
  /** Пахши дарози «+»: натиҷа шакли «Амалиёти нав»-ро пур мекунад. */
  onResult?: (r: VoiceResult) => void;
  /** Сатри зуд: матни шунидашуда ба сатр меравад. */
  onText?: (text: string) => void;
  onClose: () => void;
}) {
  const t = VOICE[currentLang()];
  const [live, setLive] = useState('');
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const done = useRef(false);

  const start = () => {
    setMsg(''); setLive(''); setOn(true); done.current = false;
    stop.current = listen(currentLang(), {
      onInterim: setLive,
      onFinal: txt => {
        done.current = true;
        if (onText) { onText(txt); onClose(); return; }
        const r = parseVoice(txt);
        if (r.kind === 'debt') { setMsg(`${t.heard} «${txt}»\n${t.debt}`); return; }
        onResult?.(r);
      },
      onError: e => setMsg(e === 'denied' ? t.denied : e === 'none' ? t.none : e === 'network' ? t.network : t.other),
      onEnd: () => setOn(false),
    }, t.processing);
  };
  useEffect(() => { start(); return () => stop.current?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { stop.current?.(); onClose(); };
  return (
    <div className="voice-ov" role="dialog" aria-label={t.button} onClick={close}>
      <div className="voice-card" onClick={e => e.stopPropagation()}>
        <div className={on ? 'voice-mic on' : 'voice-mic'} aria-hidden>🎤</div>
        <b className="voice-live">{on ? (live || t.listening) : (msg ? t.tryAgain : '')}</b>
        {msg && <p className="voice-msg">{msg}</p>}
        {!msg && <p className="voice-msg hint">{t.hint}</p>}
        <div className="voice-actions">
          {!on && <button type="button" className="btn big" onClick={start}>{t.tryAgain}</button>}
          <button type="button" className="btn secondary" onClick={close}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}
