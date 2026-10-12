import { dateOf, debtsText, reminderText, summaryText } from './report';
import { NOTIFY, buildDigest } from './digest';
import { NOTIFY_HOURS, defaultPrefs, prefsFromDoc, prefsToDoc } from '../../src/notify';
import type { Flags, Seen } from './digest';
import * as fs from './firestore';
import { customToken } from './firestore';
import type { Env } from './firestore';
import type { State } from '../../src/types';
import { swapUnit } from '../../src/currency';
import { LOGIN_RE, LOGIN_TTL_MS, newCode, resolveUid, verifyInitData } from './auth';
import { isLang, langFromCode, makeT } from './i18n';
import type { Lang, TFn } from './i18n';

interface TgUser { id?: number; first_name?: string; last_name?: string; language_code?: string }
interface Update {
  message?: { chat: { id: number; type: string }; text?: string; from?: TgUser };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { chat: { id: number; type: string }; message_id: number } };
}

interface ScheduledController { scheduledTime: number }
interface Ctx { waitUntil(p: Promise<unknown>): void }

type Button = { text: string; callback_data?: string; web_app?: { url: string }; url?: string };
type Keyboard = { inline_keyboard: Button[][] };

const tg = async (env: Env, method: string, body: Record<string, unknown>) => {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.log(`telegram ${method}: ${res.status} ${await res.text()}`);
  return res.ok;
};

type TgPhoto = { ok: boolean; result?: { photo?: { file_id: string }[] }; description?: string };

/** Баннер: аввал file_id-и захирашуда, баъд боркунӣ аз сайт ва фиристодан ҳамчун файл (Telegram худаш URL-ро набарорад ҳам кор мекунад). */
async function sendBanner(env: Env, chat: number, lang: string, caption: string, markup: Keyboard): Promise<boolean> {
  const base = { chat_id: chat, caption, parse_mode: 'HTML', reply_markup: markup };
  const key = `botMeta/banner_${lang}`;
  const cached = await fs.get(env, key).catch(() => null);
  if (cached?.fileId && await tg(env, 'sendPhoto', { ...base, photo: String(cached.fileId) })) return true;
  try {
    const img = await fetch(appUrl(env, `bot-banner-${lang}.png`));
    if (!img.ok) throw new Error(`banner fetch ${img.status}`);
    const form = new FormData();
    for (const [k, v] of Object.entries(base)) form.append(k, typeof v === 'string' || typeof v === 'number' ? String(v) : JSON.stringify(v));
    form.append('photo', new Blob([await img.arrayBuffer()], { type: 'image/png' }), `banner-${lang}.png`);
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendPhoto`, { method: 'POST', body: form });
    const j = (await res.json()) as TgPhoto;
    if (!j.ok) throw new Error(`sendPhoto upload: ${j.description}`);
    const id = j.result?.photo?.at(-1)?.file_id;
    if (id) await fs.set(env, key, { fileId: id, updatedAt: new Date().toISOString() }).catch(() => {});
    return true;
  } catch (e) {
    console.log(`banner: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

const send = (env: Env, chat: number | string, text: string, markup?: Keyboard) =>
  tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...(markup ? { reply_markup: markup } : {}) });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const appUrl = (env: Env, query = '') => `${env.APP_URL}${query}`;

const help = (t: TFn) =>
  t("🌳 <b>Дарахти даромад</b>\n\n") +
  t("Ман дар бораи пардохтҳои қарз ёдрас мекунам ва хулосаи молиявии шуморо мефиристам.\n\n") +
  t("/start — менюи асосӣ\n") +
  t("/xulosa — хулосаи моҳ\n") +
  t("/qarzho — қарзҳо ва пардохтҳои навбатӣ\n") +
  t("/yodovari — ёдоварии имрӯз\n") +
  t("/stop — ҷудо кардани бот аз аккаунт\n\n") +
  t("Бо забони англисӣ: /summary, /debts, /reminders.\n\n") +
  t("Огоҳиномаҳо ҳар рӯз дар соати интихобшуда меоянд (пардохтҳо, хулосаҳо, орзуҳо ва ғайра). Соат ва навъҳои огоҳӣ дар ⚙️ Танзимот → 🔔 Огоҳиномаҳо.");

