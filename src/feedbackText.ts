import type { Lang } from './i18n';

export interface FeedbackText {
  title: string; lead: string;
  types: [string, string, string]; typeIcons: [string, string, string];
  ph: [string, string, string];
  msgLabel: string; contactLabel: string; contactPh: string;
  techNote: string;
  send: string; sending: string; minHint: string;
  okTitle: string; okText: string; close: string;
  err: string; wait: string; noServer: string;
}

export const FEEDBACK: Record<Lang, FeedbackText> = {
  tg: {
    title: 'Хабар додан дар бораи хато', lead: 'Хато ёфтед ё пешниҳод доред? Ба мо нависед: мо ҳатман мехонем ва барнома беҳтар мешавад.',
    types: ['Хато', 'Пешниҳод', 'Савол'], typeIcons: ['🐞', '💡', '💬'],
    ph: ['Чӣ рӯй дод? Дар кадом саҳифа ва пас аз кадом амал? Агар дошта бошед, чӣ интизор будед?', 'Чӣ чизро беҳтар кардан мумкин аст ё кадом имконият намерасад?', 'Саволатонро нависед…'],
    msgLabel: 'Матн', contactLabel: 'Чӣ тавр ҷавоб диҳем? (ихтиёрӣ)', contactPh: 'Почта ё @ном дар Telegram',
    techNote: 'Маълумоти техникии дастгоҳ худкор мефиристад (бе маблағ, ном ва маълумоти молиявӣ).',
    send: 'Фиристодан', sending: 'Фиристода истодааст…', minHint: 'Камаш 10 аломат нависед',
    okTitle: 'Ташаккур!', okText: 'Хабари шумо қабул шуд. Мо онро меомӯзем ва агар тамос гузошта бошед, ҷавоб медиҳем.', close: 'Пӯшидан',
    err: 'Фиристода нашуд. Интернетро санҷед ва аз нав кӯшиш кунед.', wait: 'Лутфан каме интизор шавед ва аз нав кӯшиш кунед.', noServer: 'Хидмат ҳоло дастнорас аст.',
  },
  ru: {
    title: 'Сообщить об ошибке', lead: 'Нашли ошибку или есть предложение? Напишите нам: мы обязательно прочитаем, и приложение станет лучше.',
    types: ['Ошибка', 'Предложение', 'Вопрос'], typeIcons: ['🐞', '💡', '💬'],
    ph: ['Что произошло? На какой странице и после какого действия? Что вы ожидали увидеть?', 'Что можно улучшить или какой возможности не хватает?', 'Напишите ваш вопрос…'],
    msgLabel: 'Текст', contactLabel: 'Как вам ответить? (необязательно)', contactPh: 'Почта или @имя в Telegram',
    techNote: 'Технические данные устройства отправляются автоматически (без сумм, имён и финансовых данных).',
    send: 'Отправить', sending: 'Отправляем…', minHint: 'Напишите не менее 10 символов',
    okTitle: 'Спасибо!', okText: 'Ваше сообщение получено. Мы изучим его и ответим, если вы оставили контакт.', close: 'Закрыть',
    err: 'Не удалось отправить. Проверьте интернет и попробуйте снова.', wait: 'Пожалуйста, подождите немного и попробуйте снова.', noServer: 'Сервис пока недоступен.',
  },
  en: {
    title: 'Report a problem', lead: 'Found a bug or have an idea? Write to us: we read every message and the app gets better.',
    types: ['Bug', 'Idea', 'Question'], typeIcons: ['🐞', '💡', '💬'],
    ph: ['What happened? On which screen and after which action? What did you expect?', 'What could be better or which feature is missing?', 'Write your question…'],
    msgLabel: 'Message', contactLabel: 'How can we reply? (optional)', contactPh: 'Email or @name in Telegram',
    techNote: 'Technical device details are sent automatically (no amounts, names or financial data).',
    send: 'Send', sending: 'Sending…', minHint: 'Write at least 10 characters',
    okTitle: 'Thank you!', okText: 'Your message was received. We will look into it and reply if you left a contact.', close: 'Close',
    err: 'Could not send. Check your internet connection and try again.', wait: 'Please wait a moment and try again.', noServer: 'The service is unavailable right now.',
  },
};
