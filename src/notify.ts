/** Навъҳои огоҳиномаҳои Telegram-бот: як рӯйхат барои барнома (Танзимот) ва бот. */
export interface NotifyDef { key: string; label: string; hint: string; group: 'Ҳатмӣ' | 'Тавсияшаванда' | 'Ихтиёрӣ'; def: boolean }

export const NOTIFY: NotifyDef[] = [
  { key: 'pay', label: '💳 Ёдоварии пардохтҳо', hint: 'Имрӯз, пагоҳ ва 3 рӯз пеш', group: 'Ҳатмӣ', def: true },
  { key: 'overdue', label: '⚠️ Пардохти дер шуда', hint: 'Ҳар рӯз то пардохт', group: 'Ҳатмӣ', def: true },
  { key: 'weekly', label: '📊 Хулосаи ҳафтаина', hint: 'Рӯзи якшанбе, соати 21:00', group: 'Ҳатмӣ', def: true },
  { key: 'monthly', label: '🗓 Хулосаи моҳ', hint: 'Рӯзи 1-ум соати 08:00, барои моҳи гузашта', group: 'Ҳатмӣ', def: true },
  { key: 'noentry', label: '✍️ «Сабт накардед»', hint: 'Агар 3 рӯз сабт нашуда бошад', group: 'Тавсияшаванда', def: true },
  { key: 'dreams', label: '✨ Орзуҳо', hint: 'Маблағ ҷамъ шуд; 30/7/1 рӯз то муҳлат', group: 'Тавсияшаванда', def: true },
  { key: 'debtpaid', label: '🎉 Қарз пардохт шуд', hint: 'Табрикӣ барои қарзи пӯшидашуда', group: 'Тавсияшаванда', def: true },
  { key: 'autosave', label: '🐷 Ҷамъкунии даврӣ', hint: 'Вақте ки ба орзу маблағ гузошта мешавад', group: 'Тавсияшаванда', def: true },
  { key: 'goals', label: '🎯 Ҳадафи ҳисоб', hint: '90% ва 100% расидан', group: 'Тавсияшаванда', def: true },
  { key: 'loans', label: '🤝 Қарздорон', hint: 'Қарз 30+ рӯз барнагардонда шудааст', group: 'Тавсияшаванда', def: true },
  { key: 'bigexp', label: '💸 Хароҷоти калон', hint: 'Аз миёна 3 маротиба зиёд', group: 'Ихтиёрӣ', def: false },
  { key: 'catover', label: '📈 Категория аз миёна зиёд', hint: 'Аз миёнаи 3 моҳ 40% зиёд', group: 'Ихтиёрӣ', def: false },
  { key: 'evening', label: '🌙 Хулосаи рӯз', hint: 'Даромад, хароҷот ва бақия', group: 'Ихтиёрӣ', def: false },
  { key: 'tips', label: '💡 Маслиҳат', hint: 'Ҳафтае як маротиба (шанбе)', group: 'Ихтиёрӣ', def: false },
];

export const NOTIFY_HOURS = [7, 9, 12, 18, 21];
export const NOTIFY_GROUPS: NotifyDef['group'][] = ['Ҳатмӣ', 'Тавсияшаванда', 'Ихтиёрӣ'];

export interface NotifyPrefs { hour: number; flags: Record<string, boolean>; /** Забони интихобшуда (барнома ва бот). */ lang?: 'tg' | 'ru' | 'en' }

export const defaultPrefs = (): NotifyPrefs => ({
  hour: 9,
  flags: Object.fromEntries(NOTIFY.map(n => [n.key, n.def])),
});

/** Ҳуҷҷати Firestore (users/{uid}/bot/prefs): `hour` + як boolean барои ҳар калид. */
export const prefsToDoc = (p: NotifyPrefs): Record<string, number | boolean | string> =>
  ({ hour: p.hour, ...p.flags, ...(p.lang ? { lang: p.lang } : {}) });

export function prefsFromDoc(d: Record<string, unknown> | null | undefined): NotifyPrefs {
  const base = defaultPrefs();
  if (!d) return base;
  for (const n of NOTIFY) if (typeof d[n.key] === 'boolean') base.flags[n.key] = d[n.key] as boolean;
  if (typeof d.hour === 'number' && NOTIFY_HOURS.includes(d.hour)) base.hour = d.hour;
  if (d.lang === 'tg' || d.lang === 'ru' || d.lang === 'en') base.lang = d.lang;
  return base;
}
