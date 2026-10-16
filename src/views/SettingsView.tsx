import { useEffect, useState } from 'react';
import { useConfirm } from '../components/ConfirmSheet';
import { AddAccountSheet, EditNodeSheet } from '../components/AccountEditor';
import CurrencySheet from '../components/CurrencySheet';
import LockSheet from '../components/LockSheet';
import RecurringSheet from '../components/RecurringSheet';
import { isLockOn } from '../lock';
import TreeDiagram from '../components/TreeDiagram';
import FreeAccounts from '../components/FreeAccounts';
import { defOf } from '../currency';
import { ChevronIcon, PencilIcon, PlusIcon } from '../components/Icons';
import { useHistoryLayer } from '../components/useHistoryLayer';
import Sheet from '../components/Sheet';
import { ACCENTS, getAccent, getTheme, setTheme } from '../theme';
import { hapticOn, setHapticOn, success } from '../haptic';
import type { Accent, ThemeMode } from '../theme';
import { LANGS, currentLang, setLang } from '../i18n';
import type { Lang } from '../i18n';
import { hasUnsynced, saveLangToAccount, signOutAndWipe, syncNow, useSync } from '../sync';
import { ACCOUNTS, CARD_COLORS, effectiveShareNode, findAccountNode, fmt, hasDebt, isFree, isRemainderNode } from '../model';
import { emptyState } from '../storage';
import type { DistNode } from '../types';
import type { Props } from './props';

const CLOSED_KEY = 'darakhti:setclosed';

const readClosed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]') as string[]; } catch { return []; }
};

export type SettingsPage = 'menu' | 'accounts';

