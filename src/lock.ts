/**
 * Қулфи барнома дар ин дастгоҳ: PIN-и 4 рақама (бо PBKDF2) ва ихтиёран ангушт/чеҳра (WebAuthn).
 * Ин қулфи дастгоҳ аст (барои пинҳон кардани маълумот аз дигарон), на ҳимояи сервер.
 */
const KEY = 'darakhti:lock';
const FAIL_KEY = 'darakhti:lock-fail';
export const AUTOHIDE_KEY = 'darakhti:autohide';

export interface LockCfg { salt: string; hash: string; after: number; bio?: string }

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function derive(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: 100_000 }, key, 256);
  return b64(bits);
}

export const getLock = (): LockCfg | null => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') as LockCfg | null; } catch { return null; }
};
const save = (c: LockCfg | null) => { try { if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
export const isLockOn = () => !!getLock();

export async function setPin(pin: string): Promise<void> {
  const salt = b64(rand(16));
  const prev = getLock();
  save({ salt, hash: await derive(pin, salt), after: prev?.after ?? 0, bio: prev?.bio });
}
export const clearLock = () => { save(null); try { localStorage.removeItem(FAIL_KEY); } catch { /* ignore */ } };
export const setLockAfter = (after: number) => { const c = getLock(); if (c) save({ ...c, after }); };

// ----- Кӯшишҳои нодуруст: пас аз 5 бор интизорӣ -----
interface Fail { n: number; until: number }
const fails = (): Fail => { try { return JSON.parse(localStorage.getItem(FAIL_KEY) ?? '{"n":0,"until":0}') as Fail; } catch { return { n: 0, until: 0 }; } };
export const waitSeconds = (): number => Math.max(0, Math.ceil((fails().until - Date.now()) / 1000));

export async function verifyPin(pin: string): Promise<boolean> {
  const c = getLock();
  if (!c || waitSeconds() > 0) return false;
  if ((await derive(pin, c.salt)) === c.hash) { try { localStorage.removeItem(FAIL_KEY); } catch { /* ignore */ } return true; }
  const f = fails();
  const n = f.n + 1;
  const until = n % 5 === 0 ? Date.now() + Math.min(300, 30 * (n / 5)) * 1000 : 0;
  try { localStorage.setItem(FAIL_KEY, JSON.stringify({ n, until })); } catch { /* ignore */ }
  return false;
}

// ----- Ангушт / чеҳра -----
export async function bioAvailable(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential || !window.isSecureContext) return false;
    if (location.hash.includes('tgWebAppData')) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

export async function bioRegister(): Promise<boolean> {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: rand(32), rp: { name: 'Дарахти даромад' },
        user: { id: rand(16), name: 'user', displayName: 'user' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null;
    const c = getLock();
    if (!cred || !c) return false;
    save({ ...c, bio: b64(cred.rawId) });
    return true;
  } catch { return false; }
}

export const bioOn = () => !!getLock()?.bio;
export const bioOff = () => { const c = getLock(); if (c) save({ ...c, bio: undefined }); };

export async function bioVerify(): Promise<boolean> {
  const c = getLock();
  if (!c?.bio) return false;
  try {
    const r = await navigator.credentials.get({
      publicKey: { challenge: rand(32), allowCredentials: [{ type: 'public-key', id: unb64(c.bio) }], userVerification: 'required', timeout: 60_000 },
    });
    return !!r;
  } catch { return false; }
}

// ----- Пинҳон кардани худкори маблағ -----
export const autoHide = (): boolean => { try { return localStorage.getItem(AUTOHIDE_KEY) === '1'; } catch { return false; } };
export const setAutoHide = (on: boolean) => { try { localStorage.setItem(AUTOHIDE_KEY, on ? '1' : '0'); } catch { /* ignore */ } };
