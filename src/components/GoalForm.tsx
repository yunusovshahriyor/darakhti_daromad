import { FormEvent, useState } from 'react';
import { ACCOUNTS } from '../model';
import type { AccountId } from '../types';
import type { Props } from '../views/props';
import Field from './Field';
import MoneyInput from './MoneyInput';

export default function GoalForm({ state, setState, id, onDone }: Props & {
  id: AccountId;
  onDone: (msg: string) => void;
}) {
  const current = state.goals[id];
  const [value, setValue] = useState(current ? String(current) : '');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseFloat(value) || 0;
    setState(s => {
      const goals = { ...s.goals };
      if (n > 0) goals[id] = n;
      else delete goals[id];
      return { ...s, goals };
    });
    onDone(n > 0 ? 'Мақсад гузошта шуд 🎯' : 'Мақсад бардошта шуд');
  };

  return (
    <form onSubmit={onSubmit}>
      <p className="muted">Мақсад барои «{ACCOUNTS[id].name}»: ба кадом маблағ расидан мехоҳед?</p>
      <Field label="Маблағи мақсад (сомонӣ)">
        <MoneyInput value={value} onChange={setValue} placeholder="Масалан, 10 000" />
      </Field>
      <button className="btn" type="submit">Нигоҳ доштан</button>
      {current ? <p className="note">Барои бардоштани мақсад, майдонро холӣ гузошта нигоҳ доред.</p> : null}
    </form>
  );
}
