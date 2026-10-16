import type { Alloc, Debt, DebtPlan, Dream, State } from './types';

export interface CurrencyDef { code: string; label: string; name: [string, string, string] }

/** Асъорҳо: [тоҷикӣ, русӣ, англисӣ] ном. `label` — аломати кӯтоҳ дар барнома. */
export const CURRENCIES: CurrencyDef[] = [
  { code: 'TJS', label: 'смн', name: ['Сомонӣ', 'Сомони', 'Somoni'] },
  { code: 'RUB', label: '₽', name: ['Рубли русӣ', 'Российский рубль', 'Russian ruble'] },
  { code: 'USD', label: '$', name: ['Доллари ИМА', 'Доллар США', 'US dollar'] },
  { code: 'EUR', label: '€', name: ['Евро', 'Евро', 'Euro'] },
  { code: 'KZT', label: '₸', name: ['Тенгеи қазоқӣ', 'Казахстанский тенге', 'Kazakhstani tenge'] },
  { code: 'UZS', label: 'сўм', name: ['Сўми ӯзбекӣ', 'Узбекский сум', 'Uzbek som'] },
  { code: 'KGS', label: 'сом', name: ['Соми қирғизӣ', 'Киргизский сом', 'Kyrgyz som'] },
  { code: 'TRY', label: '₺', name: ['Лираи туркӣ', 'Турецкая лира', 'Turkish lira'] },
  { code: 'AED', label: 'AED', name: ['Дирҳами АМА', 'Дирхам ОАЭ', 'UAE dirham'] },
  { code: 'CNY', label: '¥', name: ['Юани чинӣ', 'Китайский юань', 'Chinese yuan'] },
  { code: 'KRW', label: '₩', name: ['Вони ҷанубӣ-кореягӣ', 'Южнокорейская вона', 'South Korean won'] },
  { code: 'GBP', label: '£', name: ['Фунт стерлинг', 'Фунт стерлингов', 'Pound sterling'] },
  { code: 'AFN', label: '؋', name: ['Афғонии афғонӣ', 'Афгани', 'Afghani'] },
];

export const MIRROR_KEY = 'darakhti:currency';
export const BASE = 'TJS';

export const defOf = (code: string): CurrencyDef => CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];

/** Асъори фаъол (аз нусхаи localStorage: то боршавии ҳолат дар translator истифода мешавад). */
export const activeCode = (): string => {
  try { const v = localStorage.getItem(MIRROR_KEY); return v && CURRENCIES.some(c => c.code === v) ? v : BASE; } catch { return BASE; }
};
export const setActiveCode = (code: string) => { try { localStorage.setItem(MIRROR_KEY, code); } catch { /* ignore */ } };

const UNIT_RE = /(?<![\p{L}])(смн|smn|сомонӣ|сомони|somoni)(?![\p{L}])/giu;
/** Дар матн «смн/сомонӣ» ва шаклҳои тарҷумашударо ба аломати асъори интихобшуда иваз мекунад. */
export const swapUnit = (text: string, code = activeCode()): string =>
  code === BASE ? text : text.replace(UNIT_RE, defOf(code).label);

// ---------- Қурб ----------
export interface Rate { rate: number; date: string; source: string }

const j = async (url: string): Promise<unknown> => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally { clearTimeout(t); }
};

