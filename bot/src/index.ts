import { dateOf, debtsText, reminderText, summaryText } from './report';
import * as fs from './firestore';
import type { Env } from './firestore';
import type { State } from '../../src/types';

interface Update {
  message?: { chat: { id: number; type: string }; text?: string; from?: { first_name?: string } };
}

interface ScheduledController { scheduledTime: number }
interface Ctx { waitUntil(p: Promise<unknown>): void }

const tg = async (env: Env, method: string, body: Record<string, unknown>) => {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.log(`telegram ${method}: ${res.status} ${await res.text()}`);
  return res.ok;
};

const send = (env: Env, chat: number | string, text: string) =>
  tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });

const HELP =
  '🌳 <b>Дарахти даромад</b>\n\n' +
  'Ман дар бораи пардохтҳои қарз ёдрас мекунам ва хулосаи молиявии шуморо мефиристам.\n\n' +
  '/xulosa — хулосаи моҳ\n' +
  '/qarzho — қарзҳо ва пардохтҳои навбатӣ\n' +
  '/yodovari — ёдоварии имрӯз\n' +
  '/stop — ҷудо кардани бот аз аккаунт\n\n' +
  'Ёдоварӣ ҳар рӯз соати 09:00 меояд (имрӯз, пагоҳ, пас аз 3 рӯз ва пардохтҳои гузашта), хулоса — рӯзи душанбе.';

const NOT_LINKED =
  'Ин бот ҳанӯз ба аккаунти шумо пайваст нест.\n\n' +
  'Дар барнома: Профил → «Telegram-бот» → «Гирифтани код». Кодро ба ин ҷо фиристед (ё тугмаи пайвандро пахш кунед).';

const CODE_RE = /^[A-Z2-9]{10}$/;
const LINK_TTL_MS = 15 * 60_000;

async function link(env: Env, chat: number, raw: string): Promise<string> {
  const code = raw.trim().toUpperCase();
  if (!CODE_RE.test(code)) return '❌ Код нодуруст аст. Аз барнома коди 10-аломатаро гиред.';
  const doc = await fs.get(env, `botLinks/${code}`);
  if (!doc) return '❌ Код ёфт нашуд ё истифода шудааст. Дар барнома коди нав гиред.';
  await fs.del(env, `botLinks/${code}`);
  const age = Date.now() - Date.parse(String(doc.createdAt));
  if (!(age >= -60_000 && age <= LINK_TTL_MS)) return '⌛ Код кӯҳна шуд (15 дақиқа). Дар барнома коди нав гиред.';
  const uid = String(doc.uid);
  // як чат — як аккаунт: пайвастшавии кӯҳнаи ҳамин аккаунт иваз мешавад
  const old = await fs.get(env, `users/${uid}/bot/link`);
  if (old && String(old.chatId) !== String(chat)) await fs.del(env, `botChats/${old.chatId}`);
  await fs.set(env, `users/${uid}/bot/link`, { chatId: String(chat), linkedAt: new Date().toISOString() });
  await fs.set(env, `botChats/${chat}`, { uid, linkedAt: new Date().toISOString() });
  return '✅ <b>Бот пайваст шуд!</b>\n\nҲар рӯз соати 09:00 дар бораи пардохтҳо ёдрас мекунам. /help — фармонҳо.';
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

async function onMessage(env: Env, chat: number, text: string) {
  const [cmdRaw, ...rest] = text.trim().split(/\s+/);
  const cmd = cmdRaw.split('@')[0].toLowerCase();
  const tz = env.TIMEZONE ?? 'Asia/Dushanbe';

  if (cmd === '/start' || cmd === '/help') {
    if (cmd === '/start' && rest[0]) return send(env, chat, await link(env, chat, rest[0]));
    return send(env, chat, HELP);
  }
  if (!cmd.startsWith('/') && CODE_RE.test(cmdRaw.toUpperCase()) && rest.length === 0) return send(env, chat, await link(env, chat, cmdRaw));

  if (cmd === '/stop') {
    const c = await fs.get(env, `botChats/${chat}`);
    if (c) { await fs.del(env, `users/${c.uid}/bot/link`); await fs.del(env, `botChats/${chat}`); }
    return send(env, chat, '👋 Бот аз аккаунт ҷудо шуд. Барои пайвастани дубора дар барнома коди нав гиред.');
  }

  if (cmd === '/xulosa' || cmd === '/qarzho' || cmd === '/yodovari') {
    const r = await stateOf(env, chat);
    if (typeof r === 'string') return send(env, chat, r);
    const today = dateOf(tz);
    if (cmd === '/xulosa') return send(env, chat, summaryText(r.state, today));
    if (cmd === '/qarzho') return send(env, chat, debtsText(r.state, today));
    return send(env, chat, reminderText(r.state, today) ?? '✅ Имрӯз ва дар 3 рӯзи наздик пардохт нест.');
  }
  return send(env, chat, 'Фармон нофаҳмо аст. /help');
}

async function daily(env: Env) {
  const tz = env.TIMEZONE ?? 'Asia/Dushanbe';
  const today = dateOf(tz);
  const monday = new Date(`${today}T12:00:00Z`).getUTCDay() === 1;
  for (const c of await fs.list(env, 'botChats')) {
    try {
      const chat = Number(c.id);
      const r = await stateOf(env, chat);
      if (typeof r === 'string') continue;
      const rem = reminderText(r.state, today);
      if (rem) await send(env, chat, rem);
      if (monday) await send(env, chat, summaryText(r.state, today));
    } catch (e) {
      console.log(`daily ${c.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/webhook') return new Response('Дарахти даромад — бот', { status: 200 });
    if (req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
    const u = (await req.json()) as Update;
    const m = u.message;
    if (m?.text && m.chat.type === 'private') {
      ctx.waitUntil(onMessage(env, m.chat.id, m.text).catch(e => {
        console.log(`message: ${e instanceof Error ? e.stack : e}`);
        return send(env, m.chat.id, '⚠️ Хатои муваққатӣ. Баъдтар кӯшиш кунед.');
      }));
    }
    return new Response('ok');
  },

  async scheduled(_c: ScheduledController, env: Env, ctx: Ctx) {
    ctx.waitUntil(daily(env));
  },
};
