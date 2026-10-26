/** Сабти хароҷот ва даромад аз Telegram: матн («такси 21») ё паёми овозӣ. Пеш аз сабт корти тасдиқ фиристода мешавад. */
import { swapUnit } from '../../src/currency';
import { categoryIcon, orderedSources, sourceIcon } from '../../src/categories';
import { ACCOUNTS, balancesOf, fmt, hasShares, syncCatalog } from '../../src/model';
import { applyDraft, categoryNames, draftFrom, undoApplied, visibleAccounts } from '../../src/quickAdd';
import type { Draft } from '../../src/quickAdd';
import type { State } from '../../src/types';
import * as fs from './firestore';
import type { Env } from './firestore';
import { linkHelp, notLinked, send, stateOf, tg } from './index';
import type { TFn } from './i18n';
import { dateOf, esc, money } from './report';

type Button = { text: string; callback_data?: string };
type Keyboard = { inline_keyboard: Button[][] };

const todayOf = (env: Env) => dateOf(env.TIMEZONE ?? 'Asia/Dushanbe');
const cu = (s: State, x: string) => swapUnit(x, s.currency ?? 'TJS');
const accName = (t: TFn, id: string) => esc(t(ACCOUNTS[id]?.name ?? id));

const rows = (btns: Button[], per = 2): Button[][] => {
  const out: Button[][] = [];
  for (let i = 0; i < btns.length; i += per) out.push(btns.slice(i, i + per));
  return out;
};

// ---------- Пешнамоиш (корти тасдиқ) ----------
function card(t: TFn, s: State, d: Draft, today: string): { text: string; markup: Keyboard } {
  const exp = d.kind === 'expense';
  const lines = [exp ? t("🧾 <b>Хароҷот</b>") : t("💰 <b>Даромад</b>"), '', t("Маблағ: {0}", money(t, d.amount))];
  if (exp) {
    const ic = categoryIcon(d.category ?? undefined, s.categories ?? []);
    lines.push(t("Категория: {0}", d.category ? `${ic ? `${ic} ` : ''}${esc(t(d.category))}` : '—'));
    lines.push(t("Ҳисоб: {0}", accName(t, d.account)));
  } else {
    const ic = sourceIcon(d.source, s.incomeSources ?? []);
    lines.push(t("Манбаъ: {0}", `${ic ? `${ic} ` : ''}${esc(t(d.source))}`));
    lines.push(d.direct || !hasShares(s) ? t("Ҳисоб: {0}", accName(t, d.account)) : t("Тақсим: аз рӯи фоизҳои ҳисобҳо"));
  }
  if (d.note) lines.push(t("Эзоҳ: {0}", esc(d.note)));
  if (d.date !== today) lines.push(t("Сана: {0}", d.date.split('-').reverse().join('.')));
  if (exp && d.amount > (balancesOf(s)[d.account] ?? 0) + 0.005) lines.push('', t("⚠️ Маблағ аз тавозуни ҳисоб зиёд аст ({0}).", fmt(balancesOf(s)[d.account] ?? 0)));
  const extra: Button[] = exp
    ? [{ text: t("🏷 Категория"), callback_data: 'q:cat' }, { text: t("💼 Ҳисоб"), callback_data: 'q:acc' }]
    : [{ text: t("📂 Манбаъ"), callback_data: 'q:src' }, { text: t("💼 Ба як ҳисоб"), callback_data: 'q:acc' }];
  return {
    text: cu(s, lines.join('\n')),
    markup: {
      inline_keyboard: [
        [{ text: t("✅ Сабт"), callback_data: 'q:ok' }, { text: t("✖️ Бекор"), callback_data: 'q:no' }],
        extra,
        [{ text: exp ? t("🔄 Ин даромад аст") : t("🔄 Ин хароҷот аст"), callback_data: 'q:t' }],
      ],
    },
  };
}

