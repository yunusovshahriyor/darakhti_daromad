import type { Lang } from './i18n';

export interface GuideText {
  heroTitle: string; heroText: string;
  videoTitle: string; videoText: string; videoBtn: string;
  cards: [{ icon: string; title: string; text: string }, { icon: string; title: string; text: string }];
  badgeOn: string; tapSwitch: string; confirmTitle: string; confirmToFree: string; confirmToSystem: string; confirmOk: string; playHint: string; videoFallback: string;
  nowOn: string; nowFree: string; switchToFree: string; switchToSystem: string; switched: string; switchedFree: string;
  cmpTitle: string; cmpHead: [string, string, string];
  cmp: [string, string, string][];
  sysTitle: string; sysIntro: string;
  stepsTitle: string; steps: [string, string][];
  calcTitle: string; calcHint: string; calcLabel: string; calcDebt: string; calcNote: string;
  tree: Record<string, string>;
  rulesTitle: string; rules: string[];
  freeTitle: string; freeIntro: string; free: string[];
  faqTitle: string; faq: [string, string][];
  note: string;
}

const tg: GuideText = {
  cards: [
    { icon: '🌳', title: 'Системаи Саидмурод Давлатов', text: 'Даромад худкор аз рӯи фоиз тақсим мешавад: ҷамъ кардан ва афзун кардани маблағ бо тартиб.' },
    { icon: '💼', title: 'Ба тарзи худам', text: 'Ҳисобҳои худатон, бе фоиз ва бе тақсими худкор: танҳо назорати даромад ва хароҷот.' },
  ],
  badgeOn: 'Фаъол', tapSwitch: 'Гузаштан',
  confirmTitle: 'Иваз кардани система',
  confirmToFree: 'Системаи Давлатов хомӯш мешавад: даромади нав бе фоиз ба ҳисоби интихобшуда меравад. Маълумот ва фоизҳои шумо нигоҳ дошта мешаванд.',
  confirmToSystem: 'Системаи Давлатов фаъол мешавад: даромади нав аз рӯи фоиз тақсим мешавад. Ҳисобҳои худатон бо 0% илова мешаванд. Маълумоти шумо намемирад.',
  confirmOk: 'Иваз кардан',
  playHint: 'Видеоро дар дохили барнома тамошо кунед',
  videoFallback: 'Агар видео кушода нашавад, дар YouTube кушоед',
  heroTitle: 'Ду системаи кор',
  heroText: 'Барнома бо ду тарз кор карда метавонад. Онро ҳар вақт дар Танзимот иваз кардан мумкин аст: маълумоти шумо намемирад.',
  videoTitle: 'Тренинги Саидмурод Давлатов',
  videoText: 'Системаи «Сохранение и приумножение денег» (ҷамъ кардан ва афзун кардани маблағ) аз тренинги Саидмурод Давлатов гирифта шудааст. Ин саҳифа танҳо тарзи кори онро дар барнома шарҳ медиҳад; ғоя ва сабабҳои пурраи системаро дар худи тренинг тамошо кунед.',
  videoBtn: '▶ Тамошои тренинг дар YouTube',
  nowOn: 'Ҳозир фаъол: Системаи Саидмурод Давлатов',
  nowFree: 'Ҳозир фаъол: Ба тарзи худам',
  switchToFree: 'Гузаштан ба «Ба тарзи худам»',
  switchToSystem: 'Гузаштан ба системаи Саидмурод Давлатов',
  switched: 'Системаи Саидмурод Давлатов фаъол шуд ✓',
  switchedFree: 'Ҳолати «ба тарзи худам» фаъол шуд ✓',
  cmpTitle: 'Фарқи ду система',
  cmpHead: ['', 'Системаи Давлатов', 'Ба тарзи худам'],
  cmp: [
    ['Тақсими даромад', 'Худкор аз рӯи фоиз ба ҳисобҳо', 'Худатон ҳисобро интихоб мекунед'],
    ['Ҳисобҳо', 'Дарахти ҳисобҳо бо фоизҳо (садақа, волидон, оянда, қарз, сармоя, орзу…)', 'Ҳисобҳои худатон: Нақд, Корт ва ғайра'],
    ['Пардохти қарз', 'Аз ҳисоби махсуси «Пардохти қарз»', 'Аз ҳисоби дилхоҳ'],
    ['Мувофиқ барои', 'Касе ки мехоҳад пасандоз ва афзоиши маблағро бо тартиби собит ба роҳ монад', 'Касе ки танҳо даромад ва хароҷотро назорат кардан мехоҳад'],
    ['Дар ҳарду кор мекунад', 'Қарзҳо, орзуҳо, таърих, омор, нусхабардорӣ, Telegram-бот', 'Қарзҳо, орзуҳо, таърих, омор, нусхабардорӣ, Telegram-бот'],
  ],
  sysTitle: 'Системаи Саидмурод Давлатов',
  sysIntro: 'Ғоя: ҳар даромад (музд, кори иловагӣ, ҳадя…) пеш аз харҷ кардан аз рӯи фоизҳои муқарраршуда ба «ҳисобҳо» тақсим мешавад. Бо ин тарз пул ҳам ҷамъ мешавад, ҳам қарзҳо пардохт мешаванд ва ҳам орзуҳо пурра мегарданд. Шумо танҳо даромадро сабт мекунед, тақсимро барнома мекунад.',
  stepsTitle: 'Чӣ тавр кор мекунад',
  steps: [
    ['Даромад сабт мешавад', 'Масалан, 1000 сомонӣ музд гирифтед ва онро ба барнома илова кардед.'],
    ['Ҳиссаҳои асосӣ ҷудо мешаванд', 'Аввал аз тамоми маблағ: Садақа 2,5%, Волидон 10%, Барои оянда 10% ва Вақтхушӣ 10%. Агар қарз дошта бошед, боз 10% ба «Пардохти қарз» меравад.'],
    ['Боқимонда — даромади моҳона', 'Бе қарз 67,5% ва бо қарз 57,5% мемонад. Он ба ду гурӯҳ тақсим мешавад: Ҳисоби ширкат 55% ва Ҳисоби шахсӣ 45%.'],
    ['Ҳисоби ширкат', 'Сармоя 80% ва Орзу 20% (Орзуи калон ва Орзуи хурд баробар).'],
    ['Ҳисоби шахсӣ', 'Ҳамааш ба «Хароҷоти зиндагӣ» меравад: аз ин ҳисоб хӯрок, нақлиёт ва хароҷоти ҳаррӯза пардохт мешавад.'],
  ],
  calcTitle: 'Худатон бубинед',
  calcHint: 'Маблағи даромадро нависед: барнома нишон медиҳад, ки ба ҳар ҳисоб чӣ қадар мерасад (бо фоизҳои пешфарз).',
  calcLabel: 'Маблағи даромад, смн',
  calcDebt: 'Қарз дорам',
  calcNote: 'Фоизҳои худро дар Танзимот → «Ҳисобҳо ва фоизҳо» тағйир додан мумкин аст.',
  tree: { charity: 'Садақа', parents: 'Волидон', future: 'Барои оянда', debt: 'Пардохти қарз', fun: 'Вақтхушӣ', capital: 'Сармоя', bigDream: 'Орзуи калон', smallDream: 'Орзуи хурд', living: 'Хароҷоти зиндагӣ' },
  rulesTitle: 'Қоидаҳои муҳим',
  rules: [
    'Агар қарз дошта бошед, ҳиссаи «Вақтхушӣ» (10%) низ ба «Пардохти қарз» меравад: ҷамъ 20% барои зудтар пардохт кардани қарз.',
    'Қарз танҳо аз ҳисоби «Пардохти қарз» пардохт мешавад, ҳисоби дигар ба он даст намезанад.',
    'Агар қарз набошад, ҳисоби «Пардохти қарз» пинҳон мешавад ва ҳиссааш ба боқимонда мегузарад.',
    'Вақте ки ҳамаи қарзҳо пардохт шуданд, боқимондаи ин ҳисоб худкор ба «Сармоя» мегузарад.',
    'Орзу аз ҳисоби орзу харида мешавад: ҳар орзу нархи худро дорад ва барнома нишон медиҳад, ки чӣ қадар ҷамъ шуд ва кай мерасад.',
  ],
  freeTitle: 'Ба тарзи худам',
  freeIntro: 'Бе фоиз ва бе тақсими худкор. Барои онҳое, ки танҳо мехоҳанд пули худро назорат кунанд.',
  free: [
    'Ҳисобҳоро худатон месозед: Нақд, Корт, Пасандоз ва ғайра (Танзимот → Ҳисобҳо).',
    'Ҳангоми сабти даромад ҳисобро худатон интихоб мекунед: тамоми маблағ ба ҳамон ҳисоб меравад.',
    'Қарзро аз ҳисоби дилхоҳ пардохт мекунед.',
    'Орзуҳо, қарзҳо, таърих, омор ва Telegram-бот ҳамон тавр кор мекунанд.',
  ],
  faqTitle: 'Саволҳои зуд-зуд',
  faq: [
    ['Агар аз як система ба дигар гузарам, маълумот нест мешавад?', 'Не. Даромад, хароҷот, қарз, орзуҳо ва таърих мемонанд. Танҳо тарзи тақсим ва намоиши ҳисобҳо иваз мешавад.'],
    ['Агар баъд ба системаи Давлатов баргардам чӣ мешавад?', 'Фоизҳои пештараи шумо нигоҳ дошта шудаанд ва дубора кор мекунанд. Ҳисобҳое, ки дар ҳолати озод сохтаед, бо 0% илова мешаванд: фоизи онҳоро худатон муайян мекунед.'],
    ['Даромадҳои пештара пас аз гузариш тағйир меёбанд?', 'Не. Даромадҳое, ки пештар сабт шудаанд, ҳамон тавр тақсим шуда мемонанд.'],
    ['Фоизҳоро тағйир додан мумкин аст?', 'Ҳа: Танзимот → «Ҳисобҳо ва фоизҳо». Фоизи охирини ҳар гурӯҳ — боқимонда, то ҷамъ ҳамеша 100% бошад.'],
    ['Кадомашро интихоб кунам?', 'Агар мехоҳед пул ҷамъ кардан ва афзун кардан ба одат шавад ва тақсимро худатон фикр накунед, системаи Давлатовро интихоб кунед. Агар танҳо мехоҳед ба даромад ва хароҷот назар кунед, «ба тарзи худам».'],
  ],
  note: 'Ин саҳифа тарзи кори барномаро шарҳ медиҳад. Ин ҷойгузини тренинги худи муаллиф нест.',
};

