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
  /** «borrow» — қарзи гирифташуда, «loanBack» — баргардонидани қарзи додашуда: бе тақсими фоизӣ. */
  kind?: 'borrow' | 'loanBack';
  /** Санаи охирин таҳрир. */
  edited?: string;
  /** Манбаи даромад: «Музд», «Кори иловагӣ»… */
  source?: string;
  loanId?: number;
  debtId?: number;
}

export interface Expense {
  id: number;
  account: AccountId;
  title: string;
  amount: number;
  date: string;
  debtId?: number;
  dreamId?: number;
  loanId?: number;
  /** Категорияи хароҷот: «Транспорт», «Хӯрок»… */
  category?: string;
  /** Санаи охирин таҳрир. */
  edited?: string;
}

/** Қарзи додашуда: дигарон ба шумо қарздоранд. */
export interface Loan {
  id: number;
  person: string;
  amount: number;
  returned: number;
  /** Ҳисобе, ки аз он дода шуд ва маблағ ба ҳамон бармегардад. */
  account: AccountId;
  date: string;
  returnedAt?: string;
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
  /** Санаи мақсад: то кай харидан мехоҳед. */
  deadline?: string;
  /** Акс (data URL, хурдшуда). */
  image?: string;
  /** Ранги орзу. */
  color?: string;
  /** Истинод ба мағоза / эзоҳ. */
  link?: string;
  note?: string;
  /** Ҳиссаи худкор аз ҳар даромади оддӣ (фоиз) ва ҳисоб, ки аз он гирифта мешавад. */
  incomeShare?: { percent: number; from: AccountId };
  /** Ҷамъкунии даврӣ: ҳар ҳафта / моҳ; «ladder» — бозии 52 ҳафта (маблағ ҳар дафъа k маротиба). */
  autoSave?: {
    amount: number;
    every: 'week' | 'month';
    from: AccountId;
    ladder?: boolean;
    /** Санаи оғоз ва охирин иҷро (санаи давр). */
    started: string;
    lastRun?: string;
    count: number;
  };
}

export interface Transfer {
  id: number;
  /** Санаи охирин таҳрир. */
  edited?: string;
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
  loans: Loan[];
  /** Категорияҳои хароҷоти худи корбар. */
  categories?: { name: string; icon: string }[];
  /** Манбаъҳои даромади худи корбар. */
  incomeSources?: { name: string; icon: string }[];
  dreams: Dream[];
  transfers: Transfer[];
  goals: Partial<Record<AccountId, number>>;
}
