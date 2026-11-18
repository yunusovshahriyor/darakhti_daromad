import { useCallback, useEffect, useState } from 'react';
import { overlayApi } from '../native';
import Sheet from './Sheet';

/** Тугмаи шино («+») болои барномаҳои дигар: ҷойгиршавӣ дар канор, пахш — хароҷот, пахши дароз — овоз. Танҳо дар APK. */
export default function OverlaySheet({ onClose }: { onClose: () => void }) {
  const api = overlayApi();
  const [on, setOn] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setAllowed((await api.canDraw()).value);
      setOn((await api.isRunning()).value);
    } catch { /* ignore */ }
  }, [api]);

  useEffect(() => {
    void refresh();
    // Баъди иҷозат дар танзимоти система ба барнома бармегардем: ҳолатро нав мекунем
    const vis = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [refresh]);

  const toggle = async () => {
    if (!api || busy) return;
    setBusy(true);
    try {
      if (on) { await api.stop(); setOn(false); }
      else if (!(await api.canDraw()).value) { setAllowed(false); await api.requestPermission(); }
      else { await api.start(); setOn(true); }
    } catch { /* ignore */ }
    setBusy(false);
  };

  return (
    <Sheet title="Тугмаи шино болои барномаҳо" onClose={onClose}>
      <p className="note">Тугмаи хурди «+» болои ҳамаи барномаҳо мемонад. Пахш — кушодани шакли хароҷот, пахши дароз — сабти овозӣ. Барнома экрани барномаҳои дигарро намехонад.</p>
      <label className="switch-row">
        <span>
          <b>Фаъол кардан</b>
          <small>{on ? 'Тугма ҳозир фаъол аст' : 'Тугма ғайрифаъол аст'}</small>
        </span>
        <span className="switch">
          <input type="checkbox" checked={on} onChange={toggle} disabled={busy} />
          <i />
        </span>
      </label>
      {!allowed && !on && (
        <div className="alert">Аввал иҷозати «Болои барномаҳои дигар» диҳед: танзимоти система кушода мешавад. Иҷозат диҳед ва ба ин ҷо баргашта, боз «Фаъол кардан»-ро пахш кунед.</div>
      )}
      <p className="note">Тугмаро бо дарозии ангушт кашида ба ҷои дигар гузоштан мумкин аст. Барои хомӯш кардан дар ҳамин ҷо ё дар огоҳиномаи барнома «Ғайрифаъол кардан»-ро пахш кунед.</p>
    </Sheet>
  );
}
