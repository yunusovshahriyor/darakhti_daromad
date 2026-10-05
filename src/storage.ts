import { DEFAULT_SETTINGS, allocate } from './model';
import type { Income, State } from './types';

const KEY = 'darakhti:v2';
const OLD_KEY = 'incomes';

export const emptyState = (): State => ({
  settings: { ...DEFAULT_SETTINGS },
  incomes: [],
  expenses: [],
  debts: [],
  dreams: [],
  transfers: [],
  goals: {},
});

export function loadState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<State>;
      return { ...emptyState(), ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } };
    }
    // Гузариш аз версияи кӯҳна (рӯйхати оддии даромад)
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '[]') as Omit<Income, 'alloc'>[];
    const state = emptyState();
    state.incomes = old.map(i => ({ ...i, alloc: allocate(i.amount, state.settings, false) }));
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