const notLinked = (t: TFn) =>
  t("Ин бот ҳанӯз ба аккаунти шумо пайваст нест.\n\n") +
  t("Тугмаи «🔗 Пайваст кардани аккаунт»-ро дар менюи /start пахш кунед.");

const CODE_RE = /^[A-Z2-9]{10}$/;
const LINK_TTL_MS = 15 * 60_000;

// ---------- Танзимот (дар botChats/{chat}) ----------
interface Prefs { hour: number; flags: Flags; lang?: Lang }
const HOURS = NOTIFY_HOURS;

/** Танзимот дар `users/{uid}/bot/prefs` нигоҳ дошта мешавад (барнома низ онро таҳрир мекунад). Агар нест — майдонҳои кӯҳнаи botChats. */
function legacyPrefs(c: Record<string, unknown> | null): Prefs {
  const p: Prefs = defaultPrefs();
  if (!c) return p;
  if (typeof c.hour === 'number' && HOURS.includes(c.hour)) p.hour = c.hour;
  for (const n of NOTIFY) {
    const raw = n.key === 'pay' ? c.remindOn : n.key === 'weekly' ? c.weeklyOn : c[`n_${n.key}`];
    if (raw !== undefined && raw !== null) p.flags[n.key] = raw !== '0';
  }
  return p;
}

async function loadPrefs(env: Env, c: Record<string, unknown>): Promise<Prefs> {
  const d = await fs.get(env, `users/${c.uid}/bot/prefs`);
  if (d) return prefsFromDoc(d) as Prefs;
  const p = legacyPrefs(c); // як маротиба: танзимоти кӯҳна ба ҳуҷҷати нав мегузарад (то барнома низ онро бинад)
  await fs.set(env, `users/${c.uid}/bot/prefs`, prefsToDoc(p));
  return p;
}

const seenOf = (c: Record<string, unknown> | null): Seen | null => {
  try { return typeof c?.seen === 'string' && c.seen ? (JSON.parse(c.seen) as Seen) : null; } catch { return null; }
};

/** botChats/{chat}: танҳо uid, linkedAt ва `seen` (ёддошти серверӣ). */
async function writeChat(env: Env, chat: number, c: Record<string, unknown>, seen: Seen | null) {
  const doc: Record<string, string> = { uid: String(c.uid), linkedAt: String(c.linkedAt ?? new Date().toISOString()) };
  if (typeof c.lc === 'string' && c.lc) doc.lc = c.lc; // забони охирини Telegram-и корбар (барои огоҳиномаҳо)
  if (seen) doc.seen = JSON.stringify(seen);
  await fs.set(env, `botChats/${chat}`, doc);
}

async function savePrefs(env: Env, chat: number, patch: { hour?: number; toggle?: string; lang?: Lang }): Promise<Prefs | null> {
  const c = await fs.get(env, `botChats/${chat}`);
  if (!c) return null;
  const p = await loadPrefs(env, c);
  if (patch.hour !== undefined) p.hour = patch.hour;
  if (patch.lang) p.lang = patch.lang;
  if (patch.toggle && patch.toggle in p.flags) p.flags[patch.toggle] = !p.flags[patch.toggle];
  await fs.set(env, `users/${c.uid}/bot/prefs`, prefsToDoc(p));
  return p;
}

/** Забони корбар: аз танзимоти аккаунт (агар интихоб карда бошад), баъд аз забони Telegram. */
async function resolveLang(env: Env, chat: number, code?: string): Promise<Lang> {
  const c = await fs.get(env, `botChats/${chat}`);
  if (c) {
    const d = await fs.get(env, `users/${c.uid}/bot/prefs`);
    if (d && isLang(d.lang)) return d.lang;
    if (typeof c.lc === 'string' && c.lc) return langFromCode(c.lc);
  }
  return langFromCode(code);
}

const LANG_NAMES: { id: Lang; name: string }[] = [{ id: 'tg', name: 'Тоҷикӣ' }, { id: 'ru', name: 'Русский' }, { id: 'en', name: 'English' }];

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

