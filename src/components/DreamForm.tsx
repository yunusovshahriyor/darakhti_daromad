import { FormEvent, useRef, useState } from 'react';
import { balancesOf, fmt, today } from '../model';
import type { AccountId, Dream, State } from '../types';
import AccountSelect from './AccountSelect';
import DatePickerSheet from './DatePickerSheet';
import Field from './Field';
import MoneyInput from './MoneyInput';
import PickerField from './PickerField';

export interface DreamValues {
  title: string;
  target: number;
  kind: Dream['kind'];
  priority: boolean;
  deadline?: string;
  image?: string;
  color?: string;
  link?: string;
  note?: string;
  incomeShare?: Dream['incomeShare'];
  autoSave?: Dream['autoSave'];
}

const COLORS = ['#1d8a63', '#3b82f6', '#e59a1b', '#d94b4b', '#8b5cf6', '#ec4899', '#0ea5a5', '#64748b'];

/** Акс: хурд карда мешавад (то 480px, JPEG), то хотира пур нашавад. */
async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}

const dateText = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

/** Форма барои илова кардан ва таҳрири орзу (ҳамон майдонҳо дар ҳарду ҳолат). */
export default function DreamForm({ initial, initialKind = 'big', onSubmit, submitLabel, state, formId, hideSubmit }: {
  /** `form`-и тугмаи берунӣ (масалан, дар поёни саҳифа) ба ин id пайваст мешавад. */
  formId?: string;
  hideSubmit?: boolean;
  initial?: Dream;
  initialKind?: Dream['kind'];
  onSubmit: (v: DreamValues) => void;
  submitLabel: string;
  /** Барои интихоби ҳисоб дар ҷамъкунии худкор. */
  state?: State;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [kind, setKind] = useState<Dream['kind']>(initial?.kind ?? initialKind);
  const [target, setTarget] = useState(initial ? String(initial.target) : '');
  const [priority, setPriority] = useState(initial?.priority ?? false);

  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [pickDeadline, setPickDeadline] = useState(false);
  const [color, setColor] = useState(initial?.color ?? '');
  const [image, setImage] = useState(initial?.image ?? '');
  const [link, setLink] = useState(initial?.link ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const file = useRef<HTMLInputElement>(null);

  const [shareOn, setShareOn] = useState(!!initial?.incomeShare);
  const [sharePct, setSharePct] = useState(initial?.incomeShare ? String(initial.incomeShare.percent) : '10');
  const [shareFrom, setShareFrom] = useState<AccountId>(initial?.incomeShare?.from ?? 'living');

  const a0 = initial?.autoSave;
  const [autoOn, setAutoOn] = useState(!!a0);
  const [autoAmount, setAutoAmount] = useState(a0 ? String(a0.amount) : '50');
  const [every, setEvery] = useState<'week' | 'month'>(a0?.every ?? 'week');
  const [autoFrom, setAutoFrom] = useState<AccountId>(a0?.from ?? 'living');
  const [ladder, setLadder] = useState(!!a0?.ladder);

  const num = parseFloat(target) || 0;
  const bal = state ? balancesOf(state) : {};
  const extras = true;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!(num > 0)) return;
    const v: DreamValues = { title: title.trim(), target: num, kind, priority };
    if (extras) {
      v.deadline = deadline || undefined;
      v.image = image || undefined;
      v.color = color || undefined;
      v.link = link.trim() || undefined;
      v.note = note.trim() || undefined;
      const pct = Math.min(100, parseFloat(sharePct) || 0);
      v.incomeShare = shareOn && pct > 0 ? { percent: pct, from: shareFrom } : undefined;
      const amt = parseFloat(autoAmount) || 0;
      if (autoOn && amt > 0) {
        const same = a0 && a0.every === every;
        v.autoSave = {
          amount: amt, every, from: autoFrom, ladder: every === 'week' && ladder,
          started: same ? a0.started : today(),
          lastRun: same ? a0.lastRun : undefined,
          count: same ? a0.count : 0,
        };
      } else v.autoSave = undefined;
    }
    onSubmit(v);
  };

  const pickImage = async (f?: File) => {
    if (!f) return;
    try { setImage(await shrink(f)); } catch { /* файл хонда нашуд */ }
  };

  const switchRow = (on: boolean, set: (v: boolean) => void, t: string, hint: string) => (
    <label className="switch-row">
      <span><b>{t}</b><small>{hint}</small></span>
      <span className="switch">
        <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} />
        <i />
      </span>
    </label>
  );

  return (
    <form id={formId} onSubmit={submit}>
      <Field label="Номи орзу">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Масалан, мошин" required />
      </Field>
      <Field label="Навъ">
        <PickerField value={kind} onChange={v => setKind(v as Dream['kind'])} title="Навъи орзу" options={[
          { value: 'big', label: 'Калон', icon: '🏠', note: 'мошин, хона…' },
          { value: 'small', label: 'Хурд', icon: '✈️', note: 'сафар, телефон…' },
        ]} />
      </Field>
      <Field label="Нархи орзу (сомонӣ)">
        <MoneyInput value={target} onChange={setTarget} placeholder="0" required />
      </Field>

      {switchRow(priority, setPriority, '⭐ Аввал харида шавад', 'Орзуҳои қайдшуда пеш меоянд, дигарон аз рӯи нарх: аввал арзонтарин.')}

      {extras && (
        <>
          <Field label="Санаи мақсад (то кай харидан мехоҳед)">
            <button type="button" className="picker-btn" onClick={() => setPickDeadline(true)}>
              <span className="pk-ic">📅</span>
              <span className="pk-t">{deadline ? dateText(deadline) : 'Муайян нашудааст'}</span>
              {deadline && <small onClick={e => { e.stopPropagation(); setDeadline(''); }}>✕ бекор</small>}
            </button>
          </Field>

          <div className="field">
            <span>Акс</span>
            <div className="img-row">
              {image ? <img src={image} alt="" /> : <div className="img-ph">🖼️</div>}
              <button type="button" className="btn-sm" onClick={() => file.current?.click()}>
                {image ? 'Иваз кардан' : 'Акс интихоб кардан'}
              </button>
              {image && <button type="button" className="btn-sm ghost" onClick={() => setImage('')}>Нест кардан</button>}
              <input ref={file} type="file" accept="image/*" hidden
                onChange={e => { void pickImage(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          </div>

          <div className="field">
            <span>Ранг</span>
            <div className="swatches colors">
              {COLORS.map(c => (
                <button type="button" key={c} className={c === color ? 'on' : ''} style={{ background: c }}
                  onClick={() => setColor(c === color ? '' : c)} aria-label={c} />
              ))}
            </div>
          </div>

          <Field label="Истинод ба мағоза / эълон (ихтиёрӣ)">
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="Эзоҳ (ихтиёрӣ)">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Масалан, ранги сафед, 2023" />
          </Field>

          {switchRow(autoOn, setAutoOn, '🔁 Ҷамъкунии худкор', 'Ҳар ҳафта ё моҳ маблағ худкор ба орзуҳо мегузарад.')}
          {autoOn && (
            <div className="sub-fields">
              <Field label="Маблағ (сомонӣ)">
                <MoneyInput value={autoAmount} onChange={setAutoAmount} placeholder="50" />
              </Field>
              <Field label="Басомад">
                <PickerField value={every} onChange={v => setEvery(v as 'week' | 'month')} title="Басомад" options={[
                  { value: 'week', label: 'Ҳар ҳафта', icon: '📆' },
                  { value: 'month', label: 'Ҳар моҳ', icon: '🗓️' },
                ]} />
              </Field>
              <Field label="Аз кадом ҳисоб">
                <AccountSelect value={autoFrom} onChange={setAutoFrom} bal={bal}
                  hidden={['bigDream', 'smallDream']} />
              </Field>
              {every === 'week' && switchRow(ladder, setLadder, '🪜 Бозии 52 ҳафта',
                `Ҳафтаи 1: ${fmt(parseFloat(autoAmount) || 0)}, ҳафтаи 2: ${fmt((parseFloat(autoAmount) || 0) * 2)}… то ҳафтаи 52.`)}
            </div>
          )}

          {switchRow(shareOn, setShareOn, '💸 Ҳиссаи ҳар даромад', 'Аз ҳар даромади оддӣ фоизи муайян худкор ба ин орзу меравад.')}
          {shareOn && (
            <div className="sub-fields">
              <Field label="Фоиз аз даромад">
                <MoneyInput value={sharePct} onChange={setSharePct} placeholder="10" />
              </Field>
              <Field label="Аз кадом ҳисоб гирифта шавад">
                <AccountSelect value={shareFrom} onChange={setShareFrom} bal={bal}
                  hidden={['bigDream', 'smallDream']} />
              </Field>
            </div>
          )}
        </>
      )}

      {!hideSubmit && <button className="btn" type="submit">{submitLabel}</button>}

      {pickDeadline && (
        <DatePickerSheet value={deadline || today()} min={today()} max={`${new Date().getFullYear() + 15}-12-31`}
          title="Санаи мақсад" quick={false} onSelect={setDeadline} onClose={() => setPickDeadline(false)} />
      )}
    </form>
  );
}
