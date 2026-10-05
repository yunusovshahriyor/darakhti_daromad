import { FormEvent, useState } from 'react';
import type { Dream } from '../types';
import Field from './Field';

interface Values {
  title: string;
  target: number;
  kind: Dream['kind'];
  priority: boolean;
}

/** Форма барои илова кардан ва таҳрири орзу. */
export default function DreamForm({ initial, initialKind = 'big', onSubmit, submitLabel }: {
  initial?: Dream;
  initialKind?: Dream['kind'];
  onSubmit: (v: Values) => void;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<Dream['kind']>(initial?.kind ?? initialKind);
  const [target, setTarget] = useState(initial ? String(initial.target) : '');
  const [priority, setPriority] = useState(initial?.priority ?? false);

  const num = parseFloat(target) || 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(num > 0)) return;
    onSubmit({ title: title.trim(), target: num, kind, priority });
  };

  return (
    <form onSubmit={submit}>
      <Field label="Номи орзу">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, мошин" required />
      </Field>
      <Field label="Навъ">
        <select value={kind} onChange={e => setKind(e.target.value as Dream['kind'])}>
          <option value="big">🏠 Калон</option>
          <option value="small">✈️ Хурд</option>
        </select>
      </Field>
      <Field label="Нархи орзу (сомонӣ)">
        <input type="number" inputMode="decimal" min="0" step="0.01" value={target}
          onChange={e => setTarget(e.target.value)} placeholder="0.00" required />
      </Field>

      <label className="switch-row">
        <span>
          <b>⭐ Аввал харида шавад</b>
          <small>Орзуҳои қайдшуда пеш меоянд, дигарон аз рӯи нарх: аввал арзонтарин.</small>
        </span>
        <span className="switch">
          <input type="checkbox" checked={priority} onChange={e => setPriority(e.target.checked)} />
          <i />
        </span>
      </label>

      <button className="btn" type="submit">{submitLabel}</button>
    </form>
  );
}