const loadPending = async (env: Env, chat: number): Promise<Draft | null> => {
  const d = await fs.get(env, `botPending/${chat}`);
  if (!d || typeof d.json !== 'string' || Date.now() - Number(d.ts) > 60 * 60_000) return null;
  try { return JSON.parse(d.json) as Draft; } catch { return null; }
};
const savePending = (env: Env, chat: number, d: Draft) => fs.set(env, `botPending/${chat}`, { json: JSON.stringify(d), ts: Date.now() });

// ---------- Матн ва овоз ----------
/** Матн (ё натиҷаи шинохти овоз) → корти тасдиқ. `heard` — матни шунидашуда (барои овоз). */
export async function quickText(env: Env, chat: number, text: string, t: TFn, heard = false): Promise<void> {
  const r = await stateOf(env, chat, t);
  if ('msg' in r) return void await send(env, chat, r.msg, r.unlinked ? { inline_keyboard: linkHelp(t, env)[1].inline_keyboard } : undefined);
  syncCatalog(r.state);
  const res = draftFrom(r.state, text, todayOf(env));
  if ('error' in res) {
    return void await send(env, chat,
      (heard ? t("🎙 Шунидам: «{0}»\n\n", esc(text)) : '') +
      (res.error === 'debt'
        ? t("Қарзро аз барнома сабт кунед (бахши «Қарз»).")
        : t("Маблағ ёфт нашуд. Масалан: <code>такси 21</code>, <code>маош 3000</code>, <code>дирӯз нон 15</code>.")));
  }
  await savePending(env, chat, res.draft);
  const c = card(t, r.state, res.draft, todayOf(env));
  await send(env, chat, (heard ? t("🎙 Шунидам: «{0}»\n\n", esc(text)) : '') + c.text, c.markup);
}

/** Паёми овозӣ → матн (Cloudflare Workers AI, Whisper) → корт. */
export async function quickVoice(env: Env, chat: number, fileId: string, t: TFn): Promise<void> {
  if (!env.AI) return void await send(env, chat, t("🎙 Шинохти овоз дар бот ҳанӯз фаъол нашудааст. Матн нависед, масалан: <code>такси 21</code>."));
  const info = (await (await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`)).json()) as { ok: boolean; result?: { file_path?: string } };
  const path = info.result?.file_path;
  if (!path) return void await send(env, chat, t("🎙 Файли овозро гирифта натавонистам. Боз кӯшиш кунед."));
  const buf = new Uint8Array(await (await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${path}`)).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const out = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: btoa(bin) });
  const text = (out.text ?? '').trim();
  if (!text) return void await send(env, chat, t("🎙 Чизе нашунидам. Боз кӯшиш кунед ё матн нависед."));
  return quickText(env, chat, text, t, true);
}

