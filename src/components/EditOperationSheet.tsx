import { useState } from 'react';
import { ACCOUNTS, ALL_IDS, balancesOf, fmt, hiddenAccounts, spent, today } from '../model';
import type { AccountId, Expense, Income, State, Transfer } from '../types';
import type { Props } from '../views/props';
import AccountChips from './AccountChips';
import AmountEntry from './AmountEntry';
import CategoryChips from './CategoryChips';
import type { ReceiptRef } from './ReceiptSheet';
import Field from './Field';
import Sheet from './Sheet';
import { useConfirm } from './ConfirmSheet';

export type Snapshot =
  | { kind: 'income'; item: Income }
  | { kind: 'expense'; item: Expense }
  | { kind: 'transfer'; item: Transfer };

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Тақсимро ба маблағи нав мутаносиб мекунад (нисбатҳои пештара нигоҳ дошта мешаванд). */
function scaleAlloc(alloc: Income['alloc'], from: number, to: number): Income['alloc'] {
  const keys = ALL_IDS.filter(id => (alloc[id] ?? 0) > 0);
  const out: Income['alloc'] = { ...alloc };
  let sum = 0;
  for (const k of keys) { out[k] = round2((alloc[k] * to) / from); sum += out[k]; }
  const diff = round2(to - sum);
  if (keys.length && Math.abs(diff) > 0.001) {
    const big = keys.reduce((a, b) => (alloc[a] >= alloc[b] ? a : b));
    out[big] = round2(out[big] + diff);
  }
  return out;
}

/**
 * Таҳрири амалиёти сабтшуда. Амалиёти оддӣ — пурра, амалиёти вобаста ба қарз/орзу — танҳо сана ва эзоҳ.
 */
export default function EditOperationSheet({ state, setState, refItem, onClose, onSaved }: Props & {
  refItem: ReceiptRef;
  onClose: () => void;
  onSaved: (prev: Snapshot) => void;
}) {
  const inc = refItem.kind === 'income' ? state.incomes.find(i => i.id === refItem.id) : undefined;
  const exp = refItem.kind === 'expense' ? state.expenses.find(e => e.id === refItem.id) : undefined;
  const trf = refItem.kind === 'transfer' ? state.transfers.find(t => t.id === refItem.id) : undefined;
  const base = inc ?? exp ?? trf;

  const linked = !!(inc && inc.kind) || !!(exp && (exp.loanId || exp.debtId || exp.dreamId));
  const [amount, setAmount] = useState(base ? String(base.amount) : '');
  const [date, setDate] = useState(base?.date ?? today());
  const [title, setTitle] = useState(inc?.title ?? exp?.title ?? '');
  const [account, setAccount] = useState<AccountId>(exp?.account ?? 'living');
  const [category, setCategory] = useState<string | null>(exp?.category ?? null);
  const [from, setFrom] = useState<AccountId>(trf?.from ?? 'living');
  const [to, setTo] = useState<AccountId>(trf?.to ?? 'future');

  const [ask, confirmDialog] = useConfirm();

  if (!base) return null;

  const num = parseFloat(amount) || 0;
  const bal = balancesOf(state);
  const hide = hiddenAccounts(state);
  const sign = inc ? '+' : exp ? '−' : undefined;

  // Тавозуни дастрас бо назардошти худи ҳамин амалиёт (он аз нав ҳисоб мешавад)
  const avail = (id: AccountId) => (bal[id] ?? 0)
    + (exp && exp.account === id ? exp.amount : 0)
    + (trf && trf.from === id ? trf.amount : 0)
    - (trf && trf.to === id ? trf.amount : 0);
  const outAccount = exp ? account : trf ? from : null;
  const over = !linked && outAccount !== null && num > avail(outAccount) + 0.005;
  const sameTransfer = !!trf && from === to;
  const ready = num > 0 && !sameTransfer;

  const save = async () => {
    if (!ready) return;
    if (over && !(await ask({ title: 'Маблағи кофӣ нест', text: `Дар ҳисоби «${ACCOUNTS[outAccount!].name}» ҳамагӣ ${fmt(avail(outAccount!))} сомонӣ мавҷуд аст. Ба ҳар ҳол сабт мекунед?`, ok: 'Сабт кардан' }))) return;
    const mark = today();
    if (inc) {
      const prev = { ...inc };
      const t = title.trim() || inc.title;
      setState((s: State) => ({
        ...s,
        incomes: s.incomes
          .map(i => (i.id !== inc.id ? i : {
            ...i, title: t, date,
            ...(linked ? {} : { amount: num, alloc: scaleAlloc(i.alloc, i.amount, num) }),
            edited: mark,
          }))
          .sort((a, b) => b.date.localeCompare(a.date)),
      }));
      onSaved({ kind: 'income', item: prev });
    } else if (exp) {
      const prev = { ...exp };
      const t = title.trim() || (category ?? ACCOUNTS[account].name);
      setState((s: State) => ({
        ...s,
        expenses: s.expenses
          .map(e => (e.id !== exp.id ? e : linked
            ? { ...e, title: t, date, edited: mark }
            : { ...e, title: t, date, amount: num, account, category: category ?? undefined, edited: mark }))
          .sort((a, b) => b.date.localeCompare(a.date)),
        loans: exp.loanId ? s.loans.map(l => (l.id === exp.loanId ? { ...l, date } : l)) : s.loans,
      }));
      onSaved({ kind: 'expense', item: prev });
    } else if (trf) {
      const prev = { ...trf };
      setState((s: State) => ({
        ...s,
        transfers: s.transfers.map(t => (t.id !== trf.id ? t : { ...t, amount: num, date, from, to, edited: mark })),
      }));
      onSaved({ kind: 'transfer', item: prev });
    }
    onClose();
  };

  return (
    <Sheet title="Таҳрири амалиёт" onClose={onClose} tall>
      <div className={`add-body tone-${inc ? 'pos' : 'neg'}`}>
        <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign={sign} locked={linked} />
        {linked && (
          <p className="note" style={{ margin: '0 2px 10px' }}>
            Ин амалиёт ба қарз ё орзу алоқаманд аст: маблағро тағйир додан мумкин нест. Барои тағйири маблағ амалиётро нест
            кунед ва аз нав сабт кунед.
          </p>
        )}
        {exp && !linked && (
          <>
            <AccountChips label="Аз кадом ҳисоб" value={account} onChange={setAccount} bal={bal}
              hidden={hide} spentBy={spent(state.expenses)} />
            <CategoryChips state={state} setState={setState} value={category} onChange={setCategory} />
          </>
        )}
        {trf && (
          <>
            <AccountChips label="Аз ҳисоби" value={from} onChange={setFrom} bal={bal} hidden={hide} />
            <AccountChips label="Ба ҳисоби" value={to} onChange={setTo} bal={bal} hidden={hide} />
          </>
        )}
        {!trf && (
          <Field label="Эзоҳ / унвон">
            <input value={title} onChange={e => setTitle(e.target.value)} />
          </Field>
        )}
        {sameTransfer && <div className="alert danger">Ҳисоби фиристанда ва қабулкунанда бояд гуногун бошанд.</div>}
        {over && num > 0 && (
          <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(avail(outAccount!))}).</div>
        )}
        <button type="button" className="btn big" onClick={save} disabled={!ready}>Нигоҳ доштан</button>
        {confirmDialog}
      </div>
    </Sheet>
  );
}