function settingsView(t: TFn, p: Prefs, lang: Lang): { text: string; markup: Keyboard } {
  const on = NOTIFY.filter(n => p.flags[n.key]).length;
  return {
    text:
      t("⚙️ <b>Танзимот</b>\n\n") +
      t("🕘 Соати огоҳиномаҳо: <b>{0}</b> (вақти Тоҷикистон)\n", hh(p.hour)) +
      t("🔔 Огоҳиномаҳо: <b>{0}</b> аз {1} фаъол\n\n", on, NOTIFY.length) +
      t("Ҳамаи огоҳиҳои як рӯз дар як паём меояд."),
    markup: {
      inline_keyboard: [
        HOURS.map(h => ({ text: h === p.hour ? `• ${hh(h)} •` : hh(h), callback_data: `h:${h}` })),
        [{ text: t("🔔 Огоҳиномаҳо"), callback_data: 'nt' }],
        LANG_NAMES.map(l => ({ text: l.id === lang ? `🌐 ${l.name} ✓` : l.name, callback_data: `lang:${l.id}` })),
        [{ text: t("✖️ Пӯшидан"), callback_data: 'close' }],
      ],
    },
  };
}

function notifyView(t: TFn, p: Prefs): { text: string; markup: Keyboard } {
  const rows: Button[][] = [];
  let group = '';
  for (const n of NOTIFY) {
    if (n.group !== group) { group = n.group; rows.push([{ text: `— ${t(group)} —`, callback_data: 'noop' }]); }
    rows.push([{ text: `${p.flags[n.key] ? '✅' : '⛔'} ${t(n.label)}`, callback_data: `nt:${n.key}` }]);
  }
  rows.push([{ text: t("⬅️ Танзимот"), callback_data: 'sets' }, { text: t("✖️ Пӯшидан"), callback_data: 'close' }]);
  return {
    text: t("🔔 <b>Огоҳиномаҳо</b>\n\nНавъеро пахш кунед: фаъол ✅ ё хомӯш ⛔ мешавад.\n«Ихтиёрӣ» одатан хомӯш аст."),
    markup: { inline_keyboard: rows },
  };
}

// ---------- Пайвастшавӣ ----------
async function link(env: Env, chat: number, raw: string, t: TFn, code?: string): Promise<string> {
  const lcode = raw.trim().toUpperCase();
  if (!CODE_RE.test(lcode)) return t("❌ Код нодуруст аст. Дар барнома (Профил → Telegram-бот) дубора кӯшиш кунед.");
  const doc = await fs.get(env, `botLinks/${lcode}`);
  if (!doc) return t("❌ Код ёфт нашуд ё истифода шудааст. Дар барнома коди нав гиред.");
  await fs.del(env, `botLinks/${lcode}`);
  const age = Date.now() - Date.parse(String(doc.createdAt));
  if (!(age >= -60_000 && age <= LINK_TTL_MS)) return t("⌛ Код кӯҳна шуд (15 дақиқа). Дар барнома коди нав гиред.");
  const uid = String(doc.uid);
  // як чат — як аккаунт: пайвастшавии кӯҳнаи ҳамин аккаунт иваз мешавад
  const old = await fs.get(env, `users/${uid}/bot/link`);
  if (old && String(old.chatId) !== String(chat)) await fs.del(env, `botChats/${old.chatId}`);
  const now = new Date().toISOString();
  await fs.set(env, `users/${uid}/bot/link`, { chatId: String(chat), linkedAt: now });
  await fs.set(env, `botChats/${chat}`, { uid, linkedAt: now, lc: code ?? '' });
  return t("✅ <b>Бот пайваст шуд!</b>\n\nҲар рӯз соати 09:00 дар бораи пардохтҳо ёдрас мекунам. Соатро дар /start → ⚙️ Танзимот иваз кардан мумкин аст.");
}

type StateRes = { uid: string; state: State } | { msg: string; unlinked: boolean };

async function stateOf(env: Env, chat: number, t: TFn): Promise<StateRes> {
  const NL: StateRes = { msg: notLinked(t), unlinked: true };
  const c = await fs.get(env, `botChats/${chat}`);
  if (!c) return NL;
  const uid = String(c.uid);
  const l = await fs.get(env, `users/${uid}/bot/link`);
  if (!l || String(l.chatId) !== String(chat)) { await fs.del(env, `botChats/${chat}`); return NL; }
  const state = (await fs.loadState(env, uid)) as State | null;
  if (!state) return { msg: t("⚠️ Маълумот дар сервер нест. Дар барнома ворид шавед, то синхронизатсия оғоз шавад."), unlinked: false };
  return { uid, state };
}

