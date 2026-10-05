import { ReactNode, useEffect, useState } from 'react';
import AddSheet from './components/AddSheet';
import {
  BackIcon, ExpenseIcon, GridIcon, IncomeIcon, ListIcon, MoreIcon, PlusIcon,
} from './components/Icons';
import { useHistoryLayer } from './components/useHistoryLayer';
import { loadState, saveState } from './storage';
import Dashboard from './views/Dashboard';
import Debts from './views/Debts';
import Dreams from './views/Dreams';
import Expenses from './views/Expenses';
import Incomes from './views/Incomes';
import More, { Sub } from './views/More';
import type { Tab } from './views/props';
import SettingsView from './views/SettingsView';

const LEFT: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Асосӣ', icon: <GridIcon /> },
  { id: 'income', label: 'Даромад', icon: <IncomeIcon /> },
];
const RIGHT: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'expense', label: 'Хароҷот', icon: <ListIcon /> },
  { id: 'more', label: 'Бештар', icon: <MoreIcon /> },
];

const TITLES: Record<Tab, string> = { home: 'Асосӣ', income: 'Даромад', expense: 'Хароҷот', more: 'Бештар' };
const SUB_TITLES: Record<Sub, string> = { dreams: 'Орзуҳо', debts: 'Қарзҳо', settings: 'Танзимот' };

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState<Tab>('home');
  const [sub, setSub] = useState<Sub | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => saveState(state), [state]);

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
    const t = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  useHistoryLayer(sub !== null, () => setSub(null));

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const go = (t: Tab) => {
    if (t !== tab) navigator.vibrate?.(8);
    setSub(null);
    setTab(t);
  };

  const home = tab === 'home' && !sub;
  const title = sub ? SUB_TITLES[sub] : TITLES[tab];
  const props = { state, setState };

  const tabButton = (t: { id: Tab; label: string; icon: ReactNode }) => (
    <button key={t.id} className={t.id === tab ? 'tab active' : 'tab'} onClick={() => go(t.id)}>
      {t.icon}
      <span>{t.label}</span>
    </button>
  );

  return (
    <div className="app">
      {!home && (
        <header className="appbar">
          {sub && (
            <button className="icon-btn" onClick={() => setSub(null)} aria-label="Бозгашт"><BackIcon /></button>
          )}
          <h1>{title}</h1>
        </header>
      )}

      <main className={home ? 'screen home' : 'screen'} key={sub ?? tab}>
        {home && <Dashboard {...props} onNavigate={go} onProfile={() => setSub('settings')} />}
        {!sub && tab === 'income' && <Incomes {...props} />}
        {!sub && tab === 'expense' && <Expenses {...props} />}
        {!sub && tab === 'more' && (
          <More {...props} open={setSub} standalone={standalone} ios={ios}
            canInstall={installEvent !== null}
            install={() => installEvent?.prompt().then(() => setInstallEvent(null))} />
        )}
        {sub === 'dreams' && <Dreams {...props} />}
        {sub === 'debts' && <Debts {...props} />}
        {sub === 'settings' && <SettingsView {...props} />}
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
