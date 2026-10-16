import { useEffect, useRef, useState } from 'react';
import { CURRENCIES, defOf, fetchRate } from '../currency';
import { currentLang } from '../i18n';
import PickerField from './PickerField';
import Field from './Field';

const NAME_IDX = { tg: 0, ru: 1, en: 2 } as const;

/** Интихоби асъори қарз. */
export function FxCurrencyPicker({ value, base, onChange }: { value: string; base: string; onChange: (c: string) => void }) {
  const idx = NAME_IDX[currentLang()];
  return (
    <Field label="Асъори қарз">
      <PickerField value={value} title="Асъори қарз" onChange={onChange}
        options={[base, ...CURRENCIES.map(c => c.code).filter(c => c !== base)].map(c => ({
          value: c, label: defOf(c).name[idx], note: c === 'TJS' ? 'TJS' : defOf(c).label,
        }))} />
    </Field>
  );
}

/** Қурб: 1 воҳиди асъори хориҷӣ = ? воҳиди асъори барнома. Қурби имрӯза аз Интернет гирифта мешавад, ислоҳ кардан мумкин аст. */
export function FxRateField({ code, base, value, onChange, initial }: {
  code: string; base: string; value: string; onChange: (v: string) => void;
  /** Қурби охирин (агар аллакай маълум бошад) — то ҷавоби Интернет интизор шавем. */
  initial?: number;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  const edited = useRef(false);
  useEffect(() => {
    let live = true;
    edited.current = false;
    setState('loading');
    fetchRate(code, base)
      .then(r => { if (live) { if (!edited.current) onChange(String(Math.round(r.rate * 1e4) / 1e4)); setState('ok'); } })
      .catch(() => { if (live) setState('failed'); });
    return () => { live = false; };
  }, [code, base]); // eslint-disable-line react-hooks/exhaustive-deps
  void initial;
  return (
    <>
      <Field label={`Қурб: 1 ${defOf(code).label} = ? ${base === 'TJS' ? 'смн' : defOf(base).label}`}>
        <input inputMode="decimal" value={value} onChange={e => { edited.current = true; onChange(e.target.value); }} placeholder="Масалан, 0.12" />
      </Field>
      <p className="note">{state === 'loading' ? 'Қурби имрӯза гирифта истодааст…' : state === 'ok' ? 'Қурби имрӯза аз Интернет гирифта шуд. Агар дар ҳақиқат дигар бошад, ислоҳ кунед.' : 'Қурб аз Интернет гирифта нашуд: худатон ворид кунед.'}</p>
    </>
  );
}
