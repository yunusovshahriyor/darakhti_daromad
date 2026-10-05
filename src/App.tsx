import { ReactNode, useEffect, useRef, useState } from 'react';
import AddSheet from './components/AddSheet';
import {
  BackIcon, GridIcon, ListIcon, MoreIcon, PlusIcon, WalletIcon,
} from './components/Icons';
import { useHistoryLayer } from './components/useHistoryLayer';
import { ACCOUNTS, ACCOUNT_ORDER, balancesOf } from './model';
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

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

const readHidden = () => {
  try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
};

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState<Tab>('home');
  const [sub, setSub] = useState<Sub | null>(null);
  const [acct, setAcct] = useState<AccountId | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [hidden, setHidden] = useState(readHidden);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const prevBal = useRef<Alloc | null>(null);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    try { localStorage.setItem(HIDE_KEY, hidden ? '1' : '0'); } catch { /* ignore */ }
  }, [hidden]);

  // Огоҳӣ ҳангоми расидан ба мақсад
  useEffect(() => {
    const bal = balancesOf(state);
    const prev = prevBal.current;
    prevBal.current = bal;
    if (!prev) return;
    for (const id of ACCOUNT_ORDER) {
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

  useHistoryLayer(sub !== null, () => setSub(null));
  useHistoryLayer(acct !== null, () => setAcct(null));

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const go = (t: Tab, f?: HistoryFilter) => {
    if (t !== tab) navigator.vibrate?.(8);
    setSub(null);
    setAcct(null);
    setTab(t);
    if (t === 'history') setFilter(f ?? 'all');
  };

  const openAccount = (id: AccountId) => {
    setSub(null);
    setAcct(id);
  };

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
      return <AccountDetail {...props} {...privacy} id={acct} onToast={setToast} />;
    }
    if (sub === 'dreams') return <Dreams {...props} />;
    if (sub === 'debts') return <Debts {...props} />;
    if (sub === 'settings') return <SettingsView {...props} />;
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
        </header>
      )}

      <main className={home ? 'screen home' : 'screen'} key={`${acct ?? ''}${sub ?? ''}${tab}`}>
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

      {adding && (
        <AddSheet {...props} onClose={() => setAdding(false)} onDone={setToast} />
      )}
    </div>
  );
}
