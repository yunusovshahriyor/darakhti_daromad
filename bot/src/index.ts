import { dateOf, debtsText, reminderText, summaryText } from './report';
import { NOTIFY, buildDigest } from './digest';
import { NOTIFY_HOURS, defaultPrefs, prefsFromDoc, prefsToDoc } from '../../src/notify';
import type { Flags, Seen } from './digest';
import * as fs from './firestore';
import { customToken } from './firestore';
import type { Env } from './firestore';
import type { State } from '../../src/types';
import { LOGIN_RE, LOGIN_TTL_MS, newCode, resolveUid, verifyInitData } from './auth';

interface TgUser { id?: number; first_name?: string; last_name?: string }
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

const send = (env: Env, chat: number | string, text: string, markup?: Keyboard) =>
  tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...(markup ? { reply_markup: markup } : {}) });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const appUrl = (env: Env, query = '') => `${env.APP_URL}${query}`;

const HELP =
  '🌳 <b>Дарахти даромад</b>\n\n' +
  'Ман дар бораи пардохтҳои қарз ёдрас мекунам ва хулосаи молиявии шуморо мефиристам.\n\n' +
  '/start — менюи асосӣ\n' +
  '/xulosa — хулосаи моҳ\n' +
  '/qarzho — қарзҳо ва пардохтҳои навбатӣ\n' +
  '/yodovari — ёдоварии имрӯз\n' +
  '/stop — ҷудо кардани бот аз аккаунт\n\n' +
  'Бо забони англисӣ: /summary, /debts, /reminders.\n\n' +
  'Огоҳиномаҳо ҳар рӯз дар соати интихобшуда меоянд (пардохтҳо, хулосаҳо, орзуҳо ва ғайра). Соат ва навъҳои огоҳӣ дар ⚙️ Танзимот → 🔔 Огоҳиномаҳо.';

const NOT_LINKED =
  'Ин бот ҳанӯз ба аккаунти шумо пайваст нест.\n\n' +
  'Тугмаи «🔗 Пайваст кардани аккаунт»-ро дар менюи /start пахш кунед.';

const CODE_RE = /^[A-Z2-9]{10}$/;
const LINK_TTL_MS = 15 * 60_000;

// ---------- Танзимот (дар botChats/{chat}) ----------
interface Prefs { hour: number; flags: Flags }
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
  if (d) return prefsFromDoc(d);
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
  if (seen) doc.seen = JSON.stringify(seen);
  await fs.set(env, `botChats/${chat}`, doc);
}

async function savePrefs(env: Env, chat: number, patch: { hour?: number; toggle?: string }): Promise<Prefs | null> {
  const c = await fs.get(env, `botChats/${chat}`);
  if (!c) return null;
  const p = await loadPrefs(env, c);
  if (patch.hour !== undefined) p.hour = patch.hour;
  if (patch.toggle && patch.toggle in p.flags) p.flags[patch.toggle] = !p.flags[patch.toggle];
  await fs.set(env, `users/${c.uid}/bot/prefs`, prefsToDoc(p));
  return p;
}

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

function settingsView(p: Prefs): { text: string; markup: Keyboard } {
  const on = NOTIFY.filter(n => p.flags[n.key]).length;
  return {
    text:
      '⚙️ <b>Танзимот</b>\n\n' +
      `🕘 Соати огоҳиномаҳо: <b>${hh(p.hour)}</b> (вақти Тоҷикистон)\n` +
      `🔔 Огоҳиномаҳо: <b>${on}</b> аз ${NOTIFY.length} фаъол\n\n` +
      'Ҳамаи огоҳиҳои як рӯз дар як паём меояд.',
    markup: {
      inline_keyboard: [
        HOURS.map(h => ({ text: h === p.hour ? `• ${hh(h)} •` : hh(h), callback_data: `h:${h}` })),
        [{ text: '🔔 Огоҳиномаҳо', callback_data: 'nt' }],
        [{ text: '✖️ Пӯшидан', callback_data: 'close' }],
      ],
    },
  };
}

