import * as fs from './firestore';
import type { Env } from './firestore';

const enc = new TextEncoder();

async function hmac(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(data));
}
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');

export interface TgIdentity { id: number; name: string }

/** Санҷиши имзои `initData`-и Telegram Mini App (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app). */
export async function verifyInitData(env: Env, initData: string, maxAgeSec = 86400): Promise<TgIdentity | null> {
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = await hmac(enc.encode('WebAppData') as BufferSource, env.TELEGRAM_TOKEN);
  if (hex(await hmac(secret, check)) !== hash) return null;
  const age = Date.now() / 1000 - Number(p.get('auth_date') ?? 0);
  if (!(age >= -60 && age <= maxAgeSec)) return null;
  try {
    const u = JSON.parse(p.get('user') ?? '') as { id?: number; first_name?: string; last_name?: string; is_bot?: boolean };
    if (!u.id || u.is_bot) return null;
    return { id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(' ') };
  } catch {
    return null;
  }
}

/**
 * Аккаунти Firebase барои корбари Telegram: агар чат аллакай ба аккаунт пайваст бошад — ҳамон аккаунт,
 * дар акс аккаунти нави `tg_<id>` ва бот худкор пайваст мешавад.
 */
export async function resolveUid(env: Env, tgId: number): Promise<{ uid: string; isNew: boolean }> {
  const c = await fs.get(env, `botChats/${tgId}`);
  if (c) {
    const l = await fs.get(env, `users/${c.uid}/bot/link`);
    if (l && String(l.chatId) === String(tgId)) return { uid: String(c.uid), isNew: false };
  }
  const uid = `tg_${tgId}`;
  const now = new Date().toISOString();
  await fs.set(env, `users/${uid}/bot/link`, { chatId: String(tgId), linkedAt: now });
  await fs.set(env, `botChats/${tgId}`, { uid, linkedAt: now });
  return { uid, isNew: true };
}

export const LOGIN_RE = /^[A-Z2-9]{10}$/;
export const LOGIN_TTL_MS = 10 * 60_000;

export function newCode(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), x => A[x % A.length]).join('');
}
