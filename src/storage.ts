import { DEFAULT_ACCOUNTS, DEFAULT_SETTINGS, addAccountNode, allocate, defaultTree, findAccountNode, syncCatalog } from './model';
import type { Income, State } from './types';

const KEY = 'darakhti:v2';
const OLD_KEY = 'incomes';

export const emptyState = (): State => ({
  accounts: DEFAULT_ACCOUNTS.map(a => ({ ...a })),
  tree: defaultTree(),
  incomes: [],
  expenses: [],
  debts: [],
  dreams: [],
  transfers: [],
  goals: {},
});

export function loadState(): State {
  const state = readState();
  syncCatalog(state);
  return state;
}

function readState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<State> & { settings?: typeof DEFAULT_SETTINGS };
      const base = emptyState();
      // Версияи кӯҳна: ҳисобҳо ва дарахт бо фоизҳои сабтшуда сохта мешаванд
      let tree = s.tree ?? defaultTree({ ...DEFAULT_SETTINGS, ...(s.settings ?? {}) });
      const accounts = s.accounts ?? base.accounts;
      // «Пардохти қарз» ҳиссаи худро (10%) дар дарахт дорад
      if (!findAccountNode(tree, 'debt') && accounts.some(a => a.id === 'debt' && !a.archived)) {
        tree = addAccountNode(tree, 'root', 'debt', 10);
      }
      const { settings: _legacy, ...rest } = s;
      return { ...base, ...rest, accounts, tree };
    }
    // Гузариш аз версияи кӯҳна (рӯйхати оддии даромад)
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '[]') as Omit<Income, 'alloc'>[];
    const state = emptyState();
    syncCatalog(state);
    state.incomes = old.map(i => ({ ...i, alloc: allocate(i.amount, state.tree, false) }));
    return state;
  } catch {
    return emptyState();
  }
}

export function saveState(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
