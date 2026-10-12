import { useEffect, useState } from 'react';
import { useConfirm } from '../components/ConfirmSheet';
import { AddAccountSheet, EditNodeSheet } from '../components/AccountEditor';
import FreeAccounts from '../components/FreeAccounts';
import { ChevronIcon, PencilIcon, PlusIcon } from '../components/Icons';
import { useHistoryLayer } from '../components/useHistoryLayer';
import Sheet from '../components/Sheet';
import { LANGS, currentLang, setLang } from '../i18n';
import type { Lang } from '../i18n';
import { hasUnsynced, saveLangToAccount, signOutAndWipe, syncNow, useSync } from '../sync';
import { ACCOUNTS, CARD_COLORS, effectiveShareNode, findAccountNode, fmt, hasDebt, isFree, isRemainderNode, toFreeMode, toSystemMode } from '../model';
import { emptyState } from '../storage';
import type { DistNode } from '../types';
import type { Props } from './props';

const CLOSED_KEY = 'darakhti:setclosed';

const readClosed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(CLOSED_KEY) ?? '[]') as string[]; } catch { return []; }
};

export default function SettingsView({ state, setState, onToast, onGuide }: Props & { onToast: (m: string) => void; onGuide: () => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [closed, setClosed] = useState(readClosed);
  const [page, setPage] = useState<'menu' | 'accounts'>('menu');
  const sync = useSync();
  const [langOpen, setLangOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const free = isFree(state);
  const switchMode = () => {
    setState(s => (isFree(s) ? toSystemMode(s) : toFreeMode(s)));
    setModeOpen(false);
    setPage('menu');
    onToast(free ? 'Системаи Саидмурод Давлатов фаъол шуд ✓' : 'Ҳолати «ба тарзи худам» фаъол шуд ✓');
  };
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
        <h3 className="group-title"><span>Танзимот</span></h3>
        <div className="cells">
          <button className="cell tap link" onClick={() => setLangOpen(true)}>
            <div className="ic">🌐</div>
            <div className="grow"><b>Забон</b><small>{LANGS.find(l => l.id === lang)?.name}</small></div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={onGuide}>
            <div className="ic">📖</div>
            <div className="grow"><b>Системаҳои кор</b><small>Шарҳ ва гузариш аз як система ба дигар</small></div>
            <ChevronIcon />
          </button>
          <button className="cell tap link" onClick={() => setModeOpen(true)}>
            <div className="ic">🌳</div>
            <div className="grow"><b>Системаи Саидмурод Давлатов</b><small>{free ? 'Хомӯш: ҳисобҳои худам, бе фоиз' : 'Фаъол: тақсими даромад аз рӯи фоиз'}</small></div>
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
          {signed && (
            <button className="cell tap link" onClick={logout}>
              <div className="ic">🚪</div>
              <div className="grow"><b>Баромад аз аккаунт</b><small>{sync.email}</small></div>
              <ChevronIcon />
            </button>
          )}
        </div>

        <button className="btn danger" onClick={wipe}>Нест кардани ҳамаи маълумот</button>

        {confirmDialog}

        {modeOpen && (
          <Sheet title="Системаи Саидмурод Давлатов" onClose={() => setModeOpen(false)}>
            <p className="confirm-text">
              {free
                ? 'Системаро фаъол мекунед: даромади нав аз рӯи фоизҳо ба ҳисобҳо тақсим мешавад. Ҳисобҳое, ки худатон сохтед, бо 0% мемонанд ва фоизро дар «Ҳисобҳо ва фоизҳо» муайян мекунед.'
                : 'Системаро хомӯш мекунед: фоизҳо ва тақсими худкори даромад кор намекунанд. Даромадро ба ҳисоби дилхоҳ медиҳед ва ҳисобҳои худатонро месозед. Ҳамаи маълумот ва фоизҳои шумо нигоҳ дошта мешаванд ва бо фаъол кардани система дубора кор мекунанд.'}
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn secondary" onClick={() => setModeOpen(false)}>Бекор кардан</button>
              <button type="button" className="btn big" onClick={switchMode}>{free ? 'Фаъол кардан' : 'Хомӯш кардан'}</button>
            </div>
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
        <button className="set-back tap" onClick={() => setPage('menu')}>
          <span className="chev-back"><ChevronIcon /></span> Танзимот
        </button>
        <FreeAccounts state={state} setState={setState} onToast={onToast} />
      </>
    );
  }

  return (
    <>
      <button className="set-back tap" onClick={() => setPage('menu')}>
        <span className="chev-back"><ChevronIcon /></span> Танзимот
      </button>
      <h3 className="group-title"><span>Ҳисобҳо ва фоизҳо</span></h3>
      <div className="cells tree">
        {row(root, -1)}
      </div>
      <button className="btn" onClick={() => setAdding(true)}><PlusIcon /> Ҳисоби нав</button>

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
