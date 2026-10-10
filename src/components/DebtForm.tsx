import { FormEvent, ReactNode, useState } from 'react';
import { fmt, today } from '../model';
import { buildSchedule, paidThrough, planTotals } from '../loanPlan';
import type { Debt, DebtPlan } from '../types';
import AmountEntry from './AmountEntry';
import Field from './Field';

interface Values {
  title: string;
  amount: number;
  priority: boolean;
  date: string;
  plan?: DebtPlan;
  /** Қистҳои то имрӯз аллакай супоридашуда (барои қарзи кӯҳнаи бонкӣ). */
  paid?: number;
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
  const [fixedPay, setFixedPay] = useState(initial?.plan?.payment ? String(initial.plan.payment) : '');
  const [payDay, setPayDay] = useState(initial?.plan?.payDay ? String(initial.plan.payDay) : '');
  const [shift, setShift] = useState(initial?.plan?.shiftWeekend ?? false);
  const [catchUp, setCatchUp] = useState(false);
  const [priority, setPriority] = useState(initial?.priority ?? false);
  const [date, setDate] = useState(initial?.date ?? today());

  const paid = initial?.paid ?? 0;
  const principal = parseFloat(amount) || 0;
  const rateNum = parseFloat(rate.replace(',', '.')) || 0;
  const monthsNum = Math.round(parseFloat(months) || 0);
  const payNum = parseFloat(fixedPay.replace(',', '.').replace(/\s/g, '')) || 0;
  const dayNum = Math.min(31, Math.max(1, Math.round(parseFloat(payDay) || 0)));
  const validBase = bank && principal > 0 && monthsNum >= 1 && monthsNum <= 600 && (method !== 'actual' || payNum > 0);
  const plan: DebtPlan | undefined = validBase
    ? {
        principal, rate: Math.max(0, rateNum), months: monthsNum, method,
        ...(method === 'actual' ? { payment: payNum } : {}),
        ...(payDay.trim() !== '' ? { payDay: dayNum } : {}),
        ...(shift ? { shiftWeekend: true } : {}),
        ...(initial?.plan?.overrides ? { overrides: initial.plan.overrides } : {}),
      } : undefined;
  const rows = plan ? buildSchedule(plan, date) : [];
  const totals = planTotals(rows);
  const num = plan ? totals.total : principal;
  const tooLow = initial !== undefined && num > 0 && num < paid - 0.005;
  const noCover = plan !== undefined && rows.length > 0 && rows[0].principal <= 0;
  const ready = principal > 0 && !tooLow && !noCover && title.trim() !== '' && (!bank || plan !== undefined);
  const pastPaid = plan ? paidThrough(rows, today()) : 0;
  const pastCount = plan ? rows.filter(x => x.due <= today()).length : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    onSubmit({
      title: title.trim(), amount: num, priority, date, plan,
      ...(plan && catchUp ? { paid: Math.min(pastPaid, num) } : {}),
    });
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
              <button type="button" className={method === 'actual' ? 'chip on' : 'chip'} onClick={() => setMethod('actual')}>
                <span className="chip-t"><b>Қисти собити бонк</b><small>фоиз аз рӯзҳои воқеӣ ÷ 365</small></span>
              </button>
              <button type="button" className={method === 'annuity' ? 'chip on' : 'chip'} onClick={() => setMethod('annuity')}>
                <span className="chip-t"><b>Аннуитетӣ</b><small>қисти баробар, фоиз ÷ 12</small></span>
              </button>
              <button type="button" className={method === 'diff' ? 'chip on' : 'chip'} onClick={() => setMethod('diff')}>
                <span className="chip-t"><b>Дифференсиалӣ</b><small>қист тадриҷан кам мешавад</small></span>
              </button>
            </div>
          </div>
          {method === 'actual' && (
            <Field label="Қисти ҳармоҳа аз ҷадвали бонк, смн">
              <input inputMode="decimal" value={fixedPay} onChange={e => setFixedPay(e.target.value)} placeholder="Масалан, 4192" />
            </Field>
          )}
          <Field label="Рӯзи супоридан дар моҳ (холӣ = рӯзи оғоз)">
            <input inputMode="numeric" value={payDay} onChange={e => setPayDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder={`Масалан, ${date.split('-')[2] ? Number(date.split('-')[2]) : 12}`} />
          </Field>
          <label className="switch-row">
            <span>
              <b>Рӯзи истироҳат → душанбе</b>
              <small>Агар рӯзи супоридан шанбе ё якшанбе афтад, ба душанбе мегузарад.</small>
            </span>
            <span className="switch">
              <input type="checkbox" checked={shift} onChange={e => setShift(e.target.checked)} />
              <i />
            </span>
          </label>
          {plan && (
            <div className="loan-info">
              <div><span>{method === 'diff' ? 'Қисти аввал → охир' : 'Қисти ҳармоҳа → охирин'}</span>
                <b>{method === 'diff' || method === 'actual' ? `${fmt(rows[0].payment)} → ${fmt(rows[rows.length - 1].payment)}` : fmt(rows[0].payment)} смн</b></div>
              <div><span>Фоиз дар ҷамъ</span><b>{fmt(totals.interest)} смн</b></div>
              <div><span>Ҷамъи супоридан</span><b>{fmt(totals.total)} смн</b></div>
              <div><span>Қистҳо</span><b>{rows.length} · то {rows[rows.length - 1].due}</b></div>
            </div>
          )}
          {noCover && (
            <div className="alert danger">Қист аз фоизи моҳи аввал кам аст ({fmt(rows[0].interest)}): қарз кам намешавад.</div>
          )}
          {plan && pastCount > 0 && (
            <label className="switch-row">
              <span>
                <b>Қистҳои гузашта аллакай супорида шудаанд</b>
                <small>{pastCount} қист то имрӯз ({fmt(pastPaid)} смн) супорида ҳисоб мешавад, бе хароҷоти нав.</small>
              </span>
              <span className="switch">
                <input type="checkbox" checked={catchUp} onChange={e => setCatchUp(e.target.checked)} />
                <i />
              </span>
            </label>
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
