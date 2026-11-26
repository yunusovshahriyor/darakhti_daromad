import { useCallback, useEffect, useState } from 'react';
import { overlayApi } from '../native';
import Sheet from './Sheet';

/** Тугмаи шино («+») болои барномаҳои дигар: ҷойгиршавӣ дар канор, пахш — хароҷот, пахши дароз — овоз. Танҳо дар APK. */
export default function OverlaySheet({ onClose }: { onClose: () => void }) {
  const api = overlayApi();
  const [on, setOn] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState(true);
  const [yp, setYp] = useState(false);
  const [reader, setReader] = useState(true);
  const [amount, setAmount] = useState('');
  const [dbg, setDbg] = useState('');
  const [feeYa, setFeeYa] = useState('18.3');
  const [feePark, setFeePark] = useState('2');
  const [last, setLast] = useState('');
  const [limit, setLimit] = useState('12');
  const [rest, setRest] = useState('6');
  const [wk, setWk] = useState('');
  const [syncTxt, setSyncTxt] = useState('');

  const refresh = useCallback(async () => {
    if (!api) return;
    try {
      setAllowed((await api.canDraw()).value);
      setOn((await api.isRunning()).value);
      setUsage((await api.hasUsageAccess()).value);
      setReader((await api.hasScreenReader()).value);
      const y = await api.getYandex();
      setYp(y.enabled);
      setAmount(y.amount);
      setFeeYa(y.feeYa); setFeePark(y.feePark); setLast(y.last);
      setLimit(y.wkLimit); setRest(y.wkRest);
      setSyncTxt(y.wkYaLeft ? `Охирин мувофиқшавӣ бо Яндекс: монд ${y.wkYaLeft} (${new Date(y.wkSync).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})` : '');
      setWk(y.wkState === 'on' ? 'дар линия' : y.wkState === 'off' ? 'не дар линия' : 'ҳанӯз номаълум (як маротиба тугмаи ⏻-ро пахш кунед)');
      setDbg(`events: ${y.events} · items: ${y.items} · yp_pkg: ${y.ypPkg || '-'} · foreground: ${y.curPkg || '-'} (${y.curName || '-'}) · price: ${y.price || '-'} · amount: ${y.amount || '-'} (${y.date || '-'}) · texts: ${y.texts.slice(0, 300)}`);
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

  const saveLimits = (l: string, r: string) => { void api?.setWorkLimits({ limit: l || '12', rest: r || '6' }); };
  const saveFees = (ya: string, park: string) => { void api?.setYandexFees({ yandex: ya || '0', park: park || '0' }); };

  const toggleYp = async () => {
    if (!api || busy) return;
    setBusy(true);
    try {
      if (yp) { await api.setYandex({ enabled: false }); await api.setAppName({ enabled: false }); setYp(false); }
      else if (!(await api.canDraw()).value) { setAllowed(false); await api.requestPermission(); }
      else if (!(await api.hasUsageAccess()).value) { setUsage(false); await api.requestUsageAccess(); }
      else if (!(await api.hasScreenReader()).value) { setReader(false); await api.requestScreenReader(); }
      else { await api.setAppName({ enabled: true }); await api.setYandex({ enabled: true }); setYp(true); }
    } catch { /* ignore */ }
    setBusy(false);
  };

  if (!api) {
    const c = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
    return (
      <Sheet title="Тугмаи шино болои барномаҳо" onClose={onClose}>
        <p className="note">Ин функсия (тугмаи шино ва маблағи Яндекс Про) танҳо дар APK-и Android кор мекунад. Шумо ҳоло барномаро дар браузер ё ҳамчун PWA кушодаед.</p>
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
          <b>Маблағи имрӯзаи «Яндекс Про»</b>
          <small>Дар «Яндекс Про» маблағи имрӯза (аз саҳифаи «Деньги»), бо сомонӣ ва вақти кор навишта мешавад; дар тафсилоти фармоиш зери нарх — сомонӣ. Танҳо экрани Яндекс Про хонда мешавад, маблағ танҳо дар ин телефон нигоҳ дошта мешавад.{amount ? ` Охирин: ${amount}` : ''}</small>
        </span>
        <span className="switch">
          <input type="checkbox" checked={yp} onChange={toggleYp} disabled={busy} />
          <i />
        </span>
      </label>
      {!reader && !yp && (
        <div className="alert">Дар танзимоти «Дастрасӣ» хидмати «Дарахти даромад: маблағи Яндекс Про»-ро фаъол кунед. Агар Android «Танзимоти маҳдудшуда» гӯяд: Танзимот → Барномаҳо → Дарахти даромад → ⋮ → «Иҷозат додани танзимоти маҳдудшуда», баъд боз кӯшиш кунед. Баъд ба ин ҷо баргашта, тугмаро боз пахш кунед.</div>
      )}
      {yp && (
        <>
          <p className="note">Ҳангоми «Заказ завершён» маблағи фармоиш минус комиссия худкор ба маблағи имрӯза илова мешавад. Комиссияро (%) дар ин ҷо танзим кунед:</p>
          <div className="rec-chips">
            <label className="field" style={{ flex: 1 }}><span>Яндекс (%)</span>
              <input value={feeYa} inputMode="decimal" onChange={e => { const v = e.target.value.replace(/[^\d.,]/g, ''); setFeeYa(v); saveFees(v, feePark); }} /></label>
            <label className="field" style={{ flex: 1 }}><span>Парк (%)</span>
              <input value={feePark} inputMode="decimal" onChange={e => { const v = e.target.value.replace(/[^\d.,]/g, ''); setFeePark(v); saveFees(feeYa, v); }} /></label>
          </div>
          <p className="note">Вақти кор: аз «дар линия» то «Уйти с линии» ҳисоб мешавад (аз диалогҳои Яндекс Про ва аз ранги тугмаи ⏻ муайян мешавад). Лимит ва истироҳатро (соат) танзим кунед:</p>
          <div className="rec-chips">
            <label className="field" style={{ flex: 1 }}><span>Лимити кор (соат)</span>
              <input value={limit} inputMode="decimal" onChange={e => { const v = e.target.value.replace(/[^\d.,]/g, ''); setLimit(v); saveLimits(v, rest); }} /></label>
            <label className="field" style={{ flex: 1 }}><span>Истироҳат (соат)</span>
              <input value={rest} inputMode="decimal" onChange={e => { const v = e.target.value.replace(/[^\d.,]/g, ''); setRest(v); saveLimits(limit, v); }} /></label>
          </div>
          <p className="note">{`Ҳолат: ${wk || '—'}`}</p>
          {syncTxt && <p className="note">{syncTxt}</p>}
          <button type="button" className="btn secondary" onClick={() => { void api?.resetWork(); setWk('ҳанӯз номаълум (як маротиба тугмаи ⏻-ро пахш кунед)'); }}>Ҳисобкунакро аз нав оғоз кардан</button>
          {last && <p className="note" data-nocur>{`Охирин фармоиш: ${last}`}</p>}
        </>
      )}
      {yp && <p className="note" data-nocur style={{ wordBreak: 'break-word', fontSize: '.72rem' }}>{dbg}</p>}
      <p className="note">Тугмаро бо дарозии ангушт кашида ба ҷои дигар гузоштан мумкин аст. Барои хомӯш кардан дар ҳамин ҷо ё дар огоҳиномаи барнома «Ғайрифаъол кардан»-ро пахш кунед.</p>
    </Sheet>
  );
}
