/** Санҷиши токени Firebase ID (RS256) бе SDK: имзо аз калидҳои оммавии Google, `aud`, `iss`, `exp`. */
import type { Env } from './firestore';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwks: { keys: (JsonWebKey & { kid: string })[]; exp: number } | null = null;

const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), c => c.charCodeAt(0));
const parse = (s: string) => JSON.parse(new TextDecoder().decode(unb64(s))) as Record<string, unknown>;

async function keys() {
  if (jwks && jwks.exp > Date.now()) return jwks.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`jwks ${res.status}`);
  jwks = { keys: ((await res.json()) as { keys: (JsonWebKey & { kid: string })[] }).keys, exp: Date.now() + 3_600_000 };
  return jwks.keys;
}

/** `uid`-и корбар, агар токен дуруст бошад, вагарна `null`. */
export async function verifyIdToken(env: Env, token: string): Promise<string | null> {
  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) return null;
  try {
    const head = parse(h);
    const body = parse(p);
    if (head.alg !== 'RS256') return null;
    const jwk = (await keys()).find(k => k.kid === head.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64(sig), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const now = Math.floor(Date.now() / 1000);
    if (body.aud !== env.FIREBASE_PROJECT_ID || body.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) return null;
    if (typeof body.exp !== 'number' || body.exp < now || typeof body.sub !== 'string' || !body.sub) return null;
    return body.sub;
  } catch {
    return null;
  }
}
