# Telegram-боти «Дарахти даромад»

Cloudflare Worker: ёдоварии пардохтҳои қарз (ҳар рӯз дар соати интихобшуда, бо вақти Тоҷикистон) ва хулосаи молиявӣ.
Маълумотро аз Firestore бо ҳисоби хидматӣ мехонад (танҳо хондан + сабти пайвастшавӣ).

Фармонҳо: `/xulosa`, `/qarzho`, `/yodovari`, `/help`, `/stop`.

## Танзим (як маротиба)

1. **Бот:** дар Telegram @BotFather → `/newbot` → токенро нусха кунед. Номи корбариро (бе @) ба `TELEGRAM_BOT_USERNAME` дар `src/firebaseConfig.ts` гузоред.
2. **Cloudflare:** ҳисоби ройгон → My Profile → API Tokens → шаблони «Edit Cloudflare Workers». `Account ID` дар саҳифаи Workers & Pages аст.
3. **Firebase:** Project settings → Service accounts → Generate new private key (файли JSON).
4. **Firestore rules:** мундариҷаи `firestore.rules`-ро дар Firebase Console → Firestore → Rules гузоред ва Publish кунед.
5. **GitHub → Settings → Secrets and variables → Actions**, 5 сирр:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TELEGRAM_TOKEN`,
   `WEBHOOK_SECRET` (ягон сатри тасодуфии дароз), `FIREBASE_SERVICE_ACCOUNT` (тамоми мундариҷаи файли JSON).
6. Workflow-и «Deploy Telegram bot» -ро ба таври дастӣ иҷро кунед (Actions → Run workflow). Он Worker-ро насб мекунад ва webhook ва рӯйхати фармонҳоро месозад.

Сипас дар барнома: Профил → «Telegram-бот» → «Гирифтани код» → кодро ба бот фиристед.
