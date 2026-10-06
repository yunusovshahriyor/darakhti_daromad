export type AccountId = string;

/** Таърифи ҳисоб: ном, нишона, ранг. Ҳисоби нестшуда archived мешавад ва дар таърих мемонад. */
export interface AccountDef {
  id: AccountId;
  name: string;
  icon: string;
  color: string;
  archived?: boolean;
}

/** Дарахти тақсим: фоиз нисбат ба волид; фоизи охирини гурӯҳ — боқимонда (то 100%). */
export type DistNode =
  | { id: string; type: 'group'; title: string; icon: string; percent: number; children: DistNode[] }
  | { id: string; type: 'account'; accountId: AccountId; percent: number };

export type Alloc = Record<AccountId, number>;

/** Фоизҳои версияи кӯҳна (танҳо барои гузариш ба дарахти нав). */
export interface Settings {
  charity: number;
  parents: number;
  future: number;
  fun: number;
  debt?: number;
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
  dreamId?: number;
}

export interface Debt {
  id: number;
  title: string;
  amount: number;
  paid: number;
  /** Қарзи афзалиятнок: аввал пардохт мешавад. */
  priority?: boolean;
  /** Санаи пардохти пурра. */
  paidAt?: string;
  /** Санаи гирифтани қарз. */
  date?: string;
}

export interface Dream {
  id: number;
  title: string;
  kind: 'big' | 'small';
  target: number;
  /** Орзуи афзалиятнок: аввал харида мешавад. */
  priority?: boolean;
  /** Санаи харид ва нархи воқеӣ: орзуи харидашуда аз рӯйхат намеравад. */
  boughtAt?: string;
  paidPrice?: number;
}

export interface Transfer {
  id: number;
  from: AccountId;
  to: AccountId;
  amount: number;
  date: string;
}

export interface State {
  accounts: AccountDef[];
  tree: DistNode;
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  dreams: Dream[];
  transfers: Transfer[];
  goals: Partial<Record<AccountId, number>>;
}
