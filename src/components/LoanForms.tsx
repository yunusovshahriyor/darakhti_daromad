import { FormEvent, ReactNode, useState } from 'react';
import {
  ACCOUNTS, ACCOUNT_ORDER, balancesOf, fmt, hiddenAccounts, loanLeft, openLoans, today, uid, withNewDebt,
} from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';
import AccountChips from './AccountChips';
import AmountEntry from './AmountEntry';
import Field from './Field';
import LoanProgress from './LoanProgress';

interface Extra {
  onDone: (msg: string) => void;
  afterPad?: ReactNode;
}

const firstAccount = (pref: AccountId): AccountId => (ACCOUNTS[pref] ? pref : ACCOUNT_ORDER[0]);

/** Ман қарз додам: маблағ аз ҳисоби интихобшуда кам мешавад, қарздор сабт мешавад. */
export function LendForm({ state, setState, onDone, afterPad }: Props & Extra) {
  const [account, setAccount] = useState<AccountId>(firstAccount('living'));
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const bal = balancesOf(state);
  const num = parseFloat(amount) || 0;
  const over = num > (bal[account] ?? 0) + 0.005;
  const ready = num > 0 && person.trim() !== '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (over && !window.confirm(
      `Дар ҳисоби «${ACCOUNTS[account].name}» ҳамагӣ ${fmt(bal[account] ?? 0)} сомонӣ мавҷуд аст. Ба ҳар ҳол қарз медиҳед?`,
    )) return;
    const loanId = uid();
    const name = person.trim();
    setState(s => ({
      ...s,
      loans: [...s.loans, { id: loanId, person: name, amount: num, returned: 0, account, date }],
      expenses: [
        { id: uid(), account, title: `Қарз ба ${name}`, amount: num, date, loanId },
        ...s.expenses,
      ],
    }));
    onDone(`${fmt(num)} смн ба ${name} қарз дода шуд ✓`);
  };

  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} />
      {afterPad}
      <AccountChips label="Аз кадом ҳисоб" value={account} onChange={setAccount} bal={bal}
        hidden={hiddenAccounts(state)} />
      <Field label="Ба кӣ қарз медиҳед">
        <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Масалан, Алӣ" />
      </Field>
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal[account] ?? 0)}).</div>
      )}
      <button className="btn big" type="submit" disabled={!ready}>Сабти қарз додан</button>
    </form>
  );
}

/** Қарзро баргардониданд: маблағ ба ҳамон ҳисобе бармегардад, ки аз он дода шуда буд. */
export function ReturnLoanForm({ state, setState, onDone, afterPad }: Props & Extra) {
  const open = openLoans(state.loans);
  const [pick, setPick] = useState<number | undefined>(open[0]?.id);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const current = open.find(l => l.id === pick) ?? open[0];

  if (!current) {
    return (
      <>
        {afterPad}
        <p className="muted" style={{ textAlign: 'center', margin: '24px 0' }}>
          Қарзи додашудаи кушода нест.
        </p>
      </>
    );
  }

  const left = loanLeft(current);
  const num = Math.min(parseFloat(amount) || 0, left);
  const target = firstAccount(current.account);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(num > 0)) return;
    const { id, person } = current;
    setState(s => ({
      ...s,
      loans: s.loans.map(l => {
        if (l.id !== id) return l;
        const returned = l.returned + num;
        return returned >= l.amount - 0.005 ? { ...l, returned, returnedAt: date } : { ...l, returned };
      }),
      incomes: [
        { id: uid(), title: `Бозгашти қарз: ${person}`, amount: num, date, alloc: { [target]: num }, kind: 'loanBack' as const, loanId: id },
        ...s.incomes,
      ].sort((a, b) => b.date.localeCompare(a.date)),
    }));
    onDone(`${person} ${fmt(num)} смн баргардонд ✓`);
  };

  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} />
      {afterPad}
      <div className="chips-block">
        <div className="chips-label">Кӣ баргардонд</div>
        <div className="chips">
          {open.map(l => (
            <button key={l.id} type="button" className={l.id === current.id ? 'chip on' : 'chip'}
              onClick={() => setPick(l.id)}>
              <span className="chip-t"><b>{l.person}</b><small>боқӣ {fmt(loanLeft(l))}</small></span>
            </button>
          ))}
        </div>
      </div>
      <LoanProgress loan={current} extra={num} />
      <p className="muted" style={{ margin: '4px 2px 0' }}>
        Маблағ ба ҳисоби «{ACCOUNTS[target].icon} {ACCOUNTS[target].name}» бармегардад.
      </p>
      <button className="btn big" type="submit" disabled={!(num > 0)}>Сабти баргардонидан</button>
    </form>
  );
}

/** Ман қарз гирифтам: маблағ ба ҳисоби интихобшуда илова мешавад (бе тақсими фоизӣ), қарз сабт мешавад. */
export function BorrowForm({ state, setState, onDone, afterPad }: Props & Extra) {
  const [account, setAccount] = useState<AccountId>(firstAccount('living'));
  const [person, setPerson] = useState('');
  const [priority, setPriority] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const bal = balancesOf(state);
  const num = parseFloat(amount) || 0;
  const ready = num > 0 && person.trim() !== '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const name = person.trim();
    setState(s => {
      const next = withNewDebt(s, { title: name, amount: num, priority, date });
      const debtId = next.debts[next.debts.length - 1].id;
      return {
        ...next,
        incomes: [
          { id: uid(), title: `Қарз гирифтам: ${name}`, amount: num, date, alloc: { [account]: num }, kind: 'borrow' as const, debtId },
          ...next.incomes,
        ].sort((a, b) => b.date.localeCompare(a.date)),
      };
    });
    onDone(`Қарз гирифта шуд: ${fmt(num)} смн ✓`);
  };

  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} />
      {afterPad}
      <AccountChips label="Ба кадом ҳисоб илова шавад" value={account} onChange={setAccount} bal={bal}
        hidden={[...hiddenAccounts(state), 'debt']} />
      <Field label="Аз кӣ қарз гирифтед">
        <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Масалан, Алӣ" />
      </Field>
      <label className="switch-row">
        <span>
          <b>⭐ Аввал пардохт шавад</b>
          <small>Қарзҳои қайдшуда пеш меоянд, дигарон аз рӯи миқдор.</small>
        </span>
        <span className="switch">
          <input type="checkbox" checked={priority} onChange={e => setPriority(e.target.checked)} />
          <i />
        </span>
      </label>
      <button className="btn big" type="submit" disabled={!ready}>Сабти қарз гирифтан</button>
    </form>
  );
}
