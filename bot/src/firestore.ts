/** Firestore REST + ворид шудан бо ҳисоби хидматии Google (бе SDK: дар Cloudflare Workers кор мекунад). */

export interface Env {
  TELEGRAM_TOKEN: string;
  WEBHOOK_SECRET: string;
  FIREBASE_SERVICE_ACCOUNT: string;
  FIREBASE_PROJECT_ID: string;
  TIMEZONE?: string;
  APP_URL: string;
  /** Чати админ дар Telegram (ихтиёрӣ): хабарҳо дар бораи хато ба ин ҷо мераванд. Рақами чатро бо фармони /id гиред. */
  ADMIN_CHAT_ID?: string;
  BOT_USERNAME: string;
  /** Қисқа номи Mini App дар @BotFather (/newapp), масалан «app». Агар холӣ бошад, воридшавӣ тавассути /start-и бот. */
  MINIAPP_SHORTNAME?: string;
}

type Json = Record<string, unknown>;

const b64url = (buf: ArrayBuffer | string) => {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let cached: { token: string; exp: number } | null = null;

async function importKey(pem: string): Promise<CryptoKey> {
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

/** JWT (RS256), имзошуда бо калиди ҳисоби хидматӣ. */
async function signJwt(env: Env, claim: Json): Promise<string> {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as { private_key: string };
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(claim));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await importKey(sa.private_key), new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

async function accessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as { client_email: string };
  const assertion = await signJwt(env, {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: now + j.expires_in };
  return cached.token;
}

/** Токени воридшавии Firebase (signInWithCustomToken) барои `uid`. */
export async function customToken(env: Env, uid: string): Promise<string> {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as { client_email: string };
  const now = Math.floor(Date.now() / 1000);
  return signJwt(env, {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid,
  });
}

const base = (env: Env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function call(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${base(env)}/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${await accessToken(env)}`, 'content-type': 'application/json' },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Firestore ${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  return res;
}

const decode = (fields: Json | undefined): Json => {
  const out: Json = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    const x = v as Record<string, string>;
    out[k] = 'stringValue' in x ? x.stringValue
      : 'integerValue' in x ? Number(x.integerValue)
      : 'doubleValue' in x ? Number(x.doubleValue)
      : 'booleanValue' in x ? x.booleanValue
      : 'timestampValue' in x ? x.timestampValue
      : null;
  }
  return out;
};

export interface Doc { id: string; data: Json }

export async function get(env: Env, path: string): Promise<Json | null> {
  const res = await call(env, path);
  if (res.status === 404) return null;
  return decode(((await res.json()) as { fields?: Json }).fields);
}

/** Сабт: сатр → stringValue, адад → integerValue, ISO-сана бо калиди …At → timestampValue. */
export async function set(env: Env, path: string, data: Record<string, string | number | boolean>): Promise<void> {
  const fields: Json = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) } : k.endsWith('At') ? { timestampValue: v } : { stringValue: v };
  }
  await call(env, path, { method: 'PATCH', body: JSON.stringify({ fields }) });
}

export async function del(env: Env, path: string): Promise<void> {
  await call(env, path, { method: 'DELETE' });
}

export async function list(env: Env, collection: string): Promise<Doc[]> {
  const out: Doc[] = [];
  let token = '';
  do {
    const res = await call(env, `${collection}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
    const j = (await res.json()) as { documents?: { name: string; fields?: Json }[]; nextPageToken?: string };
    for (const d of j.documents ?? []) out.push({ id: d.name.split('/').pop()!, data: decode(d.fields) });
    token = j.nextPageToken ?? '';
  } while (token);
  return out;
}

/** Ҳолати корбар аз `users/{uid}/sync/*` (ҳамон блоки қисмшудаи барнома). */
export async function loadState(env: Env, uid: string): Promise<unknown | null> {
  const meta = await get(env, `users/${uid}/sync/meta`);
  if (!meta) return null;
  const n = Number(meta.chunks);
  const parts = await Promise.all(Array.from({ length: n }, (_, i) => get(env, `users/${uid}/sync/chunk_${i}`)));
  const json = parts.map(p => (p?.part as string | undefined) ?? '').join('');
  const file = JSON.parse(json) as { state?: unknown };
  return file.state ?? null;
}
