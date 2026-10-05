import { FormEvent, useState } from 'react';
import { fmt } from '../model';
import type { Debt } from '../types';
import Field from './Field';

interface Values {
  title: string;
  amount: number;
  priority: boolean;
}

/** Форма барои илова кардан ва таҳрири қарз. */
export default function DebtForm({ initial, onSubmit, submitLabel }: {
  initial?: Debt;
  onSubmit: (v: Values) => void;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [priority, setPriority] = useState(initial?.priority ?? false);

  const paid = initial?.paid ?? 0;
  const num = parseFloat(amount) || 0;
  const tooLow = initial !== undefined && num > 0 && num < paid - 0.005;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(num > 0) || tooLow) return;
    onSubmit({ title: title.trim(), amount: num, priority });
  };

  return (
    <form onSubmit={submit}>
      <Field label="Ба кӣ / барои чӣ">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, қарз ба Алӣ" required />
      </Field>
      <Field label="Маблағи қарз (сомонӣ)">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
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

      <button className="btn" type="submit" disabled={tooLow}>{submitLabel}</button>
    </form>
  );
}
