export interface Category {
  name: string;
  icon: string;
  /** Калидвожаҳо барои пешниҳоди худкор аз рӯи эзоҳ. */
  words: string[];
}

export const EXPENSE_CATEGORIES: Category[] = [
  { name: 'Транспорт', icon: '🚕', words: ['такси', 'taxi', 'автобус', 'маршрутка', 'метро', 'бензин', 'сӯзишворӣ', 'роҳкира', 'нақлиёт', 'yandex', 'яндекс'] },
  { name: 'Хӯрок', icon: '🍽️', words: ['хӯрок', 'нон', 'ресторан', 'кафе', 'наҳорӣ', 'ноҳор', 'шом', 'ошхона', 'самбӯса', 'чой', 'қаҳва', 'фастфуд'] },
  { name: 'Маҳсулот', icon: '🛒', words: ['бозор', 'маҳсулот', 'магазин', 'гӯшт', 'сабзавот', 'мева', 'супермаркет', 'дӯкон'] },
  { name: 'Алоқа', icon: '📱', words: ['телефон', 'интернет', 'алоқа', 'тариф', 'обуна', 'симкарта'] },
  { name: 'Хона', icon: '🏠', words: ['кироя', 'барқ', 'об', 'газ', 'хона', 'коммунал', 'таъмир'] },
  { name: 'Тиб', icon: '💊', words: ['дору', 'духтур', 'шифохона', 'тиб', 'дорухона', 'табобат'] },
  { name: 'Либос', icon: '👕', words: ['либос', 'кафш', 'куртка', 'ҷомаи', 'пойафзол'] },
  { name: 'Тафреҳ', icon: '🎬', words: ['кино', 'бозӣ', 'тафреҳ', 'консерт', 'сафар', 'парк'] },
  { name: 'Таълим', icon: '📚', words: ['китоб', 'курс', 'таълим', 'мактаб', 'донишгоҳ', 'дарс'] },
  { name: 'Тӯҳфа', icon: '🎁', words: ['тӯҳфа', 'тӯй', 'садақа', 'ҳадя', 'ёрдам'] },
  { name: 'Дигар', icon: '✨', words: [] },
];

/** Категорияро аз эзоҳ мепайдо мекунад («барои такси» → Транспорт). */
export function guessCategory(note: string, custom: { name: string }[] = []): string | null {
  const t = note.toLowerCase();
  if (!t.trim()) return null;
  const own = custom.find(c => t.includes(c.name.toLowerCase()));
  if (own) return own.name;
  return EXPENSE_CATEGORIES.find(c => c.words.some(w => t.includes(w)))?.name ?? null;
}

/** Рӯйхати категорияҳо: аввал ончое, ки зиёдтар сарф шудааст (чап); «Дигар» дар охир, агар сарф нашуда бошад. */
export function orderedCategories(
  custom: { name: string; icon: string }[],
  expenses: { category?: string; amount: number }[],
): { name: string; icon: string }[] {
  // Категорияҳои худи корбар аввал меоянд (дар байни баробар), «Дигар» дар охир
  const base = [
    ...custom,
    ...EXPENSE_CATEGORIES.filter(c => c.name !== 'Дигар').map(({ name, icon }) => ({ name, icon })),
    { name: 'Дигар', icon: '✨' },
  ];
  const sum = new Map<string, number>();
  for (const e of expenses) if (e.category) sum.set(e.category, (sum.get(e.category) ?? 0) + e.amount);
  return base
    .map((c, i) => ({ c, i, v: sum.get(c.name) ?? 0 }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map(x => x.c);
}
