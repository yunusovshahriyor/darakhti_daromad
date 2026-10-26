import { useEffect, useState } from 'react';
import { useConfirm } from '../components/ConfirmSheet';
import CurrencySheet from '../components/CurrencySheet';
import LockSheet from '../components/LockSheet';
import RecurringSheet from '../components/RecurringSheet';
import { isLockOn } from '../lock';
import FreeAccounts from '../components/FreeAccounts';
import { defOf } from '../currency';
import { ChevronIcon } from '../components/Icons';
import { useHistoryLayer } from '../components/useHistoryLayer';
import Sheet from '../components/Sheet';
import { ACCENTS, getAccent, getTheme, setTheme } from '../theme';
import { hapticOn, setHapticOn, success } from '../haptic';
import type { Accent, ThemeMode } from '../theme';
import { LANGS, currentLang, setLang } from '../i18n';
import { ONBOARD } from '../onboardText';
import type { Lang } from '../i18n';
import { hasUnsynced, saveLangToAccount, signOutAndWipe, syncNow, useSync } from '../sync';
import { fmt, hasShares, mainAccountOf, sharesOf, SYSTEM_IDS } from '../model';
import { emptyState } from '../storage';
import type { Props } from './props';

export type SettingsPage = 'menu' | 'accounts';

export default function SettingsView({ state, setState, onToast, onIntro, page, setPage }: Props & {
  onToast: (m: string) => void;
  onIntro: () => void;
  /** Зерсаҳифа дар App нигоҳ дошта мешавад: сарлавҳа ва тугмаи «бозгашт» дар ActionBar. */
  page: SettingsPage;
  setPage: (p: SettingsPage) => void;
}) {
  const sync = useSync();
  const [langOpen, setLangOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  const [curOpen, setCurOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [lockTick, setLockTick] = useState(0);
  const [haptic, setHaptic] = useState(hapticOn);
  const [mode, setMode] = useState<ThemeMode>(getTheme);
  const [accent, setAccent] = useState<Accent>(getAccent);
  const MODES: [ThemeMode, string, string][] = [['auto', 'Худкор', '🌓'], ['light', 'Равшан', '☀️'], ['dark', 'Торик', '🌙']];
  const pickLook = (m: ThemeMode, a: Accent) => { setMode(m); setAccent(a); setTheme(m, a); };
  const lang = currentLang();
  const chooseLang = async (l: Lang) => {
    if (l === lang) { setLangOpen(false); return; }
    // Забон ба аккаунт сабт мешавад (то бот низ ҳамин забонро истифода барад); бекор шудан ё хатогӣ монеъ намешавад
    await Promise.race([saveLangToAccount(l).catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
    setLang(l);
  };
  const signed = sync.configured && sync.status !== 'signedout' && sync.status !== 'off' && sync.email !== '';
  // «Бозгашт»-и телефон аз зерсаҳифаи «Ҳисобҳо ва фоизҳо» ба менюи танзимот бармегардонад
  useHistoryLayer(page === 'accounts', () => setPage('menu'));

  const [ask, confirmDialog] = useConfirm();

  const [wipeOpen, setWipeOpen] = useState(false);
  /** Нест кардани як навъи маълумот: ҳар навъ танҳо чизҳои вобастаи худро мебарад. */
  const wipePart = async (kind: 'incomes' | 'expenses' | 'transfers' | 'debts' | 'loans' | 'dreams') => {
    const T: Record<typeof kind, { title: string; text: string; run: () => void }> = {
      incomes: {
        title: 'Нест кардани ҳамаи даромад',
        text: 'Ҳамаи сабтҳои даромад нест мешаванд (бо тақсими онҳо ба ҳисобҳо). Хароҷот, қарзҳо ва орзуҳо мемонанд. Барқарор кардан мумкин нест.',
        run: () => setState(s => ({ ...s, incomes: [] })),
      },
      expenses: {
        title: 'Нест кардани ҳамаи хароҷот',
        text: 'Ҳамаи сабтҳои хароҷот нест мешаванд (аз ҷумла пардохтҳои қарз). Даромад, қарзҳо ва орзуҳо мемонанд. Барқарор кардан мумкин нест.',
        run: () => setState(s => ({ ...s, expenses: [] })),
      },
      transfers: {
        title: 'Нест кардани ҳамаи гузаронидан',
        text: 'Ҳамаи гузаронидани байни ҳисобҳо нест мешаванд. Барқарор кардан мумкин нест.',
        run: () => setState(s => ({ ...s, transfers: [] })),
      },
      debts: {
        title: 'Нест кардани ҳамаи қарзҳо',
        text: 'Ҳамаи қарзҳое, ки шумо қарздоред (кушода ва пардохтшуда), бо пардохтҳои онҳо нест мешаванд. Даромади «Қарз гирифтам» мемонад. Барқарор кардан мумкин нест.',
        run: () => setState(s => ({
          ...s,
          debts: [],
          expenses: s.expenses.filter(x => x.debtId === undefined),
          incomes: s.incomes.map(i => (i.kind === 'borrow' ? { ...i, debtId: undefined } : i)),
        })),
      },
      loans: {
        title: 'Нест кардани ҳамаи қарздорон',
        text: 'Ҳамаи қарзҳое, ки шумо додаед (дигарон ба шумо қарздоранд), бо сабтҳои додан ва баргардонидан нест мешаванд. Барқарор кардан мумкин нест.',
        run: () => setState(s => ({
          ...s,
          loans: [],
          expenses: s.expenses.filter(x => x.loanId === undefined),
          incomes: s.incomes.filter(i => i.kind !== 'loanBack'),
        })),
      },
      dreams: {
        title: 'Нест кардани ҳамаи орзуҳо',
        text: 'Ҳамаи орзуҳо (кушода ва харидашуда) бо хароҷоти харидашон нест мешаванд. Барқарор кардан мумкин нест.',
        run: () => setState(s => ({ ...s, dreams: [], expenses: s.expenses.filter(x => x.dreamId === undefined) })),
      },
    };
    const t = T[kind];
    if (await ask({ title: t.title, text: t.text, ok: 'Ҳаа, нест кунед', danger: true })) { t.run(); setWipeOpen(false); onToast('Нест шуд'); }
  };

  const wipe = async () => {
    const ok = await ask({
      title: 'Нест кардани ҳамаи маълумот',
      text: 'Ҳамаи маълумот (даромад, хароҷот, қарз, орзуҳо, ҳисобҳо) нест мешавад ва онро барқарор кардан мумкин нест.',
      ok: 'Ҳаа, нест кунед',
      danger: true,
    });
    if (ok) setState(emptyState());
  };

  const logout = async () => {
    const ok = await ask({
      title: 'Баромад аз аккаунт',
      text: 'Шумо аз аккаунт мебароед ва ҳамаи маълумоти ин дастгоҳ нест мешавад. Дар сервер маълумот мемонад ва бо ворид шудан дубора пайдо мешавад.',
      ok: 'Баромадан',
      danger: true,
    });
    if (!ok) return;
    // Пеш аз пок кардан тағйироти охиринро ба сервер мефиристем
    try { await syncNow(); } catch { /* санҷиш дар поён */ }
    if (hasUnsynced()) {
      const force = await ask({
        title: 'Маълумот сабт нашудааст',
        text: 'Тағйироти охирин ба сервер нарасид (интернет нест?). Агар ҳоло бароед, он гум мешавад.',
        ok: 'Ҳамоно баромадан',
        danger: true,
      });
      if (!force) return;
    }
    try { await signOutAndWipe(); } catch { onToast('Баромад нашуд: аз нав кӯшиш кунед'); }
  };

  const accountCount = state.accounts.filter(a => !a.archived && !SYSTEM_IDS.includes(a.id)).length;

  if (page === 'menu') {
    return (
      <>
        <div className="cells">
          <button className="cell tap link" onClick={() => setPage('accounts')}>
            <div className="ic">🧩</div>
            <div className="grow">
              <b>Ҳисобҳо ва фоизҳо</b>
              <small>{hasShares(state) ? `${accountCount} ҳисоб · аз ҳар даромад ${fmt(Math.round((100 - (sharesOf(state)[mainAccountOf(state)] ?? 100)) * 100) / 100)}% ҷудо мешавад` : `${accountCount} ҳисоб`}</small>
            </div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={onIntro}>
            <div className="ic">👋</div>
            <div className="grow"><b>{ONBOARD[lang].replay}</b></div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={() => setLangOpen(true)}>
            <div className="ic">🌐</div>
            <div className="grow"><b>Забон</b><small>{LANGS.find(l => l.id === lang)?.name}</small></div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={() => setRecOpen(true)}>
            <div className="ic">🔁</div>
            <div className="grow"><b>Хароҷоти такрорӣ</b><small>{(state.recurring ?? []).length ? `${(state.recurring ?? []).length} ададӣ` : 'Иҷора, интернет, обуна'}</small></div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={() => setCurOpen(true)}>
            <div className="ic">💱</div>
            <div className="grow"><b>Қурби асъор</b><small>{state.currency ?? 'TJS'}</small></div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={() => setLookOpen(true)}>
            <div className="ic">🎨</div>
            <div className="grow"><b>Замина</b><small>{MODES.find(m => m[0] === mode)?.[1]} · {ACCENTS[accent].name}</small></div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={() => setLockOpen(true)} data-tick={lockTick}>
            <div className="ic">🔒</div>
            <div className="grow"><b>Қулфи барнома</b><small>{isLockOn() ? 'Фаъол: PIN' : 'Хомӯш'}</small></div>
            <ChevronIcon />
          </button>
          {signed && (
            <button className="cell tap link" onClick={logout}>
              <div className="ic">↪️</div>
              <div className="grow"><b>Баромад аз аккаунт</b><small>{sync.email}</small></div>
              <ChevronIcon />
            </button>
          )}
        </div>

        <button className="btn danger" onClick={() => setWipeOpen(true)}>Нест кардани маълумот</button>

        {confirmDialog}

        {wipeOpen && (
          <Sheet title="Нест кардани маълумот" onClose={() => setWipeOpen(false)}>
            <div className="cells">
              {([
                ['incomes', '📥', 'Нест кардани ҳамаи даромад', state.incomes.length],
                ['expenses', '📤', 'Нест кардани ҳамаи хароҷот', state.expenses.length],
                ['transfers', '🔄', 'Нест кардани ҳамаи гузаронидан', state.transfers.length],
                ['debts', '💳', 'Нест кардани ҳамаи қарзҳо', state.debts.length],
                ['loans', '🤝', 'Нест кардани ҳамаи қарздорон', state.loans.length],
                ['dreams', '✨', 'Нест кардани ҳамаи орзуҳо', state.dreams.length],
              ] as const).map(([k, ic, label, n]) => (
                <button key={k} type="button" className="cell tap link" disabled={n === 0} onClick={() => void wipePart(k)}>
                  <div className="ic">{ic}</div>
                  <div className="grow"><b>{label}</b><small>{n === 0 ? 'Холӣ' : `${n} сабт`}</small></div>
                  <ChevronIcon />
                </button>
              ))}
            </div>
            <button className="btn danger" onClick={() => { setWipeOpen(false); void wipe(); }}>Нест кардани ҳамаи маълумот</button>
          </Sheet>
        )}

        {recOpen && <RecurringSheet state={state} setState={setState} onClose={() => setRecOpen(false)} />}
        {lockOpen && <LockSheet onClose={() => setLockOpen(false)} onChange={() => setLockTick(x => x + 1)} />}
        {curOpen && <CurrencySheet state={state} setState={setState} onClose={() => setCurOpen(false)} />}

        {lookOpen && (
          <Sheet title="Замина" onClose={() => setLookOpen(false)}>
            <h4 className="look-h">Намуди барнома</h4>
            <div className="look-modes">
              {MODES.map(([id, name, ic]) => (
                <button key={id} className={id === mode ? 'look-mode on' : 'look-mode'} onClick={() => pickLook(id, accent)} aria-pressed={id === mode}>
                  <span>{ic}</span><b>{name}</b>
                </button>
              ))}
            </div>
            <h4 className="look-h">Ранги асосӣ</h4>
            <div className="look-accents">
              {(Object.keys(ACCENTS) as Accent[]).map(a => (
                <button key={a} className={a === accent ? 'look-ac on' : 'look-ac'} onClick={() => pickLook(mode, a)} aria-pressed={a === accent} aria-label={ACCENTS[a].name}>
                  <i style={{ background: ACCENTS[a].c ? ACCENTS[a].c![0] : '#1d8a63' }} />
                  <small>{ACCENTS[a].name}</small>
                </button>
              ))}
            </div>
            <label className="fb-switch look-haptic">
              <span className="grow"><b>Ларзиш ҳангоми амалҳо</b><small>Ларзиши нарм ҳангоми сабт, пардохт ва табрик (Android)</small></span>
              <input type="checkbox" checked={haptic} onChange={e => { setHaptic(e.target.checked); setHapticOn(e.target.checked); if (e.target.checked) success(); }} />
              <i aria-hidden />
            </label>
            <div className="look-preview"><button className="btn" type="button">{ACCENTS[accent].name}</button></div>
          </Sheet>
        )}

        {langOpen && (
          <Sheet title="Интихоби забон" onClose={() => setLangOpen(false)}>
            <div className="cells">
              {LANGS.map(l => (
                <button key={l.id} className="cell tap" onClick={() => void chooseLang(l.id)}>
                  <div className="grow"><b>{l.name}</b></div>
                  {l.id === lang && <span className="lang-on">✓</span>}
                </button>
              ))}
            </div>
            <p className="note">Забон ба аккаунт сабт мешавад: бот низ бо ҳамин забон менависад.</p>
          </Sheet>
        )}
      </>
    );
  }

  return <FreeAccounts state={state} setState={setState} onToast={onToast} />;
}
