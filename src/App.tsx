import { useEffect, useState } from 'react';
import { hasDebt } from './model';
import { loadState, saveState } from './storage';
import Dashboard from './views/Dashboard';
import Incomes from './views/Incomes';
import Expenses from './views/Expenses';
import Dreams from './views/Dreams';
import Debts from './views/Debts';
import SettingsView from './views/SettingsView';

const TABS = [
  { id: 'home', label: '🏠 Асосӣ' },
  { id: 'income', label: '💰 Даромад' },
  { id: 'expense', label: '🧾 Хароҷот' },
  { id: 'dreams', label: '✨ Орзуҳо' },
  { id: 'debts', label: '💳 Қарзҳо' },
  { id: 'settings', label: '⚙️ Танзимот' },
] as const;

type Tab = (typeof TABS)[number]['id'];

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState<Tab>('home');

  useEffect(() => saveState(state), [state]);

  const props = { state, setState };

  return (
    <>
      <header className="hero">
        <h1>💰 Рӯйхати даромад</h1>
        <p>Даромадро дуруст тақсим кунед, хароҷотро идора кунед</p>
      </header>

      <main className="container">
        <nav className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={t.id === tab ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {hasDebt(state.debts) && (
          <div className="alert">
            💳 Қарз ҳаст: 10%-и «Вақтхушӣ» ба пардохти қарз равон мешавад.
          </div>
        )}

        {tab === 'home' && <Dashboard {...props} />}
        {tab === 'income' && <Incomes {...props} />}
        {tab === 'expense' && <Expenses {...props} />}
        {tab === 'dreams' && <Dreams {...props} />}
        {tab === 'debts' && <Debts {...props} />}
        {tab === 'settings' && <SettingsView {...props} />}
      </main>
    </>
  );
}
