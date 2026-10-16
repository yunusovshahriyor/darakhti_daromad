import { FormEvent, ReactNode, useState } from 'react';
import { nextInstallment } from '../loanPlan';
import { ACCOUNTS, ACCOUNT_ORDER, balancesOf, dayTitle, fmt, fxFmt, fxLeft, hiddenAccounts, isFree, remaining, splitDebts, today, uid, withFxPaid } from '../model';
import { defOf } from '../currency';
import { FxRateField } from './FxRate';
import type { Debt } from '../types';
import type { Props } from '../views/props';
import AccountSelect from './AccountSelect';
import AmountEntry from './AmountEntry';
import { useConfirm } from './ConfirmSheet';

/**
 * Пардохти қарз. Манбаъ ҳамеша танҳо ҳисоби «Пардохти қарз» аст.
 * Агар `debt` дода нашавад, қарз аз рӯйхат интихоб мешавад.
 */
export default function PayDebtForm({ state, setState, debt, onDone, afterPad }: Props & {
  debt?: Debt;
  onDone: (msg: string) => void;
  afterPad?: ReactNode;
}) {
  const open = splitDebts(state.debts).open;
  const [pick, setPick] = useState<number | undefined>(debt?.id ?? open[0]?.id);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);

  const current = debt ?? open.find(d => d.id === pick) ?? open[0];
  const free = isFree(state);
  const all = balancesOf(state);
  const [src, setSrc] = useState(() => ACCOUNT_ORDER.filter(id => !hiddenAccounts(state).includes(id)).reduce((a, b) => ((all[b] ?? 0) > (all[a] ?? 0) ? b : a), ACCOUNT_ORDER[0] ?? 'cash'));
  const from = free ? src : 'debt';
  const bal = all[from] ?? 0;
  const fx = current?.fx;
  const base = state.currency ?? 'TJS';
  const [rateText, setRateText] = useState(fx ? String(Math.round(fx.rate * 1e4) / 1e4) : '');
  const rate = fx ? parseFloat(rateText.replace(',', '.')) || 0 : 1;
  // Қарзи хориҷӣ: маблағ бо асъори қарз ворид мешавад (масалан рубл), аз ҳисоб бо қурб ба асъори барнома кам мешавад
  const left = current ? (fx ? fxLeft(current) : remaining(current)) : 0;
  const num = Math.min(parseFloat(amount) || 0, left);
  const baseNum = Math.round(num * rate * 100) / 100;
  const over = baseNum > bal + 0.005;
  const unit = fx ? defOf(fx.code).label : undefined;
  const money = (n: number) => (fx ? fxFmt(n, fx.code) : `${fmt(n)} смн`);

  const [ask, confirmDialog] = useConfirm();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!current || !(num > 0) || !(rate > 0)) return;
    if (over && !(await ask({ title: 'Маблағи кофӣ нест', text: `Дар ҳисоби «${ACCOUNTS[from]?.name ?? from}» ҳамагӣ ${fmt(bal)} сомонӣ мавҷуд аст. Ба ҳар ҳол пардохт мекунед?`, ok: 'Пардохт кардан' }))) return;
    const id = current.id;
    const name = current.title;
    setState(s => ({
      ...s,
      debts: s.debts.map(x => {
        if (x.id !== id) return x;
        if (x.fx) return withFxPaid(x, x.fx.paid + num, rate, date);
        const paid = x.paid + num;
        return paid >= x.amount - 0.005 ? { ...x, paid, paidAt: date } : { ...x, paid };
      }),
      expenses: [
        { id: uid(), account: from, title: fx ? `Қарз: ${name} (${fxFmt(num, fx.code)})` : `Қарз: ${name}`, amount: baseNum, date, debtId: id },
        ...s.expenses,
      ],
    }));
    onDone(num >= left - 0.005 ? `«${name}» пурра пардохт шуд 🎉` : fx ? `${fxFmt(num, fx.code)} (≈ ${fmt(baseNum)} смн) пардохт шуд ✓` : `${fmt(num)} смн пардохт шуд ✓`);
  };

  if (!current) {
    return (
      <>
        {afterPad}
        <p className="muted" style={{ textAlign: 'center', margin: '24px 0' }}>Қарзи кушода нест.</p>
      </>
    );
  }

  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} sign="−" unit={unit} />
      {afterPad}

      {!debt && open.length > 1 && (
        <div className="chips-block">
          <div className="chips-label">Кадом қарз</div>
          <div className="chips">
            {open.map(d => (
              <button key={d.id} type="button" className={d.id === current.id ? 'chip on' : 'chip'}
                onClick={() => setPick(d.id)}>
                <span className="chip-t"><b>{d.priority ? '⭐ ' : ''}{d.title}</b><small>боқӣ {d.fx ? fxFmt(fxLeft(d), d.fx.code) : fmt(remaining(d))}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chips-block">
        <div className="chips-label">Аз ҳисоби</div>
        {free && <AccountSelect value={src} onChange={setSrc} bal={all} hidden={hiddenAccounts(state)} />}
        <div className="chips" style={free ? { display: "none" } : undefined}>
          <span className="chip on" aria-disabled>
            <span className="chip-ic">{ACCOUNTS.debt.icon}</span>
            <span className="chip-t"><b>{ACCOUNTS.debt.name}</b><small>{fmt(bal)}</small></span>
          </span>
          <span className="chip-note">Қарзро танҳо аз ҳамин ҳисоб пардохт мекунед</span>
        </div>
      </div>

      {(() => {
        const due = nextInstallment(current, today());
        if (!due) return null;
        return (
          <div className="chips-block">
            <div className="chips-label">Пардохти №{due.row.n} · {dayTitle(due.row.due)}</div>
            <div className="chips">
              <button type="button" className={Math.abs(num - due.toPay) < 0.005 ? 'chip on' : 'chip'}
                onClick={() => setAmount(String(due.toPay))}>
                <span className="chip-t"><b>{fmt(due.toPay)}</b><small>{due.overdue ? 'мӯҳлат гузашт' : 'пардохти моҳона'}</small></span>
              </button>
            </div>
          </div>
        );
      })()}
      {fx && <FxRateField key={current.id} code={fx.code} base={base} value={rateText} onChange={setRateText} />}
      {fx && num > 0 && rate > 0 && <p className="note">{`Аз ҳисоб кам мешавад: ≈ ${fmt(baseNum)} смн`}</p>}
      <p className="muted" style={{ margin: '4px 2px 0' }}>
        {fx
          ? `${current.title}: боқӣ ${money(left)}${num > 0 ? ` → пас аз пардохт ${money(left - num)}` : ''}`
          : `${current.title}: боқӣ ${fmt(left)} сомонӣ${num > 0 ? ` → пас аз пардохт ${fmt(left - num)}` : ''}`}
      </p>
      {over && num > 0 && (
        <div className="alert danger">⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({fmt(bal)}).</div>
      )}
      <button className="btn big" type="submit" disabled={!(num > 0)}>Пардохти қарз</button>
      {confirmDialog}
    </form>
  );
}
