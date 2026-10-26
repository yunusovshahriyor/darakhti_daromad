import { FormEvent, useEffect, useRef, useState } from 'react';
import { orderedSources } from '../categories';
import { poolOf } from '../dreams';
import type { Transfer } from '../types';
import { ACCOUNTS, ACCOUNT_ORDER, allocateIncome, balancesOf, emptyAlloc, fmt, hiddenAccounts, mainAccountOf, sharesOf, today, uid } from '../model';
import type { Props } from '../views/props';
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

  const num = parseFloat(amount) || 0;
  // Агар ҳисобҳо фоизи худкор дошта бошанд, даромад тақсим мешавад; «Бе тақсим» — ба як ҳисоб
  const hasShares = Object.keys(sharesOf(state)).length > 1;
  const [single, setSingle] = useState(false);
  // Бе фоиз: пешфарз — ҳисоби даромади охирин; бо фоиз — ҳисоби асосӣ
  const [one, setOne] = useState(() => {
    if (hasShares) return mainAccountOf(state);
    const last = state.incomes.find(i => !i.kind && Object.keys(i.alloc).some(k => (i.alloc[k] ?? 0) > 0));
    const prev = last ? Object.keys(last.alloc).find(k => (last.alloc[k] ?? 0) > 0) : undefined;
    return prev && ACCOUNT_ORDER.includes(prev) ? prev : mainAccountOf(state);
  });
  const direct = !hasShares || single;
  const preview = direct ? {} : allocateIncome(state, num);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (num <= 0) return;
    const n = note.trim();
    const income = {
      id: uid(), title: n ? `${source} · ${n}` : source, source, amount: num, date,
      alloc: direct ? { ...emptyAlloc(), [one]: num } : allocateIncome(state, num),
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
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="+" />

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

      {hasShares && (
        <label className="switch-row">
          <span>
            <b>Бе тақсим, ба як ҳисоб</b>
            <small>Фоизҳои ҳисобҳо ҷудо намешаванд: даромад пурра ба ҳисоби интихобшуда меравад.</small>
          </span>
          <span className="switch">
            <input type="checkbox" checked={single} onChange={e => setSingle(e.target.checked)} />
            <i />
          </span>
        </label>
      )}
      {direct && (
        <Field label="Ба кадом ҳисоб">
          <AccountSelect value={one} onChange={setOne} bal={balancesOf(state)} hidden={hiddenAccounts(state)} />
        </Field>
      )}

      {!direct && num > 0 && (
        <div className="preview">
          <b>Тақсим мешавад:</b>
          {ACCOUNT_ORDER.filter(id => (preview[id] ?? 0) > 0).map(id => (
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
