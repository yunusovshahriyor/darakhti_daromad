import { dateOf, debtsText, reminderText, summaryText } from './report';
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
  'Ёдоварӣ ҳар рӯз дар соати интихобшуда меояд (имрӯз, пагоҳ, пас аз 3 рӯз ва пардохтҳои гузашта). Соат ва хулосаи ҳафтаина дар ⚙️ Танзимот.';

const NOT_LINKED =
  'Ин бот ҳанӯз ба аккаунти шумо пайваст нест.\n\n' +
  'Тугмаи «🔗 Пайваст кардани аккаунт»-ро дар менюи /start пахш кунед.';

const CODE_RE = /^[A-Z2-9]{10}$/;
const LINK_TTL_MS = 15 * 60_000;

// ---------- Танзимот (дар botChats/{chat}) ----------
interface Prefs { remindOn: boolean; hour: number; weeklyOn: boolean }
const HOURS = [7, 9, 12, 18, 21];

const prefsOf = (c: Record<string, unknown> | null): Prefs => ({
  remindOn: c?.remindOn !== '0',
  hour: typeof c?.hour === 'number' ? c.hour : 9,
  weeklyOn: c?.weeklyOn !== '0',
});

async function savePrefs(env: Env, chat: number, patch: Partial<Prefs>): Promise<Prefs | null> {
  const c = await fs.get(env, `botChats/${chat}`);
  if (!c) return null;
  const p = { ...prefsOf(c), ...patch };
  await fs.set(env, `botChats/${chat}`, {
    uid: String(c.uid),
    linkedAt: String(c.linkedAt ?? new Date().toISOString()),
    remindOn: p.remindOn ? '1' : '0',
    hour: p.hour,
    weeklyOn: p.weeklyOn ? '1' : '0',
  });
  return p;
}

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const onoff = (v: boolean) => (v ? 'фаъол ✅' : 'хомӯш ⛔');

