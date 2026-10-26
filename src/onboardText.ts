import type { Lang } from './i18n';

export interface OnboardText {
  next: string; back: string; skip: string; lang: string;
  s1: [string, string];
  s2: [string, string]; s2b: string; flowIncome: string; flowAccounts: [string, string][];
  s4: [string, string]; addIncome: string; connectTg: string; open: string;
  tips: [string, string][];
  replay: string;
}

export const ONBOARD: Record<Lang, OnboardText> = {
  tg: {
    next: 'Идома', back: 'Қафо', skip: 'Гузаштан', lang: 'Забон',
    s1: ['Хуш омадед ба «Дарахти даромад»', 'Пулро ҷамъ кунед ва афзун кунед: даромад, хароҷот, қарзҳо ва орзуҳо дар як ҷо.'],
    s2: ['Чӣ тавр кор мекунад', 'Ҳисобҳои худро месозед (Нақд, Корт, Пасандоз…). Барои ҳар ҳисоб метавонед фоизи муайянро аз ҳар даромад ҷудо кунед.'],
    s2b: 'Даромадро сабт мекунед: фоизҳо худкор ҷудо мешаванд, боқимонда ба ҳисоби асосӣ меравад.',
    flowIncome: '💰 Даромад',
    flowAccounts: [['💵', 'Нақд'], ['💳', 'Корт'], ['🐷', 'Пасандоз'], ['🤲', 'Садақа']],
    s4: ['Омодаед!', 'Қадами аввал: даромади худро илова кунед. Баъд ҳисобҳо худашон пур мешаванд.'],
    addIncome: '➕ Илова кардани даромад', connectTg: '✈️ Пайваст кардани Telegram-бот', open: 'Кушодани барнома',
    replay: 'Муқаддимаро дубора дидан',
    tips: [['🔔', 'Бот дар бораи пардохтҳои қарз ёдрас мекунад'], ['🌐', 'Забонро дар Танзимот иваз кардан мумкин аст'], ['☁️', 'Бо воридшавӣ маълумот дар ҳамаи дастгоҳҳо мемонад']],
  },
  ru: {
    next: 'Далее', back: 'Назад', skip: 'Пропустить', lang: 'Язык',
    s1: ['Добро пожаловать в «Дерево дохода»', 'Копите и приумножайте деньги: доходы, расходы, долги и мечты в одном месте.'],
    s2: ['Как это работает', 'Вы создаёте свои счета (Наличные, Карта, Накопления…). Для любого счёта можно выделять нужный процент от каждого дохода.'],
    s2b: 'Вы записываете доход: проценты отделяются сами, остаток идёт на основной счёт.',
    flowIncome: '💰 Доход',
    flowAccounts: [['💵', 'Наличные'], ['💳', 'Карта'], ['🐷', 'Накопления'], ['🤲', 'Садака']],
    s4: ['Всё готово!', 'Первый шаг: добавьте свой доход. Затем счета заполнятся сами.'],
    addIncome: '➕ Добавить доход', connectTg: '✈️ Подключить Telegram-бота', open: 'Открыть приложение',
    replay: 'Посмотреть вступление ещё раз',
    tips: [['🔔', 'Бот напомнит о платежах по долгам'], ['🌐', 'Язык можно сменить в Настройках'], ['☁️', 'После входа данные сохраняются на всех устройствах']],
  },
  en: {
    next: 'Next', back: 'Back', skip: 'Skip', lang: 'Language',
    s1: ['Welcome to “Income Tree”', 'Save and grow your money: income, expenses, debts and dreams in one place.'],
    s2: ['How it works', 'You create your own accounts (Cash, Card, Savings…). For any account you can set aside a percentage of every income.'],
    s2b: 'You record an income: the percentages are set aside automatically and the rest goes to the main account.',
    flowIncome: '💰 Income',
    flowAccounts: [['💵', 'Cash'], ['💳', 'Card'], ['🐷', 'Savings'], ['🤲', 'Charity']],
    s4: ['You are all set!', 'First step: add your income. Then the accounts fill themselves.'],
    addIncome: '➕ Add income', connectTg: '✈️ Connect the Telegram bot', open: 'Open the app',
    replay: 'Watch the intro again',
    tips: [['🔔', 'The bot reminds you about debt payments'], ['🌐', 'You can change the language in Settings'], ['☁️', 'After signing in your data stays on all devices']],
  },
};
