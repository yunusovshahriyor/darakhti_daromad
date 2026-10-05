import { DEFAULT_SETTINGS } from '../model';
import { emptyState } from '../storage';
import type { Settings } from '../types';
import type { Props } from './props';

const FIELDS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'charity', label: 'Садақа', hint: 'аз даромади умумӣ' },
  { key: 'parents', label: 'Волидон', hint: 'аз даромади умумӣ' },
  { key: 'future', label: 'Барои оянда', hint: 'аз даромади умумӣ' },
  { key: 'fun', label: 'Вақтхушӣ', hint: 'аз даромади умумӣ (бо қарз — ба пардохти қарз)' },
  { key: 'company', label: 'Ҳисоби ширкат', hint: 'аз даромади моҳона; бақия — шахсӣ' },
  { key: 'capital', label: 'Сармоя', hint: 'аз ҳисоби ширкат; бақия — орзу' },
  { key: 'bigDream', label: 'Орзуи калон', hint: 'аз орзу; бақия — орзуи хурд' },
];

export default function SettingsView({ state, setState }: Props) {
  const s = state.settings;
  const offTop = s.charity + s.parents + s.future + s.fun;

  const set = (key: keyof Settings, v: string) => {
    const n = Math.min(100, Math.max(0, parseFloat(v) || 0));
    setState(st => ({ ...st, settings: { ...st.settings, [key]: n } }));
  };

  const reset = () => setState(st => ({ ...st, settings: { ...DEFAULT_SETTINGS } }));

  const wipe = () => {
    if (window.confirm('Ҳамаи маълумот (даромад, хароҷот, қарз, орзуҳо) нест мешавад. Идома медиҳед?')) {
      setState(emptyState());
    }
  };

  return (
    <>
      <h3 className="group-title">Фоизҳо</h3>
      <div className="cells">
        {FIELDS.map(f => (
          <label className="cell setting" key={f.key}>
            <div className="grow">
              <b>{f.label}</b>
              <small>{f.hint}</small>
            </div>
            <input type="number" inputMode="decimal" min="0" max="100" step="0.5" value={s[f.key]}
              onChange={e => set(f.key, e.target.value)} />
            <span className="pct">%</span>
          </label>
        ))}
      </div>

      <div className="preview">
        <div className="row"><span>Ҷудо мешавад аз даромади умумӣ</span><b>{offTop}%</b></div>
        <div className="row"><span>Даромади моҳона (100%)</span><b>{Math.max(0, 100 - offTop)}% аз умумӣ</b></div>
        <div className="row"><span>Ҳисоби шахсӣ</span><b>{100 - s.company}% аз моҳона</b></div>
        <div className="row"><span>Орзу</span><b>{100 - s.capital}% аз ширкат</b></div>
      </div>
      {offTop > 100 && <div className="alert danger">⚠️ Ҷамъи фоизҳо аз 100% зиёд аст.</div>}
      <p className="note">Тағйирот танҳо ба даромадҳои нав таъсир мекунад.</p>

      <button className="btn secondary" onClick={reset}>Барқарор кардани фоизҳои пешфарз</button>

      <h3 className="group-title">Маълумот</h3>
      <div className="cells">
        <div className="cell"><div className="grow muted">Маълумот танҳо дар ин дастгоҳ нигоҳ дошта мешавад.</div></div>
      </div>
      <button className="btn danger" onClick={wipe}>Нест кардани ҳамаи маълумот</button>
    </>
  );
}
