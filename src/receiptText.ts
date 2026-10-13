import type { Lang } from './i18n';

export interface ReceiptText {
  button: string; title: string; lead: string; camera: string; gallery: string; privacy: string;
  loadingLib: string; reading: string; firstTime: string; offline: string; failed: string;
  resultTitle: string; amount: string; merchant: string; date: string; found: string; notFound: string; raw: string;
  apply: string; retry: string; cancel: string;
}

export const RECEIPT: Record<Lang, ReceiptText> = {
  tg: {
    button: 'Скан кардани чек', title: 'Сканери чек', lead: 'Чекро сурат гиред: барнома маблағ, мағоза ва санаро худаш мехонад.', camera: 'Сурат гирифтан', gallery: 'Аз галерея', privacy: 'Акс дар дастгоҳи шумо хонда мешавад ва ҷое фиристода ё захира намешавад.',
    loadingLib: 'Модули хондан бор мешавад…', reading: 'Матн хонда истодааст', firstTime: 'Бори аввал модули хурд (чанд МБ) бор мешавад, интернет лозим аст.', offline: 'Модули хондан бор нашуд. Интернетро санҷед ва аз нав кӯшиш кунед.', failed: 'Матн хонда нашуд. Чекро равшантар ва рост сурат гиред.',
    resultTitle: 'Натиҷа: санҷед ва тасдиқ кунед', amount: 'Маблағи ҷамъ', merchant: 'Мағоза / эзоҳ', date: 'Сана', found: 'Маблағи дигар', notFound: 'Маблағ ёфт нашуд: худатон нависед.', raw: 'Матни хондашуда',
    apply: 'Истифода бурдан', retry: 'Аз нав скан кардан', cancel: 'Бекор кардан',
  },
  ru: {
    button: 'Сканировать чек', title: 'Сканер чека', lead: 'Сфотографируйте чек: приложение само прочитает сумму, магазин и дату.', camera: 'Сфотографировать', gallery: 'Из галереи', privacy: 'Фото обрабатывается на вашем устройстве и нигде не отправляется и не сохраняется.',
    loadingLib: 'Загружается модуль распознавания…', reading: 'Читаем текст', firstTime: 'В первый раз загружается небольшой модуль (несколько МБ), нужен интернет.', offline: 'Не удалось загрузить модуль. Проверьте интернет и попробуйте снова.', failed: 'Текст не распознан. Сфотографируйте чек ровнее и чётче.',
    resultTitle: 'Результат: проверьте и подтвердите', amount: 'Итоговая сумма', merchant: 'Магазин / заметка', date: 'Дата', found: 'Другая сумма', notFound: 'Сумма не найдена: введите вручную.', raw: 'Распознанный текст',
    apply: 'Использовать', retry: 'Сканировать заново', cancel: 'Отмена',
  },
  en: {
    button: 'Scan a receipt', title: 'Receipt scanner', lead: 'Take a photo of the receipt: the app reads the total, the store and the date.', camera: 'Take a photo', gallery: 'From gallery', privacy: 'The photo is processed on your device and is neither sent nor stored anywhere.',
    loadingLib: 'Loading the recognition module…', reading: 'Reading the text', firstTime: 'The first time a small module (a few MB) is downloaded, so the internet is needed.', offline: 'Could not load the module. Check your internet connection and try again.', failed: 'The text could not be read. Take a flatter, sharper photo of the receipt.',
    resultTitle: 'Result: check and confirm', amount: 'Total amount', merchant: 'Store / note', date: 'Date', found: 'Another amount', notFound: 'No amount found: enter it manually.', raw: 'Recognized text',
    apply: 'Use it', retry: 'Scan again', cancel: 'Cancel',
  },
};
