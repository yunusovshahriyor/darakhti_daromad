import { FormEvent, ReactNode, useState } from 'react';
import { fmt, today } from '../model';
import { buildSchedule, planTotals } from '../loanPlan';
import type { Debt, DebtPlan } from '../types';
import AmountEntry from './AmountEntry';
import Field from './Field';

interface Values {
  title: string;
  amount: number;
  priority: boolean;
  date: string;
  plan?: DebtPlan;
}

/** Форма барои илова кардан ва таҳрири қарз: маблағи калон, сана, тугмачаҳои рақамӣ. */
export default function DebtForm({ initial, onSubmit, submitLabel, afterPad }: {
  initial?: Debt;
  onSubmit: (v: Values) => void;
  submitLabel: string;
  /** Блоки иловагӣ ба зери тугмачаҳои рақамӣ (масалан, «Чӣ шуд»). */
  afterPad?: ReactNode;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.plan?.principal ?? initial.amount) : '');
  const [bank, setBank] = useState(!!initial?.plan);
  const [rate, setRate] = useState(initial?.plan ? String(initial.plan.rate) : '');
  const [months, setMonths] = useState(initial?.plan ? String(initial.plan.months) : '');
  const [method, setMethod] = useState<DebtPlan['method']>(initial?.plan?.method ?? 'annuity');
  const [priority, setPriority] = useState(initial?.priority ?? false);
  const [date, setDate] = useState(initial?.date ?? today());

  const paid = initial?.paid ?? 0;
  const principal = parseFloat(amount) || 0;
  const rateNum = parseFloat(rate.replace(',', '.')) || 0;
  const monthsNum = Math.round(parseFloat(months) || 0);
  const plan: DebtPlan | undefined = bank && principal > 0 && monthsNum >= 1 && monthsNum <= 600
    ? { principal, rate: Math.max(0, rateNum), months: monthsNum, method } : undefined;
  const rows = plan ? buildSchedule(plan, date) : [];
  const totals = planTotals(rows);
  const num = plan ? totals.total : principal;
  const tooLow = initial !== undefined && num > 0 && num < paid - 0.005;
  const ready = principal > 0 && !tooLow && title.trim() !== '' && (!bank || plan !== undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    onSubmit({ title: title.trim(), amount: num, priority, date, plan });
  };

  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} />
      {afterPad}
      <Field label="Ба кӣ / барои чӣ">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, қарз ба Алӣ" />
      </Field>
      <label className="switch-row">
        <span>
          <b>🏦 Қарзи бонкӣ (бо фоиз)</b>
          <small>Супоридани ҳармоҳа ва ҳисоби фоизҳо.</small>
        </span>
        <span className="switch">
          <input type="checkbox" checked={bank} onChange={e => setBank(e.target.checked)} />
          <i />
        </span>
      </label>
      {bank && (
        <>
          <div className="two-col">
            <Field label="Фоиз дар сол, %">
              <input inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} placeholder="Масалан, 24" />
            </Field>
            <Field label="Мӯҳлат, моҳ">
              <input inputMode="numeric" value={months} onChange={e => setMonths(e.target.value.replace(/\D/g, ''))} placeholder="Масалан, 12" />
            </Field>
          </div>
          <div className="chips-block">
            <div className="chips-label">Усули супоридан</div>
            <div className="chips">
              <button type="button" className={method === 'annuity' ? 'chip on' : 'chip'} onClick={() => setMethod('annuity')}>
                <span className="chip-t"><b>Аннуитетӣ</b><small>қисти ҳармоҳа баробар</small></span>
              </button>
              <button type="button" className={method === 'diff' ? 'chip on' : 'chip'} onClick={() => setMethod('diff')}>
                <span className="chip-t"><b>Дифференсиалӣ</b><small>қист тадриҷан кам мешавад</small></span>
              </button>
            </div>
          </div>
          {plan && (
            <div className="loan-info">
              <div><span>{method === 'annuity' ? 'Қисти ҳармоҳа' : 'Қисти аввал → охир'}</span>
                <b>{method === 'annuity' ? fmt(rows[0].payment) : `${fmt(rows[0].payment)} → ${fmt(rows[rows.length - 1].payment)}`} смн</b></div>
              <div><span>Фоиз дар ҷамъ</span><b>{fmt(totals.interest)} смн</b></div>
              <div><span>Ҷамъи супоридан</span><b>{fmt(totals.total)} смн</b></div>
            </div>
          )}
        </>
      )}
      {tooLow && (
        <div className="alert danger">Маблағ аз қисми аллакай пардохтшуда ({fmt(paid)}) кам буда наметавонад.</div>
      )}

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

      <button className="btn big" type="submit" disabled={!ready}>{submitLabel}</button>
    </form>
  );
}