const isLinked = async (env: Env, chat: number) => {
  const c = await fs.get(env, `botChats/${chat}`);
  if (!c) return false;
  const l = await fs.get(env, `users/${c.uid}/bot/link`);
  return !!l && String(l.chatId) === String(chat);
};

// ---------- Воридшавӣ ба барнома тавассути бот ----------
const fresh = (d: Record<string, unknown> | null) => !!d && Date.now() - Date.parse(String(d.createdAt)) <= LOGIN_TTL_MS;

async function loginViaStart(env: Env, chat: number, code: string, fullName: string, t: TFn) {
  const d = LOGIN_RE.test(code) ? await fs.get(env, `botLogins/${code}`) : null;
  if (!d || d.status !== 'pending' || !fresh(d)) {
    return send(env, chat, t("⌛ Дархости воридшавӣ кӯҳна шудааст ё ёфт нашуд. Дар барнома «Бо Telegram идома додан»-ро аз нав пахш кунед."));
  }
  const { uid } = await resolveUid(env, chat);
  await fs.set(env, `botLogins/${code}`, { createdAt: String(d.createdAt), status: 'ok', uid, name: fullName });
  return send(env, chat, t("✅ <b>Воридшавӣ анҷом ёфт!</b>\n\nБа барнома баргардед: ворид шудан худкор тамом мешавад."),
    { inline_keyboard: [[{ text: t("🌳 Кушодани барнома"), web_app: { url: appUrl(env) } }]] });
}

// ---------- Менюи асосӣ ----------
function menu(t: TFn, env: Env, linked: boolean): Keyboard {
  return {
    inline_keyboard: [
      [{ text: t("🌳 Кушодани барнома"), web_app: { url: appUrl(env) } }],
      [{ text: t("📊 Хулоса"), callback_data: 'sum' }, { text: t("💳 Қарзҳо"), callback_data: 'debts' }],
      [{ text: t("⏰ Ёдоварӣ"), callback_data: 'rem' }, { text: t("⚙️ Танзимот"), callback_data: 'set' }],
      [linked
        ? { text: t("✅ Аккаунт пайваст аст"), callback_data: 'linked' }
        : { text: t("🔗 Пайваст кардани аккаунт"), callback_data: 'link' }],
      ...(linked ? [[{ text: t("🔄 Иваз кардани аккаунт"), callback_data: 'swa' }]] : []),
      [{ text: t("❓ Кӯмак"), callback_data: 'help' }],
    ],
  };
}

async function sendMenu(env: Env, chat: number, name: string, lang: Lang, t: TFn) {
  const caption =
    t("👋 Салом, <b>{0}</b>!\n\n", esc(name || t('дӯст'))) +
    t("🌳 Ман ёрдамчии барномаи <b>«Дарахти даромад»</b> ҳастам: даромад, хароҷот ва қарзҳои шуморо назорат мекунам, ") +
    t("дар бораи пардохтҳо ёдрас менамоям ва хулосаи молиявиро мефиристам.\n\n") +
    t("Аз менюи поён интихоб кунед 👇");
  const markup = menu(t, env, await isLinked(env, chat));
  if (!(await sendBanner(env, chat, lang, caption, markup))) await send(env, chat, caption, markup);
}

const linkHelp = (t: TFn, env: Env): [string, Keyboard] => [
  t("🔗 <b>Пайваст кардани аккаунт</b>\n\n") +
  t("Тугмаи поёнро пахш кунед: барнома кушода мешавад, ба ҳисоби худ ворид шавед (агар ворид нашудаед) ва «Telegram-бот»-ро дар Профил интихоб кунед. ") +
  t("Бот худаш пайваст мешавад."),
  { inline_keyboard: [[{ text: t("🌳 Кушодани барнома"), web_app: { url: appUrl(env, '?tg=link') } }]] },
];

async function report(env: Env, chat: number, kind: 'sum' | 'debts' | 'rem', t: TFn) {
  const r = await stateOf(env, chat, t);
  if ('msg' in r) return send(env, chat, r.msg, r.unlinked ? { inline_keyboard: linkHelp(t, env)[1].inline_keyboard } : undefined);
  const today = dateOf(env.TIMEZONE ?? 'Asia/Dushanbe');
  const cu = (x: string) => swapUnit(x, r.state.currency ?? 'TJS');
  if (kind === 'sum') return send(env, chat, cu(summaryText(t, r.state, today)));
  if (kind === 'debts') return send(env, chat, cu(debtsText(t, r.state, today)));
  return send(env, chat, cu(reminderText(t, r.state, today) ?? t("✅ Имрӯз ва дар 3 рӯзи наздик пардохт нест.")));
}