const ru: GuideText = {
  cards: [
    { icon: '🌳', title: 'Система Саидмурода Давлатова', text: 'Доход делится автоматически по процентам: накопление и приумножение денег по чёткой схеме.' },
    { icon: '💼', title: 'По-своему', text: 'Ваши счета, без процентов и автоматического деления: просто учёт доходов и расходов.' },
  ],
  badgeOn: 'Включено', tapSwitch: 'Перейти',
  confirmTitle: 'Смена системы',
  confirmToFree: 'Система Давлатова будет выключена: новый доход пойдёт без процентов на выбранный счёт. Ваши данные и проценты сохранятся.',
  confirmToSystem: 'Система Давлатова будет включена: новый доход разделится по процентам. Созданные вами счета добавятся с 0%. Ваши данные не пропадут.',
  confirmOk: 'Сменить',
  playHint: 'Смотрите видео прямо в приложении',
  videoFallback: 'Если видео не открывается, откройте на YouTube',
  heroTitle: 'Две системы работы',
  heroText: 'Приложение может работать двумя способами. Их можно переключить в любой момент в Настройках: ваши данные не пропадут.',
  videoTitle: 'Тренинг Саидмурода Давлатова',
  videoText: 'Система «Сохранение и приумножение денег» взята из тренинга Саидмурода Давлатова. Эта страница лишь объясняет, как она работает в приложении; полную идею и причины смотрите в самом тренинге.',
  videoBtn: '▶ Смотреть тренинг на YouTube',
  nowOn: 'Сейчас включено: Система Саидмурода Давлатова',
  nowFree: 'Сейчас включено: По-своему',
  switchToFree: 'Перейти на «По-своему»',
  switchToSystem: 'Перейти на систему Саидмурода Давлатова',
  switched: 'Система Саидмурода Давлатова включена ✓',
  switchedFree: 'Режим «по-своему» включён ✓',
  cmpTitle: 'Чем отличаются',
  cmpHead: ['', 'Система Давлатова', 'По-своему'],
  cmp: [
    ['Деление дохода', 'Автоматически по процентам между счетами', 'Вы сами выбираете счёт'],
    ['Счета', 'Дерево счетов с процентами (садака, родители, будущее, долги, капитал, мечты…)', 'Ваши счета: Наличные, Карта и т. д.'],
    ['Оплата долга', 'Со специального счёта «Оплата долга»', 'С любого счёта'],
    ['Подходит', 'Тем, кто хочет выстроить накопление и приумножение денег по чёткой схеме', 'Тем, кто просто хочет вести учёт доходов и расходов'],
    ['Работает в обоих', 'Долги, мечты, история, статистика, резервные копии, Telegram-бот', 'Долги, мечты, история, статистика, резервные копии, Telegram-бот'],
  ],
  sysTitle: 'Система Саидмурода Давлатова',
  sysIntro: 'Идея: каждый доход (зарплата, подработка, подарок…) до траты делится по заданным процентам между «счетами». Так деньги копятся, долги погашаются, а мечты исполняются. Вы только записываете доход, делением занимается приложение.',
  stepsTitle: 'Как это работает',
  steps: [
    ['Записывается доход', 'Например, вы получили 1000 сомони зарплаты и добавили их в приложение.'],
    ['Отделяются основные доли', 'Сначала от всей суммы: Садака 2,5%, Родители 10%, На будущее 10% и Развлечения 10%. Если у вас есть долг, ещё 10% идёт на «Оплату долга».'],
    ['Остаток — месячный доход', 'Без долга остаётся 67,5%, с долгом 57,5%. Он делится на две группы: Счёт компании 55% и Личный счёт 45%.'],
    ['Счёт компании', 'Капитал 80% и Мечта 20% (Большая и Малая мечты поровну).'],
    ['Личный счёт', 'Всё идёт на «Расходы на жизнь»: с него оплачиваются еда, транспорт и повседневные траты.'],
  ],
  calcTitle: 'Посмотрите сами',
  calcHint: 'Введите сумму дохода: приложение покажет, сколько достанется каждому счёту (по стандартным процентам).',
  calcLabel: 'Сумма дохода, смн',
  calcDebt: 'У меня есть долг',
  calcNote: 'Свои проценты можно изменить в Настройки → «Счета и проценты».',
  tree: { charity: 'Садака', parents: 'Родители', future: 'На будущее', debt: 'Оплата долга', fun: 'Развлечения', capital: 'Капитал', bigDream: 'Большая мечта', smallDream: 'Малая мечта', living: 'Расходы на жизнь' },
  rulesTitle: 'Важные правила',
  rules: [
    'Если у вас есть долг, доля «Развлечений» (10%) тоже идёт на «Оплату долга»: всего 20% на быстрое погашение долга.',
    'Долг оплачивается только со счёта «Оплата долга», другие счета он не трогает.',
    'Если долгов нет, счёт «Оплата долга» скрывается, а его доля переходит в остаток.',
    'Когда все долги погашены, остаток этого счёта автоматически переходит в «Капитал».',
    'Мечта покупается со счёта мечт: у каждой мечты своя цена, а приложение показывает, сколько накоплено и когда хватит.',
  ],
  freeTitle: 'По-своему',
  freeIntro: 'Без процентов и автоматического деления. Для тех, кто просто хочет контролировать свои деньги.',
  free: [
    'Счета вы создаёте сами: Наличные, Карта, Накопления и т. д. (Настройки → Счета).',
    'При записи дохода вы сами выбираете счёт: вся сумма идёт на него.',
    'Долг вы оплачиваете с любого счёта.',
    'Мечты, долги, история, статистика и Telegram-бот работают так же.',
  ],
  faqTitle: 'Частые вопросы',
  faq: [
    ['Если я перейду с одной системы на другую, данные пропадут?', 'Нет. Доходы, расходы, долги, мечты и история сохраняются. Меняется только способ деления и показ счетов.'],
    ['Что будет, если потом вернуться к системе Давлатова?', 'Ваши прежние проценты сохранены и снова заработают. Счета, созданные в режиме «по-своему», добавятся с 0%: их процент вы зададите сами.'],
    ['Изменятся ли прежние доходы после перехода?', 'Нет. Ранее записанные доходы останутся разделёнными так, как были.'],
    ['Можно ли менять проценты?', 'Да: Настройки → «Счета и проценты». Последний процент группы — остаток, чтобы сумма всегда была 100%.'],
    ['Что выбрать?', 'Если хотите, чтобы накопление и приумножение денег стало привычкой и не хотите сами продумывать деление, выбирайте систему Давлатова. Если нужен просто учёт доходов и расходов, выбирайте «по-своему».'],
  ],
  note: 'Эта страница объясняет работу приложения. Она не заменяет сам тренинг автора.',
};

