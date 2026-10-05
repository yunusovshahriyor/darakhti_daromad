export type AccountId =
  | 'charity' | 'parents' | 'future' | 'fun' | 'debt'
  | 'capital' | 'bigDream' | 'smallDream' | 'living';

export type Alloc = Record<AccountId, number>;

/** Ҳамаи фоизҳо. charity/parents/future/fun — аз даромади умумӣ; боқӣ — аз даромади моҳона. */
export interface Settings {
  charity: number;
  parents: number;
  future: number;
  fun: number;
  company: number;
  capital: number;
  bigDream: number;
}

export interface Income {
  id: number;
  title: string;
  amount: number;
  date: string;
  alloc: Alloc;
}

export interface Expense {
  id: number;
  account: AccountId;
  title: string;
  amount: number;
  date: string;
  debtId?: number;
}

export interface Debt {
  id: number;
  title: string;
  amount: number;
  paid: number;
}

export interface Dream {
  id: number;
  title: string;
  kind: 'big' | 'small';
  target: number;
}

export interface State {
  settings: Settings;
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  dreams: Dream[];
}