async function unlinkChat(env: Env, chat: number) {
  const c = await fs.get(env, `botChats/${chat}`);
  if (c) { await fs.del(env, `users/${c.uid}/bot/link`); await fs.del(env, `botChats/${chat}`); }
}

const switchAsk = (env: Env, chat: number, t: TFn) => send(env, chat,
  t("🔄 <b>Иваз кардани аккаунт</b>\n\nБот аз аккаунти ҷорӣ ҷудо мешавад. Маълумоти шумо дар сервер мемонад."),
  { inline_keyboard: [[{ text: t("✅ Ҳа, иваз кардан"), callback_data: 'swy' }], [{ text: t("✖️ Бекор кардан"), callback_data: 'close' }]] });

async function onMessage(env: Env, chat: number, text: string, name: string, fullName: string, code?: string) {
  const lang = await resolveLang(env, chat, code);
  const t = makeT(lang);
  const [cmdRaw, ...rest] = text.trim().split(/\s+/);
  const cmd = cmdRaw.split('@')[0].toLowerCase();

  if (cmd === '/start') {
    if (rest[0]?.startsWith('login_')) return loginViaStart(env, chat, rest[0].slice(6), fullName, t);
    if (rest[0]) await send(env, chat, await link(env, chat, rest[0], t, code));
    return sendMenu(env, chat, name, lang, t);
  }
  if (cmd === '/menu') return sendMenu(env, chat, name, lang, t);
  if (cmd === '/id') return send(env, chat, `ID: <code>${chat}</code>`);
  if (cmd === '/help') return send(env, chat, help(t));
  if (!cmd.startsWith('/') && CODE_RE.test(cmdRaw.toUpperCase()) && rest.length === 0) return send(env, chat, await link(env, chat, cmdRaw, t, code));

  if (cmd === '/stop') {
    await unlinkChat(env, chat);
    return send(env, chat, t("👋 Бот аз аккаунт ҷудо шуд. Барои пайвастани дубора /start-ро пахш кунед."));
  }
  if (cmd === '/switch' || cmd === '/akkaunt') return switchAsk(env, chat, t);
  if (cmd === '/xulosa' || cmd === '/summary') return report(env, chat, 'sum', t);
  if (cmd === '/qarzho' || cmd === '/debts') return report(env, chat, 'debts', t);
  if (cmd === '/yodovari' || cmd === '/reminders') return report(env, chat, 'rem', t);
  return send(env, chat, t("Фармон нофаҳмо аст. /help ё /start"));
}

