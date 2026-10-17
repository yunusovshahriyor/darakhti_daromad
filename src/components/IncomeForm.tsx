import { FormEvent, useEffect, useRef, useState } from 'react';
import { orderedSources } from '../categories';
import { poolOf } from '../dreams';
import type { Transfer } from '../types';
import { ACCOUNTS, ACCOUNT_ORDER, allocate, balancesOf, fmt, hasDebt, hiddenAccounts, isFree, today, uid } from '../model';
import type { Props } from '../views/props';
import { quickAmounts, recentIncomes } from '../suggest';
import AmountEntry from './AmountEntry';
import AddCategorySheet from './AddCategorySheet';
import AccountSelect from './AccountSelect';
import Field from './Field';

export default function IncomeForm({ state, setState, onDone, prefill }: Props & { onDone: (msg: string) => void; prefill?: { amount: number | null; note: string; date: string | null } }) {
  const [source, setSource] = useState('Музд');
  const [adding, setAdding] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const sources = orderedSources(state.incomeSources ?? [], state.incomes);
  const [note, setNote] = useState(prefill?.note ?? '');
  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount) : '');
  const [date, setDate] = useState(prefill?.date ?? today());

  // Манбаи интихобшуда дар сатр намоён бошад
  useEffect(() => {
    const box = row.current;
    const el = box?.querySelector<HTMLElement>('.chip.on');
    if (!box || !el) return;
    if (el.offsetLeft < box.scrollLeft || el.offsetLeft + el.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: Math.max(0, el.offsetLeft - 16), behavior: 'smooth' });
    }
  }, [source, sources.length]);

  const recent = recentIncomes(state.incomes);
  const quick = quickAmounts(state.incomes.filter(i => !i.kind).map(i => i.amount), state.currency ?? 'TJS', true);
  const free = isFree(state);
  const debt = hasDebt(state.debts);
  const num = parseFloat(amount) || 0;
  // Системаи Давлатов: даромадро бе тақсим, танҳо ба як ҳисоб илова кардан мумкин аст
  const [single, setSingle] = useState(false);
  const [one, setOne] = useState(() => (ACCOUNTS.living ? 'living' : ACCOUNT_ORDER[0] ?? 'cash'));
  const direct = !free && single;
  const preview = free || direct ? {} : allocate(num, state.tree, debt);
  // Ҳолати озод: даромад ба як ҳисоби интихобшуда меравад (пешфарз — ҳисоби даромади охирин)
  const [target, setTarget] = useState(() => {
    const last = state.incomes.find(i => !i.kind && Object.keys(i.alloc).some(k => (i.alloc[k] ?? 0) > 0));
    const prev = last ? Object.keys(last.alloc).find(k => (last.alloc[k] ?? 0) > 0) : undefined;
    return prev && ACCOUNT_ORDER.includes(prev) ? prev : ACCOUNT_ORDER[0] ?? 'cash';
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0) return;
    const n = note.trim();
    const income = {
      id: uid(), title: n ? `${source} · ${n}` : source, source, amount: num, date,
      alloc: free ? { ...allocate(0, state.tree, false), [target]: num } : direct ? { ...allocate(0, state.tree, false), [one]: num } : allocate(num, state.tree, debt),
    };
    setState(s => {
      // Ҳиссаи худкор ба орзуҳо: аз ҳисоби интихобшуда ба ҳисоби орзуҳо мегузарад
      const shares: Transfer[] = s.dreams
        .filter(d => !d.boughtAt && d.incomeShare && d.incomeShare.percent > 0)
        .map(d => ({
          id: uid(), from: d.incomeShare!.from, to: poolOf(d), date,
          amount: Math.round(num * d.incomeShare!.percent) / 100,
        }))
        .filter(t => t.amount > 0 && t.from !== t.to);
      return {
        ...s,
        incomes: [...s.incomes, income].sort((a, b) => b.date.localeCompare(a.date)),
        transfers: shares.length ? [...shares, ...s.transfers] : s.transfers,
      };
    });
    onDone('Даромад илова шуд ✓');
  };

  return (
    <form onSubmit={onSubmit}>
      {recent.length > 0 && (
        <div className="repeat-row">
          {recent.map(r => (
            <button key={r.id} type="button" className="rp" onClick={() => {
              const src = r.source ?? source;
              setSource(src);
              setAmount(String(r.amount));
              const prefix = `${src} · `;
              setNote(r.title.startsWith(prefix) ? r.title.slice(prefix.length) : '');
            }}>
              <i>↻</i><span>{r.source ?? r.title} <small>· {fmt(r.amount)} смн</small></span>
            </button>
          ))}
        </div>
      )}
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="+" quick={quick} />

      <div className="chips-block">
        <div className="chips-head">
          <div className="chips-label">Манбаи даромад</div>
          <button type="button" className="chips-add" onClick={() => setAdding(true)}>+ Илова</button>
        </div>
        <div className="chips" ref={row}>
          {sources.map(({ name: s, icon: ic }) => (
            <button key={s} type="button" className={s === source ? 'chip on' : 'chip'} onClick={() => setSource(s)}>
              <span className="chip-ic soft">{ic}</span>
              <span className="chip-t"><b>{s}</b></span>
              {s === source && <span className="chip-ok">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {adding && (
        <AddCategorySheet kind="income" state={state} setState={setState} onClose={() => setAdding(false)}
          onAdded={setSource} />
      )}

      <Field label="Эзоҳ (ихтиёрӣ)">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Масалан, лоиҳа ё музди моҳ" />
      </Field>

      {free && (
        <Field label="Ба кадом ҳисоб">
          <AccountSelect value={target} onChange={setTarget} bal={balancesOf(state)} hidden={hiddenAccounts(state)} />
        </Field>
      )}

      {!free && (
        <>
          <label className="switch-row">
            <span>
              <b>Бе тақсим, ба як ҳисоб</b>
              <small>Даромад аз рӯи фоизҳои системаи Давлатов тақсим намешавад, пурра ба ҳисоби интихобшуда меравад.</small>
            </span>
            <span className="switch">
              <input type="checkbox" checked={single} onChange={e => setSingle(e.target.checked)} />
              <i />
            </span>
          </label>
          {single && (
            <Field label="Ба кадом ҳисоб">
              <AccountSelect value={one} onChange={setOne} bal={balancesOf(state)} hidden={hiddenAccounts(state)} />
            </Field>
          )}
        </>
      )}

      {!free && !direct && num > 0 && (
        <div className="preview">
          <b>Тақсим мешавад:</b>
          {ACCOUNT_ORDER.filter(id => preview[id] > 0).map(id => (
            <div className="row" key={id}>
              <span>{ACCOUNTS[id].icon} {ACCOUNTS[id].name}</span>
              <span>{fmt(preview[id])}</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn big" type="submit" disabled={num <= 0}>Сабти даромад</button>
    </form>
  );
}