/** Қурби имрӯза: 1 `from` = X `to`. Якчанд манбаъ пай дар пай санҷида мешавад. */
export async function fetchRate(from: string, to: string): Promise<Rate> {
  const errs: string[] = [];
  const tries: (() => Promise<Rate>)[] = [
    async () => {
      const d = await j(`https://open.er-api.com/v6/latest/${from}`) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
      const r = d.rates?.[to];
      if (d.result !== 'success' || !r) throw new Error('er-api');
      return { rate: r, date: d.time_last_update_utc ? new Date(d.time_last_update_utc).toLocaleDateString('sv-SE') : new Date().toLocaleDateString('sv-SE'), source: 'open.er-api.com' };
    },
    async () => {
      const d = await j(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from.toLowerCase()}.json`) as Record<string, unknown>;
      const r = (d[from.toLowerCase()] as Record<string, number> | undefined)?.[to.toLowerCase()];
      if (!r) throw new Error('jsdelivr');
      return { rate: r, date: String(d.date ?? new Date().toLocaleDateString('sv-SE')), source: 'currency-api' };
    },
    async () => {
      const d = await j(`https://latest.currency-api.pages.dev/v1/currencies/${from.toLowerCase()}.json`) as Record<string, unknown>;
      const r = (d[from.toLowerCase()] as Record<string, number> | undefined)?.[to.toLowerCase()];
      if (!r) throw new Error('pages');
      return { rate: r, date: String(d.date ?? new Date().toLocaleDateString('sv-SE')), source: 'currency-api' };
    },
  ];
  for (const t of tries) {
    try { const r = await t(); if (r.rate > 0 && isFinite(r.rate)) return r; } catch (e) { errs.push(e instanceof Error ? e.message : String(e)); }
  }
  throw new Error(errs.join(', ') || 'rate');
}

// ---------- Табдили маълумот ----------
const r2 = (v: number) => Math.round(v * 100) / 100;

function convAlloc(alloc: Alloc, amount: number, k: number, newAmount: number): Alloc {
  const out: Alloc = {};
  let sum = 0;
  let big = '';
  for (const [id, v] of Object.entries(alloc)) {
    out[id] = r2(v * k);
    sum += out[id];
    if (!big || Math.abs(v) > Math.abs(alloc[big] ?? 0)) big = id;
  }
  // Хатогии гирд кардан: ҷамъи тақсим бояд ба маблағи даромад баробар бошад
  const diff = r2(newAmount - sum);
  if (big && Math.abs(diff) > 0 && Math.abs(diff) < 0.5) out[big] = r2(out[big] + diff);
  void amount;
  return out;
}

const convPlan = (p: DebtPlan, k: number): DebtPlan => ({
  ...p,
  principal: r2(p.principal * k),
  ...(p.commission !== undefined ? { commission: r2(p.commission * k) } : {}),
  ...(p.payment !== undefined ? { payment: r2(p.payment * k) } : {}),
  ...(p.overrides ? { overrides: Object.fromEntries(Object.entries(p.overrides).map(([n, o]) => [n, { ...o, ...(o.payment !== undefined ? { payment: r2(o.payment * k) } : {}) }])) } : {}),
});

const convDebt = (d: Debt, k: number): Debt => ({ ...d, amount: r2(d.amount * k), paid: r2(d.paid * k), ...(d.plan ? { plan: convPlan(d.plan, k) } : {}), ...(d.fx ? { fx: { ...d.fx, rate: d.fx.rate * k } } : {}) });

const convDream = (d: Dream, k: number): Dream => ({
  ...d,
  target: r2(d.target * k),
  ...(d.paidPrice !== undefined ? { paidPrice: r2(d.paidPrice * k) } : {}),
  ...(d.autoSave ? { autoSave: { ...d.autoSave, amount: r2(d.autoSave.amount * k) } } : {}),
});

/** Ҳамаи маблағҳоро бо зарб ба `k` табдил медиҳад ва асъорро иваз мекунад. */
export function convertState(s: State, k: number, to: string): State {
  return {
    ...s,
    currency: to,
    incomes: s.incomes.map(i => {
      const amount = r2(i.amount * k);
      return { ...i, amount, alloc: convAlloc(i.alloc, i.amount, k, amount) };
    }),
    expenses: s.expenses.map(e => ({ ...e, amount: r2(e.amount * k) })),
    transfers: s.transfers.map(t => ({ ...t, amount: r2(t.amount * k) })),
    debts: s.debts.map(d => convDebt(d, k)),
    loans: s.loans.map(l => ({ ...l, amount: r2(l.amount * k), returned: r2(l.returned * k) })),
    dreams: s.dreams.map(d => convDream(d, k)),
    recurring: s.recurring?.map(r => ({ ...r, amount: r2(r.amount * k) })),
    goals: Object.fromEntries(Object.entries(s.goals).map(([id, v]) => [id, r2((v ?? 0) * k)])),
  };
}
