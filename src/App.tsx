import { ReactNode, useEffect, useRef, useState } from 'react';
import AddSheet from './components/AddSheet';
import InfoSheet from './components/InfoSheet';
import {
  BackIcon, GridIcon, InfoIcon, ListIcon, MoreIcon, PlusIcon, RefreshIcon, WalletIcon,
} from './components/Icons';
import { useHistoryLayer } from './components/useHistoryLayer';
import { ACCOUNTS, ACCOUNT_ORDER, ALL_IDS, balancesOf, syncCatalog } from './model';
import { loadState, saveState } from './storage';
import type { Alloc, AccountId } from './types';
import AccountDetail from './views/AccountDetail';
import Accounts from './views/Accounts';
import Dashboard from './views/Dashboard';
import Debts from './views/Debts';
import Dreams from './views/Dreams';
import History, { HistoryFilter } from './views/History';
import More, { Sub } from './views/More';
import type { Tab } from './views/props';
import SettingsView from './views/SettingsView';

const LEFT: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Асосӣ', icon: <GridIcon /> },
  { id: 'accounts', label: 'Ҳисобҳо', icon: <WalletIcon /> },
];
const RIGHT: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'history', label: 'Таърих', icon: <ListIcon /> },
  { id: 'more', label: 'Бештар', icon: <MoreIcon /> },
];

const TITLES: Record<Tab, string> = { home: 'Асосӣ', accounts: 'Ҳисобҳо', history: 'Таърих', more: 'Бештар' };
const SUB_TITLES: Record<Sub, string> = { dreams: 'Орзуҳо', debts: 'Қарзҳо', settings: 'Танзимот' };
const HIDE_KEY = 'darakhti:hide';
const NAV_KEY = 'darakhti:nav';
const FILTER_KEY = 'darakhti:hfilter';

const TAB_IDS: Tab[] = ['home', 'accounts', 'history', 'more'];
const SUB_IDS: Sub[] = ['dreams', 'debts', 'settings'];
const FILTER_IDS: HistoryFilter[] = ['all', 'income', 'expense', 'transfer'];

interface Nav {
  tab: Tab;
  sub: Sub | null;
  acct: AccountId | null;
  filter: HistoryFilter;
}

const readFilter = (): HistoryFilter => {
  try {
    const f = localStorage.getItem(FILTER_KEY) as HistoryFilter | null;
    if (f && FILTER_IDS.includes(f)) return f;
  } catch { /* ignore */ }
  return 'all';
};

/** Ҷойгиршавӣ (таб, саҳифа, ҳисоб) пас аз навсозии саҳифа аз нав барқарор мешавад. */
function readNav(): Nav {
  const nav: Nav = { tab: 'home', sub: null, acct: null, filter: 'all' };
  try {
    const raw = JSON.parse(sessionStorage.getItem(NAV_KEY) ?? 'null') as Partial<Nav> | null;
    if (raw) {
      if (raw.tab && TAB_IDS.includes(raw.tab)) nav.tab = raw.tab;
      if (raw.sub && SUB_IDS.includes(raw.sub)) nav.sub = raw.sub;
      if (raw.acct && ACCOUNT_ORDER.includes(raw.acct)) nav.acct = raw.acct;
      if (raw.filter && FILTER_IDS.includes(raw.filter)) nav.filter = raw.filter;
    }
  } catch { /* ignore */ }
  return nav;
}

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

const readHidden = () => {
  try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
};

