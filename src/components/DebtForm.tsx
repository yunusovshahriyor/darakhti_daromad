import { FormEvent, ReactNode, useState } from 'react';
import { fmt, today } from '../model';
import type { Debt } from '../types';
import AmountEntry from './AmountEntry';
import Field from './Field';

interface Values {
  title: string;
  amount: number;
  priority: boolean;
  date: string;
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
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [priority, setPriority] = useState(initial?.priority ?? false);
  const [date, setDate] = useState(initial?.date ?? today());

  const paid = initial?.paid ?? 0;
  const num = parseFloat(amount) || 0;
  const tooLow = initial !== undefined && num > 0 && num < paid - 0.005;
  const ready = num > 0 && !tooLow && title.trim() !== '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    onSubmit({ title: title.trim(), amount: num, priority, date });
  };

  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} />
      {afterPad}
      <Field label="Ба кӣ / барои чӣ">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, қарз ба Алӣ" />
      </Field>
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