function settingsView(p: Prefs): { text: string; markup: Keyboard } {
  return {
    text:
      '⚙️ <b>Танзимот</b>\n\n' +
      `⏰ Ёдоварии пардохтҳо: ${onoff(p.remindOn)}\n` +
      `🕘 Соати ёдоварӣ: <b>${hh(p.hour)}</b> (вақти Тоҷикистон)\n` +
      `📊 Хулосаи ҳафтаина (рӯзи душанбе): ${onoff(p.weeklyOn)}`,
    markup: {
      inline_keyboard: [
        [{ text: `⏰ Ёдоварӣ: ${p.remindOn ? 'хомӯш кардан' : 'фаъол кардан'}`, callback_data: 'tg_rem' }],
        HOURS.map(h => ({ text: h === p.hour ? `• ${hh(h)} •` : hh(h), callback_data: `h:${h}` })),
        [{ text: `📊 Хулосаи ҳафтаина: ${p.weeklyOn ? 'хомӯш кардан' : 'фаъол кардан'}`, callback_data: 'tg_week' }],
        [{ text: '✖️ Пӯшидан', callback_data: 'close' }],
      ],
    },
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

async function askLogin(env: Env, chat: number, code: string) {
  const d = LOGIN_RE.test(code) ? await fs.get(env, `botLogins/${code}`) : null;
  if (!d || d.status !== 'pending' || !fresh(d)) {
    return send(env, chat, '⌛ Дархости воридшавӣ кӯҳна шудааст ё ёфт нашуд. Дар барнома «Ворид шудан бо Telegram»-ро аз нав пахш кунед.');
  }
  return send(env, chat,
    '🔐 <b>Ворид шудан ба «Дарахти даромад»?</b>\n\n' +
    'Агар шумо худатон дар барнома «Ворид шудан бо Telegram»-ро пахш кардаед, тасдиқ кунед. ' +
    'Агар касе ин пайвандро ба шумо фиристода бошад, <b>бекор кунед</b>.',
    { inline_keyboard: [[{ text: '✅ Ҳа, ворид шавам', callback_data: `lg:${code}` }, { text: '✖️ Не', callback_data: `lgx:${code}` }]] });
}

async function confirmLogin(env: Env, q: NonNullable<Update['callback_query']>, code: string, ok: boolean) {
  const chat = q.message!.chat.id;
  const mid = q.message!.message_id;
  const edit = (text: string) => tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text, parse_mode: 'HTML' });
  const d = LOGIN_RE.test(code) ? await fs.get(env, `botLogins/${code}`) : null;
  if (!ok) { if (d) await fs.del(env, `botLogins/${code}`); return edit('✖️ Воридшавӣ бекор шуд.'); }
  if (!d || d.status !== 'pending' || !fresh(d)) return edit('⌛ Дархост кӯҳна шудааст. Дар барнома аз нав кӯшиш кунед.');
  const { uid } = await resolveUid(env, q.from.id ?? chat);
  const name = [q.from.first_name, q.from.last_name].filter(Boolean).join(' ');
  await fs.set(env, `botLogins/${code}`, { createdAt: String(d.createdAt), status: 'ok', uid, name });
  return edit('✅ <b>Тайёр!</b> Ба барнома баргардед: воридшавӣ худкор анҷом меёбад.');
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

async function onMessage(env: Env, chat: number, text: string, name: string) {
  const [cmdRaw, ...rest] = text.trim().split(/\s+/);
  const cmd = cmdRaw.split('@')[0].toLowerCase();

  if (cmd === '/start') {
    if (rest[0]?.startsWith('login_')) return askLogin(env, chat, rest[0].slice(6));
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
  if (data.startsWith('lg:')) return confirmLogin(env, q, data.slice(3), true);
  if (data.startsWith('lgx:')) return confirmLogin(env, q, data.slice(4), false);
  if (data === 'sum' || data === 'debts' || data === 'rem') return report(env, chat, data);
  if (data === 'help') return send(env, chat, HELP);
  if (data === 'link') {
    if (await isLinked(env, chat)) return send(env, chat, '✅ Аккаунт аллакай пайваст аст.');
    const [text, markup] = linkHelp(env);
    return send(env, chat, text, markup);
  }
  if (data === 'close') return mid ? tg(env, 'deleteMessage', { chat_id: chat, message_id: mid }) : undefined;

  if (data === 'set' || data === 'tg_rem' || data === 'tg_week' || data.startsWith('h:')) {
    const c = await fs.get(env, `botChats/${chat}`);
    if (!c) return send(env, chat, NOT_LINKED, { inline_keyboard: linkHelp(env)[1].inline_keyboard });
    let p = prefsOf(c);
    if (data === 'tg_rem') p = (await savePrefs(env, chat, { remindOn: !p.remindOn })) ?? p;
    else if (data === 'tg_week') p = (await savePrefs(env, chat, { weeklyOn: !p.weeklyOn })) ?? p;
    else if (data.startsWith('h:')) {
      const h = Number(data.slice(2));
      if (HOURS.includes(h)) p = (await savePrefs(env, chat, { hour: h })) ?? p;
    }
    const v = settingsView(p);
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
  const monday = new Date(`${today}T12:00:00Z`).getUTCDay() === 1;
  await cleanup(env).catch(e => console.log(`cleanup: ${e instanceof Error ? e.message : e}`));
  for (const c of await fs.list(env, 'botChats')) {
    try {
      const p = prefsOf(c.data);
      if (p.hour !== hour) continue;
      const chat = Number(c.id);
      const r = await stateOf(env, chat);
      if (typeof r === 'string') continue;
      if (p.remindOn) {
        const rem = reminderText(r.state, today);
        if (rem) await send(env, chat, rem);
      }
      if (monday && p.weeklyOn) await send(env, chat, summaryText(r.state, today));
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
      return json({ token: await customToken(env, uid), name: who.name, isNew });
    }

    // Браузер: код месозем, корбар дар бот тасдиқ мекунад, барнома мепурсад
    if (path === '/auth/start') {
      const code = newCode();
      await fs.set(env, `botLogins/${code}`, { createdAt: new Date().toISOString(), status: 'pending' });
      return json({ code, url: `https://t.me/${env.BOT_USERNAME}?start=login_${code}` });
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
      ctx.waitUntil(onMessage(env, m.chat.id, m.text, m.from?.first_name ?? '').catch(e => {
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