function notifyView(p: Prefs): { text: string; markup: Keyboard } {
  const rows: Button[][] = [];
  let group = '';
  for (const n of NOTIFY) {
    if (n.group !== group) { group = n.group; rows.push([{ text: `— ${group} —`, callback_data: 'noop' }]); }
    rows.push([{ text: `${p.flags[n.key] ? '✅' : '⛔'} ${n.label}`, callback_data: `nt:${n.key}` }]);
  }
  rows.push([{ text: '⬅️ Танзимот', callback_data: 'sets' }, { text: '✖️ Пӯшидан', callback_data: 'close' }]);
  return {
    text: '🔔 <b>Огоҳиномаҳо</b>\n\nНавъеро пахш кунед: фаъол ✅ ё хомӯш ⛔ мешавад.\n«Ихтиёрӣ» одатан хомӯш аст.',
    markup: { inline_keyboard: rows },
  };
}

// ---------- Пайвастшавӣ ----------
async function link(env: Env, chat: number, raw: string): Promise<string> {
  const code = raw.trim().toUpperCase();
  if (!CODE_RE.test(code)) return '❌ Код нодуруст аст. Дар барнома (Профил → Telegram-бот) дубора кӯшиш кунед.';
  const doc = await fs.get(env, `botLinks/${code}`);
  if (!doc) return '❌ Код ёфт нашуд ё истифода шудааст. Дар барнома коди нав гиред.';
  await fs.del(env, `botLinks/${code}`);
  const age = Date.now() - Date.parse(String(doc.createdAt));
  if (!(age >= -60_000 && age <= LINK_TTL_MS)) return '⌛ Код кӯҳна шуд (15 дақиқа). Дар барнома коди нав гиред.';
  const uid = String(doc.uid);
  // як чат — як аккаунт: пайвастшавии кӯҳнаи ҳамин аккаунт иваз мешавад
  const old = await fs.get(env, `users/${uid}/bot/link`);
  if (old && String(old.chatId) !== String(chat)) await fs.del(env, `botChats/${old.chatId}`);
  const now = new Date().toISOString();
  await fs.set(env, `users/${uid}/bot/link`, { chatId: String(chat), linkedAt: now });
  await fs.set(env, `botChats/${chat}`, { uid, linkedAt: now });
  return '✅ <b>Бот пайваст шуд!</b>\n\nҲар рӯз соати 09:00 дар бораи пардохтҳо ёдрас мекунам. Соатро дар /start → ⚙️ Танзимот иваз кардан мумкин аст.';
}

