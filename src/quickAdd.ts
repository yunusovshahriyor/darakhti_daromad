/**
 * Сабти зуд аз матн ё овоз (барои Telegram-бот): «такси 21» → хароҷот, «музд 3000» → даромад.
 * Функсияҳои тоза: бот ҳолатро аз Firestore мехонад, аз ин ҷо пешнамоиш ва ҳолати навро мегирад.
 */
import { orderedCategories, orderedSources } from './categories';
import { poolOf } from './dreams';
import { ACCOUNTS, ACCOUNT_ORDER, allocateIncome, emptyAlloc, hasShares, hiddenAccounts, mainAccountOf, uid } from './model';
import { smartCategory } from './suggest';
import type { AccountId, Expense, Income, State, Transfer } from './types';
import { parseMulti, parseVoice } from './voiceParse';
import type { VoiceResult } from './voiceParse';

export interface Draft {
  kind: 'expense' | 'income';
  amount: number;
  note: string;
  date: string;
  category: string | null;
  account: AccountId;
  source: string;
  /** Даромад бе тақсим, танҳо ба як ҳисоб. */
  direct: boolean;
}

export type DraftResult = { draft: Draft } | { error: 'amount' | 'debt' };

/** Ҳисобҳои намоён (на пинҳоншуда) барои интихоб. */
export const visibleAccounts = (state: State): AccountId[] => {
  const hidden = hiddenAccounts(state);
  return ACCOUNT_ORDER.filter(id => !hidden.includes(id));
};

/** Ҳисоби пешфарзи хароҷот: ҳамон ки охирин хароҷоти оддӣ аз он шуд, вагарна «Хароҷоти зиндагӣ»/аввалин ҳисоб. */
export const defaultAccount = (state: State): AccountId => {
  const vis = visibleAccounts(state);
  const last = state.expenses
    .filter(e => e.debtId === undefined && e.dreamId === undefined && e.loanId === undefined && vis.includes(e.account))
    .reduce<Expense | null>((best, e) => (!best || e.id > best.id ? e : best), null);
  if (last) return last.account;
  if (vis.includes('living')) return 'living';
  return vis[0] ?? ACCOUNT_ORDER[0] ?? 'cash';
};

/** Бе фоизи худкор: даромад ба ҳамон ҳисобе меравад, ки охирин бор гирифта буд. */
const lastIncomeAccount = (state: State): AccountId => {
  const last = state.incomes.find(i => !i.kind && Object.keys(i.alloc).some(k => (i.alloc[k] ?? 0) > 0));
  const prev = last ? Object.keys(last.alloc).find(k => (last.alloc[k] ?? 0) > 0) : undefined;
  return prev && ACCOUNT_ORDER.includes(prev) ? prev : mainAccountOf(state);
};

function draftOf(state: State, r: VoiceResult, today: string): DraftResult {
  if (r.kind === 'debt') return { error: 'debt' };
  if (!r.amount || r.amount <= 0) return { error: 'amount' };
  const note = r.note;
  const low = note.toLowerCase();
  const sources = orderedSources(state.incomeSources ?? [], state.incomes).map(s => s.name);
  const source = sources.find(s => s !== 'Дигар' && low.includes(s.toLowerCase())) ?? 'Музд';
  const income = r.kind === 'income';
  return {
    draft: {
      kind: r.kind, amount: r.amount, note, date: r.date ?? today,
      category: income ? null : (smartCategory(state, note) ?? null),
      account: income ? (hasShares(state) ? mainAccountOf(state) : lastIncomeAccount(state)) : defaultAccount(state),
      source, direct: false,
    },
  };
}

const SIGN = /^\s*([+＋]|[-−–])\s*/;

/** Як амалиёт аз матн («такси 21», «+500 ҷоиза», «-20 нон»). */
export function draftFrom(state: State, text: string, today: string): DraftResult {
  const sign = SIGN.exec(text);
  const r = parseVoice(sign ? text.slice(sign[0].length) : text, new Date(`${today}T12:00:00`));
  if (sign && r.kind !== 'debt') r.kind = /[+＋]/.test(sign[1]) ? 'income' : 'expense';
  return draftOf(state, r, today);
}

