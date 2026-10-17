import type { Lang } from './i18n';

export interface VoiceText {
  button: string; listening: string; tryAgain: string; heard: string;
  denied: string; none: string; network: string; other: string; noAmount: string; debt: string; hint: string;
}

export const VOICE: Record<Lang, VoiceText> = {
  tg: {
    button: 'Гуфтан', listening: 'Гӯш мекунам…', tryAgain: 'Боз як бор',
    heard: 'Шунидам:', denied: 'Иҷозати микрофон нест. Дар танзимоти браузер иҷозат диҳед.', none: 'Чизе нашунидам. Боз кӯшиш кунед.', network: 'Ба хидмати шинохти овоз пайваст нашуд (интернет?).', other: 'Шинохти овоз кор накард.',
    noAmount: 'Маблағ ёфт нашуд: онро худатон нависед.', debt: 'Қарзро аз «Қарз» сабт кунед.', hint: 'Масалан: «такси 2500» ё «музд панҷ ҳазор».',
  },
  ru: {
    button: 'Сказать', listening: 'Слушаю…', tryAgain: 'Ещё раз',
    heard: 'Услышал:', denied: 'Нет доступа к микрофону. Разрешите его в настройках браузера.', none: 'Ничего не услышал. Попробуйте ещё раз.', network: 'Нет связи со службой распознавания речи (интернет?).', other: 'Не удалось распознать речь.',
    noAmount: 'Сумма не найдена: введите вручную.', debt: 'Долг записывается во вкладке «Долг».', hint: 'Например: «такси 2500» или «зарплата пять тысяч».',
  },
  en: {
    button: 'Speak', listening: 'Listening…', tryAgain: 'Again',
    heard: 'Heard:', denied: 'Microphone access denied. Allow it in your browser settings.', none: 'Heard nothing. Try again.', network: 'Cannot reach the speech service (internet?).', other: 'Speech recognition failed.',
    noAmount: 'No amount found: enter it manually.', debt: 'Record debts in the “Debt” tab.', hint: 'For example: “taxi 2500” or “salary five thousand”.',
  },
};
