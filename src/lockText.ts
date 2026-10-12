import type { Lang } from './i18n';

export interface LockText {
  title: string; lead: string; enable: string;
  enterPin: string; newPin: string; repeatPin: string; mismatch: string; wrong: string; wait: string;
  bio: string; bioNote: string; bioFail: string; bioUse: string;
  after: string; afters: [string, string, string, string];
  change: string; disable: string; disableConfirm: string; autoHide: string; autoHideNote: string;
  forgot: string; forgotTitle: string; forgotText: string; forgotOk: string; cancel: string; unlockTitle: string;
  on: string; off: string;
}

export const LOCK: Record<Lang, LockText> = {
  tg: {
    title: 'Қулфи барнома', lead: 'PIN-и 4 рақама барои муҳофизати маълумоти молиявӣ: барнома ҳангоми кушодан ё баргаштан қулф мешавад.', enable: 'Фаъол кардани қулф',
    enterPin: 'PIN-ро ворид кунед', newPin: 'PIN-и нав созед', repeatPin: 'PIN-ро такрор кунед', mismatch: 'PIN-ҳо мувофиқ нест. Аз нав кӯшиш кунед.', wrong: 'PIN нодуруст аст', wait: 'Кӯшишҳо зиёд шуд. Интизор шавед: {0} сония',
    bio: 'Ангушт / чеҳра', bioNote: 'Бо сенсори дастгоҳ бекор кардани қулф', bioFail: 'Фаъол нашуд. Ин дастгоҳ ё браузер онро дастгирӣ намекунад.', bioUse: 'Бо ангушт ё чеҳра',
    after: 'Қулф баъд аз', afters: ['Фавран', '30 сония', '1 дақиқа', '5 дақиқа'],
    change: 'Иваз кардани PIN', disable: 'Хомӯш кардани қулф', disableConfirm: 'Барои хомӯш кардан PIN-ро ворид кунед', autoHide: 'Пинҳон кардани маблағ ҳангоми кушодан', autoHideNote: 'Маблағҳо ҳангоми кушодани барнома хира мешаванд; бо тугмаи чашм нишон медиҳед.',
    forgot: 'PIN-ро фаромӯш кардам', forgotTitle: 'Фаромӯш кардани PIN', forgotText: 'Барои бекор кардани қулф аз аккаунт мебароед ва маълумоти ин дастгоҳ тоза мешавад. Агар аккаунт дошта бошед, маълумот дар сервер мемонад ва пас аз воридшавӣ бармегардад. Бе аккаунт маълумот гум мешавад.', forgotOk: 'Тоза кардан ва баромадан', cancel: 'Бекор кардан', unlockTitle: 'Барномаро кушоед',
    on: 'Фаъол', off: 'Хомӯш',
  },
  ru: {
    title: 'Блокировка приложения', lead: 'PIN-код из 4 цифр защищает финансовые данные: приложение блокируется при открытии и возвращении.', enable: 'Включить блокировку',
    enterPin: 'Введите PIN-код', newPin: 'Придумайте PIN-код', repeatPin: 'Повторите PIN-код', mismatch: 'PIN-коды не совпадают. Попробуйте снова.', wrong: 'Неверный PIN-код', wait: 'Слишком много попыток. Подождите: {0} сек.',
    bio: 'Отпечаток / лицо', bioNote: 'Разблокировка датчиком устройства', bioFail: 'Не удалось включить. Устройство или браузер не поддерживает это.', bioUse: 'По отпечатку или лицу',
    after: 'Блокировать через', afters: ['Сразу', '30 секунд', '1 минуту', '5 минут'],
    change: 'Сменить PIN-код', disable: 'Выключить блокировку', disableConfirm: 'Введите PIN-код, чтобы выключить', autoHide: 'Скрывать суммы при открытии', autoHideNote: 'Суммы размываются при открытии приложения; показать можно кнопкой с глазом.',
    forgot: 'Забыл PIN-код', forgotTitle: 'Забыли PIN-код', forgotText: 'Чтобы снять блокировку, вы выйдете из аккаунта, а данные на этом устройстве будут очищены. Если у вас есть аккаунт, данные останутся на сервере и вернутся после входа. Без аккаунта данные будут потеряны.', forgotOk: 'Очистить и выйти', cancel: 'Отмена', unlockTitle: 'Откройте приложение',
    on: 'Включено', off: 'Выключено',
  },
  en: {
    title: 'App lock', lead: 'A 4-digit PIN protects your financial data: the app locks when opened or when you return to it.', enable: 'Turn on the lock',
    enterPin: 'Enter your PIN', newPin: 'Create a PIN', repeatPin: 'Repeat the PIN', mismatch: 'The PINs do not match. Try again.', wrong: 'Wrong PIN', wait: 'Too many attempts. Wait {0} s',
    bio: 'Fingerprint / face', bioNote: "Unlock with the device's sensor", bioFail: 'Could not turn on. This device or browser does not support it.', bioUse: 'Use fingerprint or face',
    after: 'Lock after', afters: ['Immediately', '30 seconds', '1 minute', '5 minutes'],
    change: 'Change PIN', disable: 'Turn off the lock', disableConfirm: 'Enter your PIN to turn it off', autoHide: 'Hide amounts on open', autoHideNote: 'Amounts are blurred when the app opens; reveal them with the eye button.',
    forgot: 'Forgot PIN', forgotTitle: 'Forgot your PIN', forgotText: 'To remove the lock you will sign out and the data on this device will be cleared. If you have an account, your data stays on the server and returns after signing in. Without an account the data will be lost.', forgotOk: 'Clear and sign out', cancel: 'Cancel', unlockTitle: 'Open the app',
    on: 'On', off: 'Off',
  },
};
