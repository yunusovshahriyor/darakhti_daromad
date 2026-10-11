import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useConfirm } from '../components/ConfirmSheet';
import Field from '../components/Field';
import { ChevronIcon, PencilIcon } from '../components/Icons';
import Sheet from '../components/Sheet';
import { balancesOf, fmt, inPeriod, monthlyIncome, periodAt } from '../model';
import {
  lastBackupAt, listSnapshots, makeBackup, markBackup, parseBackup, persisted, restoreRaw, summarize,
} from '../storage';
import type { Snapshot } from '../idb';
import type { Props, Sub } from './props';

const NAME_KEY = 'darakhti:profile';

const readName = (): string => {
  try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; }
};

interface ProfileProps extends Props {
  open: (s: Sub) => void;
  canInstall: boolean;
  install: () => void;
  standalone: boolean;
  ios: boolean;
  onToast: (m: string) => void;
}

const ago = (ts: number) => {
  if (!ts) return 'ҳеҷ гоҳ';
  const d = Math.floor((Date.now() - ts) / 86_400_000);
  if (d <= 0) return 'имрӯз';
  if (d === 1) return 'дирӯз';
  return `${d} рӯз пеш`;
};

const stamp = (ts: number) => new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Profile({ state, open, canInstall, install, standalone, ios, onToast }: ProfileProps) {
  const [name, setName] = useState(readName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [backedAt, setBackedAt] = useState(lastBackupAt);
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [showSnaps, setShowSnaps] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ask, confirmDialog] = useConfirm();

  useEffect(() => { listSnapshots().then(setSnaps); }, []);

  const backup = async () => {
    const { file, name } = makeBackup();
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const f = new File([blob], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], title: 'Нусхаи эҳтиётии даромад.' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      markBackup();
      setBackedAt(Date.now());
      onToast('💾 Нусхаи эҳтиётӣ гирифта шуд');
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') onToast('Нусха гирифта нашуд');
    }
  };

  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed) { onToast('Ин файл нусхаи эҳтиётии барнома нест'); return; }
    const c = summarize(parsed.raw);
    const ok = await ask({
      title: 'Барқарор кардани маълумот',
      text: `Дар файл: ${c.incomes} даромад, ${c.expenses} хароҷот, ${c.debts} қарз, ${c.dreams} орзу. Маълумоти ҳозира иваз мешавад (нусхаи он дар «Нусхаҳои худкор» мемонад).`,
      ok: 'Барқарор кардан',
      danger: true,
    });
    if (ok) await restoreRaw(parsed.raw, parsed.prefs);
  };

  const restoreSnap = async (sn: Snapshot) => {
    const c = summarize(sn.raw);
    const ok = await ask({
      title: 'Барқарор кардан аз нусхаи худкор',
      text: `Нусха аз ${stamp(sn.ts)}: ${c.incomes} даромад, ${c.expenses} хароҷот, ${c.debts} қарз, ${c.dreams} орзу. Маълумоти ҳозира иваз мешавад.`,
      ok: 'Барқарор кардан',
      danger: true,
    });
    if (ok) await restoreRaw(sn.raw);
  };

  useEffect(() => {
    try { localStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
  }, [name]);

  const { incomes, expenses } = state;
  const month = periodAt('month', 0);
  const incomeMonth = incomes.filter(i => inPeriod(i.date, month)).reduce((s, i) => s + i.amount, 0);
  const spentMonth = expenses.filter(e => inPeriod(e.date, month)).reduce((s, e) => s + e.amount, 0);
  const incomeAll = incomes.reduce((s, i) => s + i.amount, 0);
  const spentAll = expenses.reduce((s, e) => s + e.amount, 0);
  const total = Object.values(balancesOf(state)).reduce((s, v) => s + v, 0);
  const months = monthlyIncome(incomes);
  const max = Math.max(...months.map(m => m.total), 1);
  const avg = months.filter(m => m.total > 0).length
    ? months.reduce((s, m) => s + m.total, 0) / months.filter(m => m.total > 0).length : 0;

  const save = (e: FormEvent) => {
    e.preventDefault();
    setName(draft.trim());
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <section className="pf-hero">
        <div className="pf-avatar">{name ? name.trim().charAt(0).toUpperCase() : '👤'}</div>
        <div className="pf-who">
          <b>{name || 'Номи шумо'}</b>
          <small>Ҳамагӣ дар ҳисобҳо: {fmt(total)} смн</small>
        </div>
        <button className="icon-btn" aria-label="Таҳрири ном"
          onClick={() => { setDraft(name); setEditing(true); }}>
          <PencilIcon />
        </button>
      </section>

      <h3 className="group-title"><span>Даромад</span></h3>
      <section className="pf-income">
        <div className="pf-big">
          <small>Ин моҳ</small>
          <b>{fmt(incomeMonth)} <i>смн</i></b>
        </div>
        <div className="pf-bars">
          {months.map(m => (
            <div key={m.key} className="pf-bar">
              <span style={{ height: `${Math.max(4, (m.total / max) * 100)}%` }} className={m.total ? '' : 'zero'} />
              <small>{m.label.slice(0, 3)}</small>
            </div>
          ))}
        </div>
        <div className="pf-stats">
          <div><small>Ҳамаи вақт</small><b>{fmt(incomeAll)}</b></div>
          <div><small>Миёна дар моҳ</small><b>{fmt(Math.round(avg))}</b></div>
          <div><small>Хароҷоти моҳ</small><b>{fmt(spentMonth)}</b></div>
          <div><small>Ҳамаи хароҷот</small><b>{fmt(spentAll)}</b></div>
        </div>
      </section>

      <h3 className="group-title"><span>Бахшҳо</span></h3>
      <div className="cells">
        <button className="cell tap link" onClick={() => open('dreams')}>
          <div className="ic">✨</div>
          <div className="grow"><b>Орзуҳо</b><small>{state.dreams.length} орзу</small></div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => open('debts')}>
          <div className="ic">💳</div>
          <div className="grow"><b>Қарзҳо</b><small>{state.debts.length + state.loans.length} сабт</small></div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => open('settings')}>
          <div className="ic">⚙️</div>
          <div className="grow"><b>Танзимот</b><small>Фоизҳои тақсим, маълумот</small></div>
          <ChevronIcon />
        </button>
      </div>

      <h3 className="group-title"><span>Маълумот ва нусхаи эҳтиётӣ</span></h3>
      <div className="cells">
        <div className="cell">
          <div className="ic">{persisted ? '🔒' : '⚠️'}</div>
          <div className="grow">
            <b>{persisted ? 'Хотираи доимӣ фаъол аст' : 'Хотираи доимӣ фаъол нест'}</b>
            <small>{persisted
              ? 'Браузер маълумотро худаш нест намекунад. Бо нест кардани барнома ё тозакунии сайт ҳам ҳамаи он гум мешавад: нусха гиред.'
              : 'Браузер метавонад маълумотро ҳангоми камбуди ҷой нест кунад. Нусхаи эҳтиётӣ гиред.'}</small>
          </div>
        </div>
        <button className="cell tap link" onClick={backup}>
          <div className="ic">💾</div>
          <div className="grow">
            <b>Нусхаи эҳтиётӣ гирифтан</b>
            <small>Файли JSON: ба Telegram ё Drive фиристед · Охирин: {ago(backedAt)}</small>
          </div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => fileRef.current?.click()}>
          <div className="ic">📂</div>
          <div className="grow">
            <b>Барқарор кардан аз файл</b>
            <small>Нусхаи пештара ё маълумоти дастгоҳи дигар</small>
          </div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => setShowSnaps(v => !v)} aria-expanded={showSnaps}>
          <div className="ic">🕘</div>
          <div className="grow">
            <b>Нусхаҳои худкор</b>
            <small>{snaps.length ? `${snaps.length} нусха аз 7 рӯзи охир` : 'Ҳар рӯз як нусха дар худи дастгоҳ нигоҳ дошта мешавад'}</small>
          </div>
          <span className={showSnaps ? 'chev open' : 'chev'}><ChevronIcon /></span>
        </button>
        {showSnaps && snaps.map(sn => {
          const c = summarize(sn.raw);
          return (
            <button key={sn.ts} className="cell tap link" onClick={() => restoreSnap(sn)}>
              <div className="ic sm">↩️</div>
              <div className="grow">
                <b>{stamp(sn.ts)}</b>
                <small>{c.incomes} даромад · {c.expenses} хароҷот · {c.debts} қарз · {c.dreams} орзу</small>
              </div>
              <ChevronIcon />
            </button>
          );
        })}
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pickFile} />
      {confirmDialog}

      {!standalone && (
        <>
          <h3 className="group-title"><span>Барнома</span></h3>
          <div className="cells">
            {canInstall ? (
              <button className="cell tap link" onClick={install}>
                <div className="ic">📲</div>
                <div className="grow">
                  <b>Ҳамчун барнома насб кардан</b>
                  <small>Ба экрани асосӣ илова кунед</small>
                </div>
                <ChevronIcon />
              </button>
            ) : (
              <div className="cell">
                <div className="ic">📲</div>
                <div className="grow">
                  <b>Ҳамчун барнома насб кардан</b>
                  <small>{ios
                    ? 'Тугмаи «Мубодила» (↑) → «Add to Home Screen»'
                    : 'Менюи браузер (⋮) → «Install app» / «Add to Home screen»'}</small>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <Sheet title="Номи шумо" onClose={() => setEditing(false)}>
          <form onSubmit={save}>
            <Field label="Ном">
              <input value={draft} autoFocus maxLength={30} onChange={e => setDraft(e.target.value)} placeholder="Масалан, Шаҳриёр" />
            </Field>
            <button className="btn big" type="submit">Нигоҳ доштан</button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
