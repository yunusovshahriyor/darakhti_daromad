import { FormEvent, ReactNode, useState } from 'react';
import { fmt, today } from '../model';
import { buildSchedule, paidThrough, planTotals } from '../loanPlan';
import type { Debt, DebtPlan } from '../types';
import { defOf } from '../currency';
import AmountEntry from './AmountEntry';
import Field from './Field';
import { FxCurrencyPicker, FxRateField } from './FxRate';

interface Values {
  title: string;
  amount: number;
  priority: boolean;
  date: string;
  plan?: DebtPlan;
  /** Пардохтҳои то имрӯз аллакай супоридашуда (барои қарзи кӯҳнаи бонкӣ). */
  paid?: number;
  /** Қарз бо асъори хориҷӣ. */
  fx?: Debt['fx'];
}

const METHODS: { id: DebtPlan['method']; icon: string; title: string; text: string; example: string }[] = [
  { id: 'flat', icon: '🛍️', title: 'Насия (бо комиссия)',
    text: 'Нарх + комиссияи собит. Ҳар моҳ як хел пардохт мекунед.',
    example: 'Масалан: телефон ё техника ба насия, 9 800 + комиссия 1 764 дар 18 моҳ.' },
  { id: 'actual', icon: '🏠', title: 'Бонк ҷадвал додааст',
    text: 'Пардохти моҳона дар ҷадвали бонк навишта шудааст, фоиз аз рӯзҳои воқеӣ ҳисоб мешавад.',
    example: 'Масалан: иҷора ё қарзи хона, пардохти моҳона 4 192, фоиз 16%.' },
  { id: 'annuity', icon: '🏦', title: 'Кредити оддӣ',
    text: 'Пардохти ҳар моҳ як хел, фоиз = фоизи солона ÷ 12.',
    example: 'Масалан: қарзи нақдӣ бо фоизи солонаи 24% барои 12 моҳ.' },
  { id: 'diff', icon: '📉', title: 'Пардохт тадриҷан кам мешавад',
    text: 'Қисми асосӣ ҳар моҳ баробар, фоиз тадриҷан кам мешавад. Пардохти аввал калонтарин.',
    example: 'Масалан: қарзи бонкӣ бо ҷадвали дифференсиалӣ.' },
];