export default function App() {
  const [state, setState] = useState(loadState);
  syncCatalog(state);
  const [nav0] = useState(readNav);
  const [tab, setTab] = useState<Tab>(nav0.tab);
  const [sub, setSub] = useState<Sub | null>(nav0.sub);
  const [acct, setAcct] = useState<AccountId | null>(nav0.acct);
  const [filter, setFilter] = useState<HistoryFilter>(readFilter);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const layerOnBoot = typeof history !== 'undefined' && history.state?.layer === true;
  const reuseSub = useRef(layerOnBoot && nav0.sub !== null);
  const reuseAcct = useRef(layerOnBoot && nav0.acct !== null);
  const [adding, setAdding] = useState(false);
  const [info, setInfo] = useState(false);
  const [toast, setToast] = useState('');
  const [hidden, setHidden] = useState(readHidden);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const prevBal = useRef<Alloc | null>(null);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    try { localStorage.setItem(FILTER_KEY, filter); } catch { /* ignore */ }
  }, [filter]);

  useEffect(() => {
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify({ tab, sub, acct, filter })); } catch { /* ignore */ }
  }, [tab, sub, acct, filter]);

  useEffect(() => {
    try { localStorage.setItem(HIDE_KEY, hidden ? '1' : '0'); } catch { /* ignore */ }
  }, [hidden]);

  // Огоҳӣ ҳангоми расидан ба мақсад
  useEffect(() => {
    const bal = balancesOf(state);
    const prev = prevBal.current;
    prevBal.current = bal;
    if (!prev) return;
    for (const id of ALL_IDS) {
      const goal = state.goals[id];
      if (goal && prev[id] < goal && bal[id] >= goal) {
        setToast(`🎉 «${ACCOUNTS[id].name}» ба мақсад расид!`);
        navigator.vibrate?.([30, 40, 30]);
        break;
      }
    }
  }, [state]);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useHistoryLayer(sub !== null, () => setSub(null), reuseSub);
  useHistoryLayer(acct !== null, () => setAcct(null), reuseAcct);

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const go = (t: Tab, f?: HistoryFilter) => {
    if (t !== tab) navigator.vibrate?.(8);
    setSub(null);
    setAcct(null);
    setTab(t);
    if (t === 'history' && f) setFilter(f);
  };

  const openAccount = (id: AccountId) => {
    setSub(null);
    setAcct(id);
  };

  // Навсозӣ бо свайп аз боло ба поён (дар ҳолати скролли боло)
  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    // Ҳаракатҳое, ки дар дохили варақа (sheet) сар мешаванд, ба навсозии саҳифа дахл надоранд
    const inSheet = (e.target as Element).closest('.backdrop') !== null;
    touch.current = !inSheet && e.currentTarget.scrollTop <= 0 && !refreshing
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
  };
  const onTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const t = touch.current;
    if (!t) return;
    const dy = e.touches[0].clientY - t.y;
    const dx = e.touches[0].clientX - t.x;
    if (dy > 0 && dy > Math.abs(dx) && e.currentTarget.scrollTop <= 0) setPull(Math.min(84, dy * 0.55));
    else if (dy <= 0) setPull(0);
  };
  const onTouchEnd = () => {
    if (!touch.current) return;
    touch.current = null;
    if (pull >= 52) {
      setRefreshing(true);
      setPull(56);
      navigator.vibrate?.(10);
      setTimeout(() => window.location.reload(), 450);
    } else {
      setPull(0);
    }
  };

  const infoKind = !acct && (sub === 'debts' || sub === 'dreams' || sub === 'settings') ? sub : null;
  const home = tab === 'home' && !sub && !acct;
  const title = acct ? ACCOUNTS[acct].name : sub ? SUB_TITLES[sub] : TITLES[tab];
  const props = { state, setState };
  const privacy = { hidden, onToggleHidden: () => setHidden(h => !h) };

  const tabButton = (t: { id: Tab; label: string; icon: ReactNode }) => (
    <button key={t.id} className={t.id === tab ? 'tab active' : 'tab'} onClick={() => go(t.id)}>
      {t.icon}
      <span>{t.label}</span>
    </button>
  );

  const content = () => {
    if (acct) {
      return <AccountDetail {...props} {...privacy} id={acct} onToast={setToast}
        onManage={page => { setAcct(null); setSub(page); }} />;
    }
    if (sub === 'dreams') return <Dreams {...props} />;
    if (sub === 'debts') return <Debts {...props} />;
    if (sub === 'settings') return <SettingsView {...props} onToast={setToast} />;
    if (tab === 'home') {
      return (
        <Dashboard {...props} {...privacy} onNavigate={go} onProfile={() => setSub('settings')}
          onOpenAccount={openAccount} />
      );
    }
    if (tab === 'accounts') return <Accounts {...props} {...privacy} onOpenAccount={openAccount} />;
    if (tab === 'history') return <History {...props} filter={filter} onFilter={setFilter} />;
    return (
      <More {...props} open={setSub} standalone={standalone} ios={ios}
        canInstall={installEvent !== null}
        install={() => installEvent?.prompt().then(() => setInstallEvent(null))} />
    );
  };

  return (
    <div className="app">
      {!home && (
        <header className="appbar">
          {(sub || acct) && (
            <button className="icon-btn" onClick={() => { setSub(null); setAcct(null); }} aria-label="Бозгашт">
              <BackIcon />
            </button>
          )}
          <h1>{title}</h1>
          {infoKind && (
            <button className="icon-btn info-btn" onClick={() => setInfo(true)} aria-label="Маълумот">
              <InfoIcon />
            </button>
          )}
        </header>
      )}

      <div className={refreshing ? 'ptr spin' : 'ptr'}
        style={{ transform: `translate(-50%, ${pull - 48}px)`, opacity: Math.min(1, pull / 40) }}>
        <RefreshIcon />
      </div>

      <main className={home ? 'screen home' : 'screen'} key={`${acct ?? ''}${sub ?? ''}${tab}`}
        style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: touch.current ? 'none' : 'transform .2s' }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        {content()}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav className="tabbar">
        {LEFT.map(tabButton)}
        <button className="tab add" onClick={() => setAdding(true)} aria-label="Илова кардан">
          <span className="add-circle"><PlusIcon /></span>
          <span>Илова</span>
        </button>
        {RIGHT.map(tabButton)}
      </nav>

      {info && infoKind && <InfoSheet kind={infoKind} onClose={() => setInfo(false)} />}

      {adding && (
        <AddSheet {...props} onClose={() => setAdding(false)} onDone={setToast} />
      )}
    </div>
  );
}
