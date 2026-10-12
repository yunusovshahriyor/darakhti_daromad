import type { Lang } from './i18n';

export interface OnboardText {
  next: string; back: string; skip: string; lang: string;
  s1: [string, string];
  s2: [string, string]; s2b: string; flowIncome: string; flowAccounts: [string, string][];
  s3: [string, string]; s3more: string;
  s4: [string, string]; addIncome: string; connectTg: string; open: string;
  tips: [string, string][];
  replay: string;
}

export const ONBOARD: Record<Lang, OnboardText> = {
  tg: {
    next: 'Идома', back: 'Қафо', skip: 'Гузаштан', lang: 'Забон',
    s1: ['Хуш омадед ба «Дарахти даромад»', 'Пулро ҷамъ кунед ва афзун кунед: даромад, хароҷот, қарзҳо ва орзуҳо дар як ҷо.'],
    s2: ['Чӣ тавр кор мекунад', 'Ҳар даромадро сабт мекунед. Барнома онро ба ҳисобҳо тақсим мекунад.'],
    s2b: 'Хароҷотро аз ҳисоби мувофиқ сабт мекунед ва ҳамеша мебинед, ки пул дар куҷост.',
    flowIncome: '💰 Даромад',
    flowAccounts: [['🤲', 'Садақа'], ['👨‍👩‍👧', 'Волидон'], ['🌱', 'Оянда'], ['💳', 'Қарз'], ['📈', 'Сармоя'], ['✨', 'Орзу']],
    s3: ['Услуби худро интихоб кунед', 'Онро ҳар вақт дар Танзимот иваз кардан мумкин аст. Маълумоти шумо намемирад.'],
    s3more: 'Дар бораи системаҳо бештар донед',
    s4: ['Омодаед!', 'Қадами аввал: даромади худро илова кунед. Баъд ҳисобҳо худашон пур мешаванд.'],
    addIncome: '➕ Илова кардани даромад', connectTg: '✈️ Пайваст кардани Telegram-бот', open: 'Кушодани барнома',
    replay: 'Муқаддимаро дубора дидан',
    tips: [['🔔', 'Бот дар бораи пардохтҳои қарз ёдрас мекунад'], ['🌐', 'Забонро дар Танзимот иваз кардан мумкин аст'], ['☁️', 'Бо воридшавӣ маълумот дар ҳамаи дастгоҳҳо мемонад']],
  },
  ru: {
    next: 'Далее', back: 'Назад', skip: 'Пропустить', lang: 'Язык',
    s1: ['Добро пожаловать в «Дерево дохода»', 'Копите и приумножайте деньги: доходы, расходы, долги и мечты в одном месте.'],
    s2: ['Как это работает', 'Вы записываете каждый доход. Приложение делит его между счетами.'],
    s2b: 'Расходы вы записываете с подходящего счёта и всегда видите, где ваши деньги.',
    flowIncome: '💰 Доход',
    flowAccounts: [['🤲', 'Садака'], ['👨‍👩‍👧', 'Родители'], ['🌱', 'Будущее'], ['💳', 'Долг'], ['📈', 'Капитал'], ['✨', 'Мечта']],
    s3: ['Выберите свой стиль', 'Это можно изменить в любой момент в Настройках. Ваши данные не пропадут.'],
    s3more: 'Подробнее о системах',
    s4: ['Всё готово!', 'Первый шаг: добавьте свой доход. Затем счета заполнятся сами.'],
    addIncome: '➕ Добавить доход', connectTg: '✈️ Подключить Telegram-бота', open: 'Открыть приложение',
    replay: 'Посмотреть вступление ещё раз',
    tips: [['🔔', 'Бот напомнит о платежах по долгам'], ['🌐', 'Язык можно сменить в Настройках'], ['☁️', 'После входа данные сохраняются на всех устройствах']],
  },
  en: {
    next: 'Next', back: 'Back', skip: 'Skip', lang: 'Language',
    s1: ['Welcome to “Income Tree”', 'Save and grow your money: income, expenses, debts and dreams in one place.'],
    s2: ['How it works', 'You record every income. The app splits it between accounts.'],
    s2b: 'You record expenses from the right account and always see where your money is.',
    flowIncome: '💰 Income',
    flowAccounts: [['🤲', 'Charity'], ['👨‍👩‍👧', 'Parents'], ['🌱', 'Future'], ['💳', 'Debt'], ['📈', 'Capital'], ['✨', 'Dream']],
    s3: ['Choose your style', 'You can change it any time in Settings. Your data will not be lost.'],
    s3more: 'Learn more about the systems',
    s4: ['You are all set!', 'First step: add your income. Then the accounts fill themselves.'],
    addIncome: '➕ Add income', connectTg: '✈️ Connect the Telegram bot', open: 'Open the app',
    replay: 'Watch the intro again',
    tips: [['🔔', 'The bot reminds you about debt payments'], ['🌐', 'You can change the language in Settings'], ['☁️', 'After signing in your data stays on all devices']],
  },
};
