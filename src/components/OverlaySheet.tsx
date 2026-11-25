import { useCallback, useEffect, useState } from 'react';
import { overlayApi } from '../native';
import Sheet from './Sheet';

/** Тугмаи шино («+») болои барномаҳои дигар: ҷойгиршавӣ дар канор, пахш — хароҷот, пахши дароз — овоз. Танҳо дар APK. */
export default function OverlaySheet({ onClose }: { onClose: () => void }) {
  const api = overlayApi();
  const [on, setOn] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(false);
  const [usage, setUsage] = useState(true);

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setAllowed((await api.canDraw()).value);
      setOn((await api.isRunning()).value);
      setName((await api.isAppName()).value);
      setUsage((await api.hasUsageAccess()).value);
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

  const toggleName = async () => {
    if (!api || busy) return;
    setBusy(true);
    try {
      if (name) { await api.setAppName({ enabled: false }); setName(false); }
      else if (!(await api.canDraw()).value) { setAllowed(false); await api.requestPermission(); }
      else if (!(await api.hasUsageAccess()).value) { setUsage(false); await api.requestUsageAccess(); }
      else { await api.setAppName({ enabled: true }); setName(true); }
    } catch { /* ignore */ }
    setBusy(false);
  };

  if (!api) {
    const c = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
    return (
      <Sheet title="Тугмаи шино болои барномаҳо" onClose={onClose}>
        <p className="note">Ин функсия (тугмаи шино ва номи барномаи кушодашуда) танҳо дар APK-и Android кор мекунад. Шумо ҳоло барномаро дар браузер ё ҳамчун PWA кушодаед.</p>
        <a className="btn" href="https://github.com/yunusovshahriyor/darakhti_daromad/releases/download/android-latest/darakhti-daromad.apk">Боргирии APK</a>
        <p className="note">Агар APK-ро насб кардаед ва ин матнро мебинед, сатри поёнро ба ман фиристед:</p>
        <p className="note">{`Capacitor: ${c ? 'yes' : 'no'} · platform: ${c?.getPlatform?.() ?? '-'} · native: ${String(c?.isNativePlatform?.() ?? false)}`}</p>
      </Sheet>
    );
  }

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
      <label className="switch-row">
        <span>
          <b>Номи барномаи кушодашуда</b>
          <small>Ном ба ҷои тугмаи сабзи «+» навишта мешавад (бо фони шаффоф); пахш — кушодани барнома. Танҳо ном нишон дода мешавад: мундариҷаи экран хонда ва ба ҷое фиристода намешавад.</small>
        </span>
        <span className="switch">
          <input type="checkbox" checked={name} onChange={toggleName} disabled={busy} />
          <i />
        </span>
      </label>
      {!usage && !name && (
        <div className="alert">Иҷозати «Дастрасӣ ба маълумоти истифода» лозим аст: танзимоти система кушода мешавад. Ин барномаро ёфта, иҷозат диҳед, баргардед ва боз «Номи барномаи кушодашуда»-ро фаъол кунед.</div>
      )}
      <p className="note">Тугмаро бо дарозии ангушт кашида ба ҷои дигар гузоштан мумкин аст. Барои хомӯш кардан дар ҳамин ҷо ё дар огоҳиномаи барнома «Ғайрифаъол кардан»-ро пахш кунед.</p>
    </Sheet>
  );
}