async function stateOf(env: Env, chat: number): Promise<{ uid: string; state: State } | string> {
  const c = await fs.get(env, `botChats/${chat}`);
  if (!c) return NOT_LINKED;
  const uid = String(c.uid);
  const l = await fs.get(env, `users/${uid}/bot/link`);
  if (!l || String(l.chatId) !== String(chat)) { await fs.del(env, `botChats/${chat}`); return NOT_LINKED; }
  const state = (await fs.loadState(env, uid)) as State | null;
  if (!state) return '⚠️ Маълумот дар сервер нест. Дар барнома ворид шавед, то синхронизатсия оғоз шавад.';
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

async function loginViaStart(env: Env, chat: number, code: string, fullName: string) {
  const d = LOGIN_RE.test(code) ? await fs.get(env, `botLogins/${code}`) : null;
  if (!d || d.status !== 'pending' || !fresh(d)) {
    return send(env, chat, '⌛ Дархости воридшавӣ кӯҳна шудааст ё ёфт нашуд. Дар барнома «Бо Telegram идома додан»-ро аз нав пахш кунед.');
  }
  const { uid } = await resolveUid(env, chat);
  await fs.set(env, `botLogins/${code}`, { createdAt: String(d.createdAt), status: 'ok', uid, name: fullName });
  return send(env, chat, '✅ <b>Воридшавӣ анҷом ёфт!</b>\n\nБа барнома баргардед: ворид шудан худкор тамом мешавад.',
    { inline_keyboard: [[{ text: '🌳 Кушодани барнома', web_app: { url: appUrl(env) } }]] });
}

// ---------- Менюи асосӣ ----------
function menu(env: Env, linked: boolean): Keyboard {
  return {
    inline_keyboard: [
      [{ text: '🌳 Кушодани барнома', web_app: { url: appUrl(env) } }],
      [{ text: '📊 Хулоса', callback_data: 'sum' }, { text: '💳 Қарзҳо', callback_data: 'debts' }],
      [{ text: '⏰ Ёдоварӣ', callback_data: 'rem' }, { text: '⚙️ Танзимот', callback_data: 'set' }],
      [linked
        ? { text: '✅ Аккаунт пайваст аст', callback_data: 'linked' }
        : { text: '🔗 Пайваст кардани аккаунт', callback_data: 'link' }],
      [{ text: '❓ Кӯмак', callback_data: 'help' }],
    ],
  };
}

async function sendMenu(env: Env, chat: number, name: string) {
  const caption =
    `👋 Салом, <b>${esc(name || 'дӯст')}</b>!\n\n` +
    '🌳 Ман ёрдамчии барномаи <b>«Дарахти даромад»</b> ҳастам: даромад, хароҷот ва қарзҳои шуморо назорат мекунам, ' +
    'дар бораи пардохтҳо ёдрас менамоям ва хулосаи молиявиро мефиристам.\n\n' +
    'Аз менюи поён интихоб кунед 👇';
  const markup = menu(env, await isLinked(env, chat));
  const ok = await tg(env, 'sendPhoto', { chat_id: chat, photo: appUrl(env, 'bot-banner.png'), caption, parse_mode: 'HTML', reply_markup: markup });
  if (!ok) await send(env, chat, caption, markup);
}

const linkHelp = (env: Env): [string, Keyboard] => [
  '🔗 <b>Пайваст кардани аккаунт</b>\n\n' +
  'Тугмаи поёнро пахш кунед: барнома кушода мешавад, ба ҳисоби худ ворид шавед (агар ворид нашудаед) ва «Telegram-бот»-ро дар Профил интихоб кунед. ' +
  'Бот худаш пайваст мешавад.',
  { inline_keyboard: [[{ text: '🌳 Кушодани барнома', web_app: { url: appUrl(env, '?tg=link') } }]] },
];

async function report(env: Env, chat: number, kind: 'sum' | 'debts' | 'rem') {
  const r = await stateOf(env, chat);
  if (typeof r === 'string') return send(env, chat, r, r === NOT_LINKED ? { inline_keyboard: linkHelp(env)[1].inline_keyboard } : undefined);
  const today = dateOf(env.TIMEZONE ?? 'Asia/Dushanbe');
  if (kind === 'sum') return send(env, chat, summaryText(r.state, today));
  if (kind === 'debts') return send(env, chat, debtsText(r.state, today));
  return send(env, chat, reminderText(r.state, today) ?? '✅ Имрӯз ва дар 3 рӯзи наздик пардохт нест.');
}

async function onMessage(env: Env, chat: number, text: string, name: string, fullName: string) {
  const [cmdRaw, ...rest] = text.trim().split(/\s+/);
  const cmd = cmdRaw.split('@')[0].toLowerCase();

  if (cmd === '/start') {
    if (rest[0]?.startsWith('login_')) return loginViaStart(env, chat, rest[0].slice(6), fullName);
    if (rest[0]) await send(env, chat, await link(env, chat, rest[0]));
    return sendMenu(env, chat, name);
  }
  if (cmd === '/menu') return sendMenu(env, chat, name);
  if (cmd === '/help') return send(env, chat, HELP);
  if (!cmd.startsWith('/') && CODE_RE.test(cmdRaw.toUpperCase()) && rest.length === 0) return send(env, chat, await link(env, chat, cmdRaw));

  if (cmd === '/stop') {
    const c = await fs.get(env, `botChats/${chat}`);
    if (c) { await fs.del(env, `users/${c.uid}/bot/link`); await fs.del(env, `botChats/${chat}`); }
    return send(env, chat, '👋 Бот аз аккаунт ҷудо шуд. Барои пайвастани дубора /start-ро пахш кунед.');
  }
  if (cmd === '/xulosa' || cmd === '/summary') return report(env, chat, 'sum');
  if (cmd === '/qarzho' || cmd === '/debts') return report(env, chat, 'debts');
  if (cmd === '/yodovari' || cmd === '/reminders') return report(env, chat, 'rem');
  return send(env, chat, 'Фармон нофаҳмо аст. /help ё /start');
}

async function onCallback(env: Env, q: NonNullable<Update['callback_query']>) {
  const data = q.data ?? '';
  const chat = q.message?.chat.id;
  const mid = q.message?.message_id;
  const answer = (text?: string) => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, ...(text ? { text } : {}) });
  if (!chat) return answer();

  if (data === 'linked') return answer('Аккаунт пайваст аст ✅');
  await answer();
  if (data === 'sum' || data === 'debts' || data === 'rem') return report(env, chat, data);
  if (data === 'help') return send(env, chat, HELP);
  if (data === 'link') {
    if (await isLinked(env, chat)) return send(env, chat, '✅ Аккаунт аллакай пайваст аст.');
    const [text, markup] = linkHelp(env);
    return send(env, chat, text, markup);
  }
  if (data === 'close') return mid ? tg(env, 'deleteMessage', { chat_id: chat, message_id: mid }) : undefined;

  if (data === 'noop') return;
  if (data === 'set' || data === 'sets' || data === 'nt' || data.startsWith('nt:') || data.startsWith('h:')) {
    const c = await fs.get(env, `botChats/${chat}`);
    if (!c) return send(env, chat, NOT_LINKED, { inline_keyboard: linkHelp(env)[1].inline_keyboard });
    let p = await loadPrefs(env, c);
    if (data.startsWith('nt:')) p = (await savePrefs(env, chat, { toggle: data.slice(3) })) ?? p;
    else if (data.startsWith('h:')) {
      const h = Number(data.slice(2));
      if (HOURS.includes(h)) p = (await savePrefs(env, chat, { hour: h })) ?? p;
    }
    const v = data === 'nt' || data.startsWith('nt:') ? notifyView(p) : settingsView(p);
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
      const r = await stateOf(env, chat);
      if (typeof r === 'string') continue;

      const rem = reminderText(r.state, today, { pay: p.flags.pay, overdue: p.flags.overdue });
      if (rem) await send(env, chat, rem);

      const prevSeen = seenOf(c.data);
      const d = buildDigest(r.state, prevSeen, p.flags, today);
      if (d.lines.length) await send(env, chat, `🔔 <b>Огоҳиномаҳои имрӯз</b>\n\n${d.lines.join('\n\n')}`);
      await writeChat(env, chat, c.data, d.seen);

      if (dayOfWeek === 1 && p.flags.weekly) await send(env, chat, summaryText(r.state, today));
      if (dayOfMonth === 1 && p.flags.monthly) {
        const last = new Date(`${today}T12:00:00Z`);
        last.setUTCDate(0); // охирин рӯзи моҳи гузашта
        await send(env, chat, summaryText(r.state, last.toISOString().slice(0, 10)));
      }
    } catch (e) {
      console.log(`daily ${c.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

const ALLOWED_ORIGINS = ['https://yunusovshahriyor.github.io', 'http://localhost:4173', 'http://localhost:5173'];

async function api(req: Request, env: Env, path: string): Promise<Response> {
  const origin = req.headers.get('origin') ?? '';
  const cors: Record<string, string> = ALLOWED_ORIGINS.includes(origin)
    ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' }
    : {};
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    const body = (await req.json().catch(() => ({}))) as { initData?: string; code?: string };

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
    if (url.pathname.startsWith('/auth/')) return api(req, env, url.pathname);
    if (req.method !== 'POST' || url.pathname !== '/webhook') return new Response('Дарахти даромад — бот', { status: 200 });
    if (req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
    const u = (await req.json()) as Update;
    const m = u.message;
    const q = u.callback_query;
    if (m?.text && m.chat.type === 'private') {
      ctx.waitUntil(onMessage(env, m.chat.id, m.text, m.from?.first_name ?? '', [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ')).catch(e => {
        console.log(`message: ${e instanceof Error ? e.stack : e}`);
        return send(env, m.chat.id, '⚠️ Хатои муваққатӣ. Баъдтар кӯшиш кунед.');
      }));
    } else if (q && q.message?.chat.type === 'private') {
      ctx.waitUntil(onCallback(env, q).catch(e => {
        console.log(`callback: ${e instanceof Error ? e.stack : e}`);
        return send(env, q.message!.chat.id, '⚠️ Хатои муваққатӣ. Баъдтар кӯшиш кунед.');
      }));
    }
    return new Response('ok');
  },

  async scheduled(c: ScheduledController, env: Env, ctx: Ctx) {
    ctx.waitUntil(daily(env, new Date(c.scheduledTime)));
  },
};