const en: GuideText = {
  cards: [
    { icon: '🌳', title: "Saidmurod Davlatov's system", text: 'Income is split automatically by percentages: saving and growing money on a clear scheme.' },
    { icon: '💼', title: 'My own way', text: 'Your own accounts, no percentages and no automatic split: just tracking income and expenses.' },
  ],
  badgeOn: 'On', tapSwitch: 'Switch',
  confirmTitle: 'Change system',
  confirmToFree: "Davlatov's system will be turned off: new income goes to the chosen account with no percentages. Your data and percentages are kept.",
  confirmToSystem: "Davlatov's system will be turned on: new income is split by percentages. Accounts you created are added at 0%. Your data is not lost.",
  confirmOk: 'Change',
  playHint: 'Watch the video right in the app',
  videoFallback: "If the video doesn't open, open it on YouTube",
  heroTitle: 'Two ways to work',
  heroText: 'The app can work in two ways. You can switch any time in Settings: your data is not lost.',
  videoTitle: "Saidmurod Davlatov's training",
  videoText: 'The “Saving and multiplying money” system comes from Saidmurod Davlatov’s training. This page only explains how it works in the app; watch the training itself for the full idea and the reasons behind it.',
  videoBtn: '▶ Watch the training on YouTube',
  nowOn: "Currently on: Saidmurod Davlatov's system",
  nowFree: 'Currently on: My own way',
  switchToFree: 'Switch to “My own way”',
  switchToSystem: "Switch to Saidmurod Davlatov's system",
  switched: "Saidmurod Davlatov's system is on ✓",
  switchedFree: '“My own way” mode is on ✓',
  cmpTitle: 'How they differ',
  cmpHead: ['', "Davlatov's system", 'My own way'],
  cmp: [
    ['Income split', 'Automatic, by percentages between accounts', 'You choose the account yourself'],
    ['Accounts', 'A tree of accounts with percentages (charity, parents, future, debts, capital, dreams…)', 'Your own accounts: Cash, Card, etc.'],
    ['Paying a debt', 'From the dedicated “Debt payment” account', 'From any account'],
    ['Best for', 'Those who want to build saving and growing money on a clear scheme', 'Those who just want to track income and expenses'],
    ['Works in both', 'Debts, dreams, history, statistics, backups, Telegram bot', 'Debts, dreams, history, statistics, backups, Telegram bot'],
  ],
  sysTitle: "Saidmurod Davlatov's system",
  sysIntro: 'The idea: every income (salary, side job, gift…) is split by set percentages between “accounts” before you spend it. This way money accumulates, debts get paid and dreams come true. You only record the income, the app does the splitting.',
  stepsTitle: 'How it works',
  steps: [
    ['Income is recorded', 'For example, you received a 1000 somoni salary and added it to the app.'],
    ['Core shares are set aside', 'First, from the whole amount: Charity 2.5%, Parents 10%, For the future 10% and Fun 10%. If you have a debt, another 10% goes to “Debt payment”.'],
    ['The rest is monthly income', 'Without a debt 67.5% remains, with a debt 57.5%. It is split into two groups: Company account 55% and Personal account 45%.'],
    ['Company account', 'Capital 80% and Dream 20% (Big and Small dream equally).'],
    ['Personal account', 'Everything goes to “Living expenses”: food, transport and everyday costs are paid from it.'],
  ],
  calcTitle: 'See for yourself',
  calcHint: 'Enter an income amount: the app shows how much each account gets (with the default percentages).',
  calcLabel: 'Income amount, smn',
  calcDebt: 'I have a debt',
  calcNote: 'You can change your own percentages in Settings → “Accounts and percentages”.',
  tree: { charity: 'Charity', parents: 'Parents', future: 'For the future', debt: 'Debt payment', fun: 'Fun', capital: 'Capital', bigDream: 'Big dream', smallDream: 'Small dream', living: 'Living expenses' },
  rulesTitle: 'Important rules',
  rules: [
    'If you have a debt, the “Fun” share (10%) also goes to “Debt payment”: 20% in total to pay the debt off faster.',
    'A debt is paid only from the “Debt payment” account; other accounts are not touched.',
    'If there are no debts, the “Debt payment” account is hidden and its share goes to the remainder.',
    'When all debts are paid, what is left on this account moves to “Capital” automatically.',
    'A dream is bought from the dream account: each dream has its price and the app shows how much is saved and when it will be enough.',
  ],
  freeTitle: 'My own way',
  freeIntro: 'No percentages and no automatic split. For those who just want to keep track of their money.',
  free: [
    'You create the accounts yourself: Cash, Card, Savings, etc. (Settings → Accounts).',
    'When recording income you choose the account yourself: the whole amount goes to it.',
    'You pay a debt from any account.',
    'Dreams, debts, history, statistics and the Telegram bot work the same.',
  ],
  faqTitle: 'FAQ',
  faq: [
    ['If I switch from one system to the other, will my data be lost?', 'No. Income, expenses, debts, dreams and history are kept. Only the way of splitting and showing accounts changes.'],
    ["What happens if I return to Davlatov's system later?", 'Your previous percentages are kept and work again. Accounts you created in “my own way” mode are added with 0%: you set their percentage yourself.'],
    ['Will earlier income change after switching?', 'No. Income recorded earlier stays split the way it was.'],
    ['Can I change the percentages?', 'Yes: Settings → “Accounts and percentages”. The last percentage in a group is the remainder, so the total is always 100%.'],
    ['Which one should I choose?', "If you want saving and growing money to become a habit and don't want to think about the split yourself, choose Davlatov's system. If you just need to track income and expenses, choose “my own way”."],
  ],
  note: 'This page explains how the app works. It does not replace the author’s training itself.',
};

export const GUIDE: Record<Lang, GuideText> = { tg, ru, en };
export const TRAINING_ID = 'RZX5LzXsCZI';
export const TRAINING_URL = 'https://youtu.be/RZX5LzXsCZI?si=qv-jCFL0hi54XMcZ';