export default function SettingsView({ state, setState, onToast, onGuide, page, setPage }: Props & {
  onToast: (m: string) => void;
  onGuide: () => void;
  /** Зерсаҳифа дар App нигоҳ дошта мешавад: сарлавҳа ва тугмаи «бозгашт» дар ActionBar. */
  page: SettingsPage;
  setPage: (p: SettingsPage) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [closed, setClosed] = useState(readClosed);
  const [treeView, setTreeView] = useState(() => { try { return localStorage.getItem('darakhti:acctview') === 'tree'; } catch { return false; } });
  const pickView = (t: boolean) => { setTreeView(t); try { localStorage.setItem('darakhti:acctview', t ? 'tree' : 'list'); } catch { /* ignore */ } };
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
  const free = isFree(state);
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
  const root = state.tree;
  const debt = hasDebt(state.debts);

  useEffect(() => {
    try { localStorage.setItem(CLOSED_KEY, JSON.stringify(closed)); } catch { /* ignore */ }
  }, [closed]);

  const toggle = (id: string) =>
    setClosed(c => (c.includes(id) ? c.filter(k => k !== id) : [...c, id]));

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

  const n2 = (v: number) => fmt(Math.round(v * 100) / 100);

  const row = (node: DistNode, depth: number): React.ReactNode => {
    const remainder = isRemainderNode(root, node.id);
    const share = effectiveShareNode(root, node.id);
    if (node.type === 'account') {
      const def = state.accounts.find(a => a.id === node.accountId);
      if (!def || def.archived) return null;
      const isDebt = node.accountId === 'debt';
      const off = debt ? node.accountId === 'fun' : isDebt;
      const funNode = state.tree.type === 'group' ? findAccountNode(root, 'fun')?.node : undefined;
      const sub = off && !isDebt ? 'Нофаъол: аввал қарзҳоро пардохт кунед'
        : isDebt ? (debt ? `${n2(share + (funNode ? effectiveShareNode(root, funNode.id) : 0))}% аз ҳар даромад (бо «Вақтхушӣ»)` : 'Нофаъол: қарз нест, бо қарзи нав фаъол мешавад')
        : `${n2(share)}% аз ҳар даромад`;
      return (
        <button key={node.id} className={off ? 'cell tree-row off' : 'cell tap tree-row'}
          style={{ paddingLeft: 14 + depth * 16 }} disabled={off}
          onClick={() => setEditId(node.id)}>
          <span className="tr-ic" style={{ background: CARD_COLORS[node.accountId] }}>{ACCOUNTS[node.accountId]?.icon}</span>
          <span className="grow">
            <b>{def.name}</b>
            <small>{sub}</small>
          </span>
          <span className="tr-pct">{n2(node.percent)}%{remainder && <em>боқимонда</em>}</span>
          {!off && <ChevronIcon />}
        </button>
      );
    }
    const isRoot = node.id === 'root';
    const open = isRoot || !closed.includes(node.id);
    const rows = open ? node.children.map(c => row(c, depth + 1)) : null;
    return (
      <div key={node.id}>
        {!isRoot && (
          <div className="cell tree-row group" style={{ paddingLeft: 14 + depth * 16 }}>
            <button className="tr-main tap" onClick={() => toggle(node.id)} aria-expanded={open}>
              <span className={open ? 'chev open' : 'chev'}><ChevronIcon /></span>
              <span className="tr-ic soft">{node.icon}</span>
              <span className="grow">
                <b>{node.title}</b>
                <small>{n2(share)}% аз ҳар даромад</small>
              </span>
              <span className="tr-pct">{n2(node.percent)}%{remainder && <em>боқимонда</em>}</span>
            </button>
            <button className="icon-btn tr-edit" onClick={() => setEditId(node.id)} aria-label="Таҳрир">
              <PencilIcon />
            </button>
          </div>
        )}
        {rows}
      </div>
    );
  };

  const accountCount = state.accounts.filter(a => !a.archived).length;

  if (page === 'menu') {
    return (
      <>
        <div className="cells">
          <button className="cell tap link" onClick={onGuide}>
            <div className="ic">🌳</div>
            <div className="grow"><b>Системаи кор</b><small>{free ? 'Ба тарзи худам' : 'Системаи Саидмурод Давлатов'}</small></div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={() => setPage('accounts')}>
            <div className="ic">🧩</div>
            <div className="grow">
              <b>{free ? 'Ҳисобҳо' : 'Ҳисобҳо ва фоизҳо'}</b>
              <small>{free ? `${state.accounts.filter(a => !a.archived && !['debt', 'fun', 'bigDream', 'smallDream'].includes(a.id)).length} ҳисоб` : `${accountCount} ҳисоб · тақсими даромад`}</small>
            </div>
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

  if (free) {
    return (
      <>
        <FreeAccounts state={state} setState={setState} onToast={onToast} />
      </>
    );
  }

  return (
    <>
      <div className="seg-tabs acct-view" role="tablist">
        <button role="tab" aria-selected={!treeView} className={!treeView ? 'on' : ''} onClick={() => pickView(false)}>Рӯйхат</button>
        <button role="tab" aria-selected={treeView} className={treeView ? 'on' : ''} onClick={() => pickView(true)}>Дарахт</button>
      </div>
      {treeView && <p className="note td-hint">Дарахтро ба ҳар тараф кашед. Қуттиро пахш кунед — таҳрир мешавад.</p>}
      {treeView ? (
        <TreeDiagram root={root} accounts={state.accounts} onPick={n => setEditId(n.id)}
          isOff={id => (debt ? id === 'fun' : id === 'debt')} />
      ) : (
        <div className="cells tree">
          {row(root, -1)}
        </div>
      )}
      <button className="btn btn-add" onClick={() => setAdding(true)}><i><PlusIcon /></i><span>Ҳисоби нав</span></button>

      {confirmDialog}

      {editId && (
        <EditNodeSheet state={state} setState={setState} nodeId={editId}
          onClose={() => setEditId(null)} onToast={onToast} />
      )}
      {adding && (
        <AddAccountSheet state={state} setState={setState} onClose={() => setAdding(false)} onToast={onToast} />
      )}
    </>
  );
}