/** Форма барои илова кардан ва таҳрири қарз: маблағи калон, сана, тугмачаҳои рақамӣ. */
export default function DebtForm({ initial, onSubmit, submitLabel, afterPad, base = 'TJS' }: {
  /** Асъори барнома (барои интихоби асъори қарзи нав). */
  base?: string;
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
  const [commission, setCommission] = useState(initial?.plan?.commission !== undefined ? String(initial.plan.commission) : '');
  const [fixedPay, setFixedPay] = useState(initial?.plan?.payment ? String(initial.plan.payment) : '');
  const [payDay, setPayDay] = useState(initial?.plan?.payDay ? String(initial.plan.payDay) : '');
  const [shift, setShift] = useState(initial?.plan?.shiftWeekend ?? false);
  const [catchUp, setCatchUp] = useState(false);
  const [priority, setPriority] = useState(initial?.priority ?? false);
  const [date, setDate] = useState(initial?.date ?? today());
  const [code, setCode] = useState(base);
  const [rateText, setRateText] = useState('');
  const foreign = !initial && code !== base;
  const fxRate = foreign ? parseFloat(rateText.replace(',', '.')) || 0 : 1;

  const paid = initial?.paid ?? 0;
  const principal = parseFloat(amount) || 0;
  const rateNum = parseFloat(rate.replace(',', '.')) || 0;
  const monthsNum = Math.round(parseFloat(months) || 0);
  const payNum = parseFloat(fixedPay.replace(',', '.').replace(/\s/g, '')) || 0;
  const dayNum = Math.min(31, Math.max(1, Math.round(parseFloat(payDay) || 0)));
  const commNum = parseFloat(commission.replace(',', '.').replace(/\s/g, '')) || 0;
  const validBase = bank && !foreign && principal > 0 && monthsNum >= 1 && monthsNum <= 600
    && (method !== 'actual' || payNum > 0) && (method !== 'flat' || commNum >= 0);
  const plan: DebtPlan | undefined = validBase
    ? {
        principal, rate: method === 'flat' ? 0 : Math.max(0, rateNum), months: monthsNum, method,
        ...(method === 'flat' ? { commission: commNum } : {}),
        ...(method === 'actual' ? { payment: payNum } : {}),
        ...(payDay.trim() !== '' ? { payDay: dayNum } : {}),
        ...(shift ? { shiftWeekend: true } : {}),
        ...(initial?.plan?.overrides ? { overrides: initial.plan.overrides } : {}),
      } : undefined;
  const rows = plan ? buildSchedule(plan, date) : [];
  const totals = planTotals(rows);
  const num = plan ? totals.total : foreign ? Math.round(principal * fxRate * 100) / 100 : principal;
  const tooLow = initial !== undefined && num > 0 && num < paid - 0.005;
  const noCover = plan !== undefined && rows.length > 0 && rows[0].principal <= 0;
  const ready = principal > 0 && (!foreign || fxRate > 0) && !tooLow && !noCover && title.trim() !== '' && (!bank || plan !== undefined);
  const pastPaid = plan ? paidThrough(rows, today()) : 0;
  const pastCount = plan ? rows.filter(x => x.due <= today()).length : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    onSubmit({
      title: title.trim(), amount: num, priority, date, plan,
      ...(foreign ? { fx: { code, amount: principal, paid: 0, rate: fxRate } } : {}),
      ...(plan && catchUp ? { paid: Math.min(pastPaid, num) } : {}),
    });
  };

  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate}
        dateLabel={bank ? 'Санаи оғози шартнома' : 'Санаи амалиёт'} unit={foreign ? defOf(code).label : undefined} />
      {afterPad}
      {!initial && (
        <>
          <FxCurrencyPicker value={code} base={base} onChange={c => { setCode(c); setRateText(''); if (c !== base) setBank(false); }} />
          {foreign && (
            <>
              <FxRateField code={code} base={base} value={rateText} onChange={setRateText} />
              {principal > 0 && fxRate > 0 && <p className="note">{`Дар барнома: ≈ ${fmt(num)} смн`}</p>}
            </>
          )}
        </>
      )}
      <Field label="Ба кӣ / барои чӣ">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, қарз ба Алӣ" />
      </Field>
      {!foreign && <label className="switch-row">
        <span>
          <b>🏦 Қарзи бонкӣ (бо фоиз)</b>
          <small>Супоридани ҳармоҳа ва ҳисоби фоизҳо.</small>
        </span>
        <span className="switch">
          <input type="checkbox" checked={bank} onChange={e => setBank(e.target.checked)} />
          <i />
        </span>
      </label>}
      {bank && (
        <>
          <div className="method-block">
            <div className="mb-title">Қарзи шумо кадом навъ аст?</div>
            <div className="method-list" role="radiogroup" aria-label="Усули супоридан">
              {METHODS.map(m => (
                <button key={m.id} type="button" role="radio" aria-checked={method === m.id}
                  className={method === m.id ? 'method on' : 'method'} onClick={() => setMethod(m.id)}>
                  <span className="m-ic">{m.icon}</span>
                  <span className="m-t">
                    <b>{m.title}</b>
                    <small>{m.text}</small>
                    {method === m.id && <em>{m.example}</em>}
                  </span>
                  <span className="m-radio" aria-hidden />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-title sub">Шартҳои қарз</div>
          <div className="two-col">
            {method !== 'flat' && (
              <Field label="Фоиз дар сол, %">
                <input inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} placeholder="Масалан, 24" />
              </Field>
            )}
            {method === 'flat' && (
              <Field label="Комиссия, смн">
                <input inputMode="decimal" value={commission} onChange={e => setCommission(e.target.value)} placeholder="Масалан, 1764" />
              </Field>
            )}
            <Field label="Мӯҳлат, моҳ">
              <input inputMode="numeric" value={months} onChange={e => setMonths(e.target.value.replace(/\D/g, ''))} placeholder="Масалан, 12" />
            </Field>
          </div>
          {method === 'actual' && (
            <Field label="Пардохти моҳона аз ҷадвали бонк, смн">
              <input inputMode="decimal" value={fixedPay} onChange={e => setFixedPay(e.target.value)} placeholder="Масалан, 4192" />
            </Field>
          )}

          <div className="mb-title sub">Рӯзи супоридан</div>
          <Field label="Рӯзи моҳ (холӣ = рӯзи оғози шартнома)">
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
              <div><span>{rows[0].payment !== rows[rows.length - 1].payment ? 'Пардохти аввал → охирин' : 'Пардохти моҳона'}</span>
                <b>{rows[0].payment !== rows[rows.length - 1].payment ? `${fmt(rows[0].payment)} → ${fmt(rows[rows.length - 1].payment)}` : fmt(rows[0].payment)} смн</b></div>
              {method === 'flat' && <div><span>Нархи мол</span><b>{fmt(principal)} смн</b></div>}
              <div><span>{method === 'flat' ? `Комиссия (${principal > 0 ? Math.round((commNum / principal) * 10000) / 100 : 0}% аз нарх)` : 'Фоиз дар ҷамъ'}</span><b>{fmt(totals.interest)} смн</b></div>
              <div><span>Ҷамъи супоридан</span><b>{fmt(totals.total)} смн</b></div>
              <div><span>Пардохти аввал</span><b>{rows[0].due}</b></div>
              <div><span>Пардохтҳо</span><b>{rows.length} · то {rows[rows.length - 1].due}</b></div>
            </div>
          )}
          {noCover && (
            <div className="alert danger">Пардохти моҳона аз фоизи моҳи аввал кам аст ({fmt(rows[0].interest)}): қарз кам намешавад.</div>
          )}
          {plan && pastCount > 0 && (
            <label className="switch-row">
              <span>
                <b>Пардохтҳои гузашта аллакай супорида шудаанд</b>
                <small>{pastCount} пардохт то имрӯз ({fmt(pastPaid)} смн) супорида ҳисоб мешавад, бе хароҷоти нав.</small>
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