// ---------- Тугмаҳо ----------
export async function quickCallback(env: Env, chat: number, mid: number | undefined, data: string, t: TFn): Promise<void> {
  const edit = (text: string, markup?: Keyboard) => mid
    ? tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...(markup ? { reply_markup: markup } : {}) })
    : send(env, chat, text, markup);
  const r = await stateOf(env, chat, t);
  if ('msg' in r) return void await edit(r.msg, r.unlinked ? { inline_keyboard: linkHelp(t, env)[1].inline_keyboard } : undefined);
  syncCatalog(r.state);
  const [, op, arg, id] = data.split(':');

  if (op === 'u') { // бекор кардани сабти анҷомшуда: q:u:e|i:<id>
    const kind = arg === 'i' ? 'income' : 'expense';
    const ok = await fs.updateState(env, r.uid, st => ({ state: undoApplied(st as unknown as State, kind, Number(id)) as unknown as Record<string, unknown>, result: true }));
    return void await edit(ok ? t("↩️ Сабт бекор шуд.") : t("⚠️ Бекор карда нашуд."));
  }

  let d = await loadPending(env, chat);
  if (!d) return void await edit(t("⌛ Ин дархост кӯҳна шудааст. Аз нав нависед."));
  const show = async () => { await savePending(env, chat, d!); const c = card(t, r.state, d!, todayOf(env)); await edit(c.text, c.markup); };

  if (op === 'no') { await fs.del(env, `botPending/${chat}`); return void await edit(t("✖️ Бекор шуд.")); }
  if (op === 't') {
    d = { ...d, kind: d.kind === 'expense' ? 'income' : 'expense', category: null, direct: false };
    return show();
  }
  if (op === 'cat') {
    const names = categoryNames(r.state);
    return void await edit(t("🏷 Категорияро интихоб кунед:"), { inline_keyboard: [...rows(names.map((n, i) => ({ text: `${categoryIcon(n, r.state.categories ?? []) ?? ''} ${t(n)}`.trim(), callback_data: `q:c:${i}` }))), [{ text: t("⬅️ Бозгашт"), callback_data: 'q:back' }]] });
  }
  if (op === 'c') { d = { ...d, category: categoryNames(r.state)[Number(arg)] ?? d.category }; return show(); }
  if (op === 'src') {
    const names = orderedSources(r.state.incomeSources ?? [], r.state.incomes).map(x => x.name);
    return void await edit(t("📂 Манбаи даромадро интихоб кунед:"), { inline_keyboard: [...rows(names.map((n, i) => ({ text: `${sourceIcon(n, r.state.incomeSources ?? []) ?? ''} ${t(n)}`.trim(), callback_data: `q:s:${i}` }))), [{ text: t("⬅️ Бозгашт"), callback_data: 'q:back' }]] });
  }
  if (op === 's') { d = { ...d, source: orderedSources(r.state.incomeSources ?? [], r.state.incomes).map(x => x.name)[Number(arg)] ?? d.source }; return show(); }
  if (op === 'acc') {
    const ids = visibleAccounts(r.state);
    return void await edit(t("💼 Ҳисобро интихоб кунед:"), { inline_keyboard: [...rows(ids.map((a, i) => ({ text: `${ACCOUNTS[a]?.icon ?? ''} ${t(ACCOUNTS[a]?.name ?? a)}`.trim(), callback_data: `q:a:${i}` }))), [{ text: t("⬅️ Бозгашт"), callback_data: 'q:back' }]] });
  }
  if (op === 'a') { d = { ...d, account: visibleAccounts(r.state)[Number(arg)] ?? d.account, direct: d.kind === 'income' }; return show(); }
  if (op === 'back') return show();

  if (op === 'ok') {
    const draft = d;
    const res = await fs.updateState(env, r.uid, raw => {
      const st = raw as unknown as State;
      syncCatalog(st);
      const a = applyDraft(st, draft);
      return { state: a.state as unknown as Record<string, unknown>, result: { id: a.id, state: a.state } };
    });
    await fs.del(env, `botPending/${chat}`);
    if (!res) return void await edit(t("⚠️ Сабт нашуд: маълумот дар сервер нест. Дар барнома ворид шавед."));
    syncCatalog(res.state);
    const bal = balancesOf(res.state);
    const head = draft.kind === 'expense'
      ? t("✅ <b>Хароҷот сабт шуд</b>\n{0} · {1}", money(t, draft.amount), esc(draft.note || (draft.category ? t(draft.category) : '') || accName(t, draft.account)))
      : t("✅ <b>Даромад сабт шуд</b>\n{0} · {1}", money(t, draft.amount), esc(t(draft.source)));
    const tail = draft.kind === 'expense' || !hasShares(res.state) || draft.direct
      ? `\n${t("Бақияи «{0}»: {1}", accName(t, draft.account), money(t, bal[draft.account] ?? 0))}` : '';
    return void await edit(cu(res.state, head + tail), { inline_keyboard: [[{ text: t("↩️ Бекор кардан"), callback_data: `q:u:${draft.kind === 'income' ? 'i' : 'e'}:${res.id}` }]] });
  }
}