export type DraftsResult = { drafts: Draft[] } | { error: 'amount' | 'debt' };

/** Як ё якчанд амалиёт аз як гап («нон 15, такси 21»). Агар ягон қисм фаҳмида нашуд, он партофта мешавад. */
export function draftsFrom(state: State, text: string, today: string): DraftsResult {
  const sign = SIGN.exec(text);
  const rs = parseMulti(sign ? text.slice(sign[0].length) : text, new Date(`${today}T12:00:00`));
  if (sign && rs[0] && rs[0].kind !== 'debt') rs[0].kind = /[+＋]/.test(sign[1]) ? 'income' : 'expense';
  const ds: Draft[] = [];
  let err: 'amount' | 'debt' = 'amount';
  for (const r of rs) {
    const d = draftOf(state, r, today);
    if ('draft' in d) ds.push(d.draft); else err = d.error;
  }
  return ds.length ? { drafts: ds } : { error: err };
}

export const categoryNames = (state: State) => orderedCategories(state.categories ?? [], state.expenses).map(c => c.name);

export interface Applied { state: State; id: number }

/** Ҳолати нав бо сабти ҷорӣ; `id` барои бекор кардан. */
export function applyDraft(s: State, d: Draft): Applied {
  const id = uid();
  if (d.kind === 'expense') {
    const expense: Expense = {
      id, account: d.account, title: d.note.trim() || d.category || ACCOUNTS[d.account]?.name || '', amount: d.amount, date: d.date,
      ...(d.category ? { category: d.category } : {}),
    };
    return { id, state: { ...s, expenses: [...s.expenses, expense].sort((a, b) => b.date.localeCompare(a.date)) } };
  }
  const one = d.direct || !hasShares(s);
  const note = d.note.trim();
  const income: Income = {
    id, title: note ? `${d.source} · ${note}` : d.source, source: d.source, amount: d.amount, date: d.date,
    alloc: one ? { ...emptyAlloc(), [d.account]: d.amount } : allocateIncome(s, d.amount),
  };
  // Ҳиссаи худкор ба орзуҳо: id-и интиқол = id-и даромад + k (барои бекор кардан)
  let k = 0;
  const shares: Transfer[] = s.dreams
    .filter(x => !x.boughtAt && x.incomeShare && x.incomeShare.percent > 0)
    .map(x => ({ id: id + ++k, from: x.incomeShare!.from, to: poolOf(x), date: d.date, amount: Math.round(d.amount * x.incomeShare!.percent) / 100 }))
    .filter(t => t.amount > 0 && t.from !== t.to);
  return {
    id,
    state: {
      ...s,
      incomes: [...s.incomes, income].sort((a, b) => b.date.localeCompare(a.date)),
      transfers: shares.length ? [...shares, ...s.transfers] : s.transfers,
    },
  };
}

/** Якчанд сабт пай дар пай; `ids` барои бекор кардан. */
export function applyDrafts(s: State, ds: Draft[]): { state: State; items: { kind: Draft['kind']; id: number }[] } {
  let st = s;
  const items: { kind: Draft['kind']; id: number }[] = [];
  for (const d of ds) { const a = applyDraft(st, d); st = a.state; items.push({ kind: d.kind, id: a.id }); }
  return { state: st, items };
}

/** Бекор кардани сабти бот: хароҷот/даромад ва интиқолҳои ҳиссаи ҳамон даромад. */
export function undoApplied(s: State, kind: Draft['kind'], id: number): State {
  if (kind === 'expense') return { ...s, expenses: s.expenses.filter(e => e.id !== id) };
  return {
    ...s,
    incomes: s.incomes.filter(i => i.id !== id),
    transfers: s.transfers.filter(t => !(t.id > id && t.id <= id + 50)),
  };
}
