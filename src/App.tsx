import { ReactNode, useEffect, useState } from 'react';
import { BackIcon, ExpenseIcon, HomeIcon, IncomeIcon, MoreIcon, StarIcon } from './components/Icons';
import { useHistoryLayer } from './components/useHistoryLayer';
import { loadState, saveState } from './storage';
import Dashboard from './views/Dashboard';
import Debts from './views/Debts';
import Dreams from './views/Dreams';
import Expenses from './views/Expenses';
import Incomes from './views/Incomes';
import More, { Sub } from './views/More';
import SettingsView from './views/SettingsView';

type Tab = 'home' | 'income' | 'expense' | 'dreams' | 'more';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Асосӣ', icon: <HomeIcon /> },
  { id: 'income', label: 'Даромад', icon: <IncomeIcon /> },
  { id: 'expense', label: 'Хароҷот', icon: <ExpenseIcon /> },
  { id: 'dreams', label: 'Орзуҳо', icon: <StarIcon /> },
  { id: 'more', label: 'Бештар', icon: <MoreIcon /> },
];

const SUB_TITLES: Record<Sub, string> = { debts: 'Қарзҳо', settings: 'Танзимот' };

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState<Tab>('home');
  const [sub, setSub] = useState<Sub | null>(null);
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

  const title = sub ? SUB_TITLES[sub] : TABS.find(t => t.id === tab)!.label;
  const props = { state, setState };

  return (
    <div className="app">
      <header className="appbar">
        {sub && (
          <button className="icon-btn" onClick={() => setSub(null)} aria-label="Бозгашт"><BackIcon /></button>
        )}
        <h1>{title}</h1>
      </header>

      <main className="screen" key={sub ?? tab}>
        {!sub && tab === 'home' && <Dashboard {...props} />}
        {!sub && tab === 'income' && <Incomes {...props} />}
        {!sub && tab === 'expense' && <Expenses {...props} />}
        {!sub && tab === 'dreams' && <Dreams {...props} />}
        {!sub && tab === 'more' && (
          <More {...props} open={setSub} standalone={standalone} ios={ios}
            canInstall={installEvent !== null}
            install={() => installEvent?.prompt().then(() => setInstallEvent(null))} />
        )}
        {sub === 'debts' && <Debts {...props} />}
        {sub === 'settings' && <SettingsView {...props} />}
      </main>

      <nav className="tabbar">
        {TABS.map(t => (
          <button key={t.id} className={t.id === tab ? 'tab active' : 'tab'} onClick={() => go(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