async function onCallback(env: Env, q: NonNullable<Update['callback_query']>) {
  const data = q.data ?? '';
  const chat = q.message?.chat.id;
  const mid = q.message?.message_id;
  const answer = (text?: string) => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, ...(text ? { text } : {}) });
  if (!chat) return answer();
  const lang = await resolveLang(env, chat, q.from.language_code);
  let t = makeT(lang);

  if (data === 'linked') return answer(t("Аккаунт пайваст аст ✅"));
  await answer();
  if (data === 'sum' || data === 'debts' || data === 'rem') return report(env, chat, data, t);
  if (data === 'help') return send(env, chat, help(t));
  if (data === 'link') {
    if (await isLinked(env, chat)) return send(env, chat, t("✅ Аккаунт аллакай пайваст аст."));
    const [text, markup] = linkHelp(t, env);
    return send(env, chat, text, markup);
  }
  if (data === 'swa') return switchAsk(env, chat, t);
  if (data === 'swy') {
    await unlinkChat(env, chat);
    if (mid) await tg(env, 'deleteMessage', { chat_id: chat, message_id: mid });
    return send(env, chat,
      t("✅ Бот ҷудо шуд. Акнун:\n\n1️⃣ Дар барнома: Танзимот → «Баромад аз аккаунт».\n2️⃣ Ба аккаунти дигар ворид шавед.\n3️⃣ Дар Профил «Telegram-бот»-ро интихоб кунед: бот ба аккаунти нав пайваст мешавад."),
      { inline_keyboard: [[{ text: t("🌳 Кушодани барнома"), web_app: { url: appUrl(env, '?tg=link') } }]] });
  }
  if (data === 'close') return mid ? tg(env, 'deleteMessage', { chat_id: chat, message_id: mid }) : undefined;

  if (data === 'noop') return;
  if (data === 'set' || data === 'sets' || data === 'nt' || data.startsWith('nt:') || data.startsWith('h:') || data.startsWith('lang:')) {
    const c = await fs.get(env, `botChats/${chat}`);
    if (!c) return send(env, chat, notLinked(t), { inline_keyboard: linkHelp(t, env)[1].inline_keyboard });
    let p = await loadPrefs(env, c);
    let cur: Lang = p.lang ?? lang;
    if (data.startsWith('nt:')) p = (await savePrefs(env, chat, { toggle: data.slice(3) })) ?? p;
    else if (data.startsWith('h:')) {
      const h = Number(data.slice(2));
      if (HOURS.includes(h)) p = (await savePrefs(env, chat, { hour: h })) ?? p;
    } else if (data.startsWith('lang:')) {
      const l = data.slice(5);
      if (isLang(l)) { p = (await savePrefs(env, chat, { lang: l })) ?? p; cur = l; t = makeT(l); }
    }
    const v = data === 'nt' || data.startsWith('nt:') ? notifyView(t, p) : settingsView(t, p, cur);
    if (data === 'set' || !mid) return send(env, chat, v.text, v.markup);
    return tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: v.text, parse_mode: 'HTML', reply_markup: v.markup });
  }
}

// ---------- Ёдоварии ҳаррӯза (cron ҳар соат) ----------
async function cleanup(env: Env) {
  for (const col of ['botLogins', 'botLinks']) {
    for (const d of await fs.list(env, col)) {
      if (Date.now() - Date.parse(String(d.data.createdAt)) > 60 * 60_000) await fs.del(env, `${col}/${d.id}`);
    }
  }
}

