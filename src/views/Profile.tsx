import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { squareJpeg } from '../image';
import { setAvatar, useSync } from '../sync';
import Field from '../components/Field';
import { ChevronIcon, PencilIcon } from '../components/Icons';
import Sheet from '../components/Sheet';
import TelegramSheet from '../components/TelegramSheet';
import { fmt, inPeriod, monthlyIncome, periodAt } from '../model';
import type { Props, Sub } from './props';

const NAME_KEY = 'darakhti:profile';

const readName = (): string => {
  try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; }
};

interface ProfileProps extends Props {
  open: (s: Sub) => void;
  canInstall: boolean;
  install: () => void;
  standalone: boolean;
  ios: boolean;
  onOpenAuth: () => void;
  /** Бо `?tg=link` (аз тугмаи бот): равзанаи Telegram худкор кушода мешавад. */
  autoTelegram?: boolean;
  onTelegramShown?: () => void;
}

export default function Profile({ state, open, canInstall, install, standalone, ios, onOpenAuth, autoTelegram, onTelegramShown }: ProfileProps) {
  const [name, setName] = useState(readName);
  const [editing, setEditing] = useState(false);
  const [tgOpen, setTgOpen] = useState(!!autoTelegram);
  useEffect(() => { if (autoTelegram) onTelegramShown?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState('');
  const sync = useSync();
  // Таҳрири акс: `pick` — аксҳои нави интихобшуда (ҳанӯз бор нашудааст), `removePhoto` — нест кардан
  const [pick, setPick] = useState<{ blob: Blob; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const closeEdit = () => {
    if (pick) URL.revokeObjectURL(pick.url);
    setPick(null);
    setPhotoErr('');
    setEditing(false);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoErr('');
    try {
      const blob = await squareJpeg(file);
      if (pick) URL.revokeObjectURL(pick.url);
      setPick({ blob, url: URL.createObjectURL(blob) });
      } catch (err) {
      setPhotoErr(err instanceof Error ? err.message : 'Акс хонда нашуд');
    }
  };

  useEffect(() => {
    try { localStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
  }, [name]);

  const { incomes, expenses } = state;
  const month = periodAt('month', 0);
  const incomeMonth = incomes.filter(i => inPeriod(i.date, month)).reduce((s, i) => s + i.amount, 0);
  const spentMonth = expenses.filter(e => inPeriod(e.date, month)).reduce((s, e) => s + e.amount, 0);
  const incomeAll = incomes.reduce((s, i) => s + i.amount, 0);
  const spentAll = expenses.reduce((s, e) => s + e.amount, 0);
  const months = monthlyIncome(incomes);
  const max = Math.max(...months.map(m => m.total), 1);
  const avg = months.filter(m => m.total > 0).length
    ? months.reduce((s, m) => s + m.total, 0) / months.filter(m => m.total > 0).length : 0;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setName(draft.trim());
    // Акс: нав бор мешавад ё нест мешавад; аксҳои кӯҳна дар Storage худкор нест мешаванд
    if (pick) {
      setSaving(true);
      setPhotoErr('');
      try {
        await setAvatar(pick.blob);
      } catch (err) {
        setPhotoErr(err instanceof Error ? err.message : 'Акс нигоҳ дошта нашуд');
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    closeEdit();
  };

  return (
    <div className="profile-page">
      <section className="pf-hero">
        {(() => {
          const signed = sync.configured && sync.status !== 'signedout' && sync.status !== 'off' && sync.email !== '';
          const shown = signed ? (name || sync.name || sync.email.split('@')[0]) : 'Меҳмон';
          return (
            <>
              <div className="pf-avatar">
                {signed && sync.photo
                  ? <img src={sync.photo} alt="" referrerPolicy="no-referrer" />
                  : signed ? shown.trim().charAt(0).toUpperCase() : '👤'}
              </div>
              <div className="pf-who">
                <b>{shown}</b>
                {signed ? <small className="pf-mail">{sync.email}</small> : <small>Ворид нашудаед · маълумот танҳо дар ин дастгоҳ</small>}
                {!signed && sync.configured && (
                  <button className="pf-login" onClick={onOpenAuth}>Ворид шудан ё сабти ном</button>
                )}
              </div>
              {signed && (
                <button className="icon-btn" aria-label="Таҳрири ном"
                  onClick={() => { setDraft(name || sync.name); setEditing(true); }}>
                  <PencilIcon />
                </button>
              )}
            </>
          );
        })()}
      </section>

      <h3 className="group-title"><span>Даромад</span></h3>
      <section className="pf-income">
        <div className="pf-big">
          <small>Ин моҳ</small>
          <b>{fmt(incomeMonth)} <i>смн</i></b>
        </div>
        <div className="pf-bars">
          {months.map(m => (
            <div key={m.key} className="pf-bar">
              <span style={{ height: `${Math.max(4, (m.total / max) * 100)}%` }} className={m.total ? '' : 'zero'} />
              <small>{m.label.slice(0, 3)}</small>
            </div>
          ))}
        </div>
        <div className="pf-stats">
          <div><small>Ҳамаи вақт</small><b>{fmt(incomeAll)}</b></div>
          <div><small>Миёна дар моҳ</small><b>{fmt(Math.round(avg))}</b></div>
          <div><small>Хароҷоти моҳ</small><b>{fmt(spentMonth)}</b></div>
          <div><small>Ҳамаи хароҷот</small><b>{fmt(spentAll)}</b></div>
        </div>
      </section>

      <h3 className="group-title"><span>Бахшҳо</span></h3>
      <div className="cells">
        <button className="cell tap link" onClick={() => open('dreams')}>
          <div className="ic">✨</div>
          <div className="grow"><b>Орзуҳо</b><small>{state.dreams.length} орзу</small></div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => open('debts')}>
          <div className="ic">💳</div>
          <div className="grow"><b>Қарзҳо</b><small>{state.debts.length + state.loans.length} сабт</small></div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => setTgOpen(true)}>
          <div className="ic">✈️</div>
          <div className="grow"><b>Telegram-бот</b><small>Ёдоварии пардохтҳо ва хулоса</small></div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => open('settings')}>
          <div className="ic">⚙️</div>
          <div className="grow"><b>Танзимот</b><small>Фоизҳои тақсим, маълумот</small></div>
          <ChevronIcon />
        </button>
      </div>

      {!standalone && (
        <>
          <h3 className="group-title"><span>Барнома</span></h3>
          <div className="cells">
            {canInstall ? (
              <button className="cell tap link" onClick={install}>
                <div className="ic">📲</div>
                <div className="grow">
                  <b>Ҳамчун барнома насб кардан</b>
                  <small>Ба экрани асосӣ илова кунед</small>
                </div>
                <ChevronIcon />
              </button>
            ) : (
              <div className="cell">
                <div className="ic">📲</div>
                <div className="grow">
                  <b>Ҳамчун барнома насб кардан</b>
                  <small>{ios
                    ? 'Тугмаи «Мубодила» (↑) → «Add to Home Screen»'
                    : 'Менюи браузер (⋮) → «Install app» / «Add to Home screen»'}</small>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tgOpen && <TelegramSheet onClose={() => setTgOpen(false)} onOpenAuth={onOpenAuth} />}

      {editing && (
        <Sheet title="Таҳрири маълумотҳо" onClose={closeEdit}>
          <form onSubmit={save}>
            {(() => {
              const shown = pick ? pick.url : sync.photo;
              const letter = (draft || sync.name || sync.email).trim().charAt(0).toUpperCase() || '👤';
              return (
                <div className="pe-photo">
                  <button type="button" className="pe-ava" onClick={() => fileRef.current?.click()} aria-label="Акс интихоб кардан">
                    {shown ? <img src={shown} alt="" referrerPolicy="no-referrer" /> : <span>{letter}</span>}
                    <i className="pe-cam" aria-hidden>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-1.6A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.2.4L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" /><circle cx="12" cy="12.5" r="3.3" />
                      </svg>
                    </i>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                </div>
              );
            })()}
            <Field label="Ном">
              <input value={draft} maxLength={30} onChange={e => setDraft(e.target.value)} placeholder="Масалан, Шаҳриёр" />
            </Field>
            {photoErr && <div className="alert danger">{photoErr}</div>}
            <button className="btn big" type="submit" disabled={saving}>{saving ? 'Нигоҳ дошта истодааст…' : 'Нигоҳ доштан'}</button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