async function daily(env: Env, when = new Date()) {
  const tz = env.TIMEZONE ?? 'Asia/Dushanbe';
  const today = dateOf(tz, when);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(when));
  const dayOfWeek = new Date(`${today}T12:00:00Z`).getUTCDay();
  const dayOfMonth = Number(today.slice(8, 10));
  await cleanup(env).catch(e => console.log(`cleanup: ${e instanceof Error ? e.message : e}`));
  for (const c of await fs.list(env, 'botChats')) {
    try {
      const p = await loadPrefs(env, c.data);
      if (p.hour !== hour) continue;
      const chat = Number(c.id);
      const t = makeT(p.lang ?? langFromCode(typeof c.data.lc === 'string' ? c.data.lc : undefined));
      const r = await stateOf(env, chat, t);
      if ('msg' in r) continue;

      const cu = (x: string) => swapUnit(x, r.state.currency ?? 'TJS');
      const rem = reminderText(t, r.state, today, { pay: p.flags.pay, overdue: p.flags.overdue });
      if (rem) await send(env, chat, cu(rem));

      const prevSeen = seenOf(c.data);
      const d = buildDigest(t, r.state, prevSeen, p.flags, today);
      if (d.lines.length) await send(env, chat, cu(t("🔔 <b>Огоҳиномаҳои имрӯз</b>\n\n{0}", d.lines.join('\n\n'))));
      await writeChat(env, chat, c.data, d.seen);

      if (dayOfWeek === 1 && p.flags.weekly) await send(env, chat, cu(summaryText(t, r.state, today)));
      if (dayOfMonth === 1 && p.flags.monthly) {
        const last = new Date(`${today}T12:00:00Z`);
        last.setUTCDate(0); // охирин рӯзи моҳи гузашта
        await send(env, chat, cu(summaryText(t, r.state, last.toISOString().slice(0, 10))));
      }
    } catch (e) {
      console.log(`daily ${c.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

const ALLOWED_ORIGINS = ['https://yunusovshahriyor.github.io', 'http://localhost:4173', 'http://localhost:5173'];

const FB_HITS = new Map<string, number[]>();

type Tech = { mode?: string; currency?: string; screen?: string; standalone?: boolean; telegram?: boolean; online?: boolean; ua?: string; page?: string; errors?: string[] };

/** Намуди дастгоҳ ва браузер аз user-agent: «Android 10 · Chrome 154». */
function deviceOf(ua = ''): string {
  const os = /Android ([\d.]+)/.exec(ua)?.[0] ?? (/iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '?');
  const br = /Edg\/(\d+)/.exec(ua) ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}` : /(?:Chrome|CriOS)\/(\d+)/.exec(ua) ? `Chrome ${/(?:Chrome|CriOS)\/(\d+)/.exec(ua)![1]}` : /Firefox\/(\d+)/.exec(ua) ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}` : /Version\/(\d+).*Safari/.exec(ua) ? `Safari ${/Version\/(\d+)/.exec(ua)![1]}` : '';
  return [os, br].filter(Boolean).join(' · ');
}

/** Хабари админ: намуд, матн, тамос ва маълумоти техникӣ дар шакли хонданбоб. */
function feedbackMsg(env: Env, f: { type: string; text: string; contact: string; uid: string; lang: string; id: string; tech: Tech | null }): string {
  const kinds: Record<string, [string, string]> = { bug: ['🐞', 'Хато'], idea: ['💡', 'Пешниҳод'], question: ['💬', 'Савол'] };
  const [icon, name] = kinds[f.type] ?? kinds.bug;
  const when = new Intl.DateTimeFormat('ru-RU', { timeZone: env.TIMEZONE ?? 'Asia/Dushanbe', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
  const tc = f.tech;
  const lines = [
    `${icon} <b>${name}</b>  ·  ${esc(f.lang.toUpperCase() || '—')}`,
    '',
    `<blockquote>${esc(f.text)}</blockquote>`,
    '',
    `📨 <b>Тамос:</b> ${f.contact ? esc(f.contact) : '<i>нишон нашудааст</i>'}`,
    `👤 <b>Корбар:</b> ${f.uid ? `<code>${esc(f.uid)}</code>` : '<i>воридшуда нест</i>'}`,
  ];
  if (tc) {
    lines.push(
      `📱 <b>Дастгоҳ:</b> ${esc(deviceOf(tc.ua))}${tc.screen ? ` · ${esc(tc.screen.replace('x', '×'))}` : ''}`,
      `🧩 <b>Барнома:</b> ${tc.mode === 'free' ? 'ба тарзи худам' : 'системаи Давлатов'} · ${esc(tc.currency ?? 'TJS')}${tc.standalone ? ' · насбшуда' : ' · дар браузер'}${tc.telegram ? ' · Telegram' : ''}${tc.online === false ? ' · офлайн' : ''}`,
    );
    lines.push(tc.errors?.length ? `⚠️ <b>Хатоҳо:</b>\n<pre>${esc(tc.errors.join('\n').slice(0, 700))}</pre>` : '✅ <b>Хатои техникӣ:</b> нест');
  }
  lines.push('', `🕐 ${when} · <code>${esc(f.id)}</code>`);
  return lines.join('\n').slice(0, 4000);
}

async function api(req: Request, env: Env, path: string): Promise<Response> {
  const origin = req.headers.get('origin') ?? '';
  const cors: Record<string, string> = ALLOWED_ORIGINS.includes(origin)
    ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' }
    : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as { initData?: string; code?: string } & Record<string, unknown>;

    // Хабар дар бораи хато / пешниҳод / савол
    if (path === '/feedback') {
      const ip = req.headers.get('cf-connecting-ip') ?? 'x';
      const now = Date.now();
      const hits = (FB_HITS.get(ip) ?? []).filter(x => now - x < 60_000);
      if (hits.length >= 3) return json({ error: 'rate' }, 429);
      FB_HITS.set(ip, [...hits, now]);
      const text = String(body.text ?? '').trim().slice(0, 1000);
      if (text.length < 10) return json({ error: 'short' }, 400);
      const type = ['bug', 'idea', 'question'].includes(String(body.type)) ? String(body.type) : 'bug';
      const contact = String(body.contact ?? '').slice(0, 120);
      const uid = String(body.uid ?? '').slice(0, 60);
      const lang = String(body.lang ?? '').slice(0, 5);
      const tech = body.tech ? JSON.stringify(body.tech).slice(0, 2500) : '';
      const id = `${now}_${Math.random().toString(36).slice(2, 8)}`;
      await fs.set(env, `feedback/${id}`, { createdAt: new Date(now).toISOString(), type, text, contact, uid, lang, tech });
      if (env.ADMIN_CHAT_ID) {
        await send(env, env.ADMIN_CHAT_ID, feedbackMsg(env, { type, text, contact, uid, lang, id, tech: (body.tech ?? null) as Tech | null })).catch(() => {});
      }
      return json({ ok: true });
    }

    // Mini App: воридшавии худкор бо initData-и имзошудаи Telegram
    if (path === '/auth/telegram') {
      const who = await verifyInitData(env, String(body.initData ?? ''));
      if (!who) return json({ error: 'invalid' }, 401);
      const { uid, isNew } = await resolveUid(env, who.id);
      return json({ token: await customToken(env, uid), uid, name: who.name, isNew });
    }

    // Браузер: код месозем, корбар дар бот тасдиқ мекунад, барнома мепурсад
    if (path === '/auth/start') {
      const code = newCode();
      await fs.set(env, `botLogins/${code}`, { createdAt: new Date().toISOString(), status: 'pending' });
      // Mini App (агар сабт шуда бошад): Telegram фавран онро мекушояд, «Start» лозим нест
      const mini = !!env.MINIAPP_SHORTNAME;
      const url = mini
        ? `https://t.me/${env.BOT_USERNAME}/${env.MINIAPP_SHORTNAME}?startapp=login_${code}`
        : `https://t.me/${env.BOT_USERNAME}?start=login_${code}`;
      return json({ code, url, mini });
    }
    // Mini App воридшавиро анҷом медиҳад: initData-и имзошуда + код
    if (path === '/auth/complete') {
      const who = await verifyInitData(env, String(body.initData ?? ''));
      if (!who) return json({ error: 'invalid' }, 401);
      const code = String(body.code ?? '');
      const d = LOGIN_RE.test(code) ? await fs.get(env, `botLogins/${code}`) : null;
      if (!d || d.status !== 'pending' || !fresh(d)) return json({ status: 'gone' });
      const { uid } = await resolveUid(env, who.id);
      await fs.set(env, `botLogins/${code}`, { createdAt: String(d.createdAt), status: 'ok', uid, name: who.name });
      return json({ status: 'ok' });
    }
    if (path === '/auth/poll') {
      const code = String(body.code ?? '');
      const d = LOGIN_RE.test(code) ? await fs.get(env, `botLogins/${code}`) : null;
      if (!d || !fresh(d)) return json({ status: 'gone' });
      if (d.status !== 'ok') return json({ status: 'pending' });
      await fs.del(env, `botLogins/${code}`); // як маротиба
      return json({ status: 'ok', token: await customToken(env, String(d.uid)), name: String(d.name ?? '') });
    }
    return json({ error: 'not found' }, 404);
  } catch (e) {
    console.log(`api ${path}: ${e instanceof Error ? e.stack : e}`);
    return json({ error: 'server' }, 500);
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/auth/') || url.pathname === '/feedback') return api(req, env, url.pathname);
    if (req.method !== 'POST' || url.pathname !== '/webhook') return new Response('Дарахти даромад — бот', { status: 200 });
    if (req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
    const u = (await req.json()) as Update;
    const m = u.message;
    const q = u.callback_query;
    if (m?.text && m.chat.type === 'private') {
      ctx.waitUntil(onMessage(env, m.chat.id, m.text, m.from?.first_name ?? '', [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' '), m.from?.language_code).catch(e => {
        console.log(`message: ${e instanceof Error ? e.stack : e}`);
        return send(env, m.chat.id, makeT(langFromCode(m.from?.language_code))("⚠️ Хатои муваққатӣ. Баъдтар кӯшиш кунед."));
      }));
    } else if (q && q.message?.chat.type === 'private') {
      ctx.waitUntil(onCallback(env, q).catch(e => {
        console.log(`callback: ${e instanceof Error ? e.stack : e}`);
        return send(env, q.message!.chat.id, makeT(langFromCode(q.from.language_code))("⚠️ Хатои муваққатӣ. Баъдтар кӯшиш кунед."));
      }));
    }
    return new Response('ok');
  },

  async scheduled(c: ScheduledController, env: Env, ctx: Ctx) {
    ctx.waitUntil(daily(env, new Date(c.scheduledTime)));
  },
};
