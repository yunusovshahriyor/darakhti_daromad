/** Шинохти овоз: Cloudflare Workers AI (Whisper). Як функсия барои бот ва барои барнома (/voice). */
import type { Env } from './firestore';
import type { Lang } from './i18n';

const MODEL = '@cf/openai/whisper-large-v3-turbo';

/** Луғати маъмул: ба Whisper ёрӣ мекунад, ки калимаҳои молиявиро дуруст нависад. */
const PROMPT: Record<Lang, string> = {
  tg: 'Сабти хароҷот ва даромад: такси 21 сомонӣ, нон 15, маош 3000, дирӯз гӯшт 85, чой 8.',
  ru: 'Запись расходов и доходов: такси 21 сомони, хлеб 15, зарплата 3000, вчера мясо 85, чай 8.',
  en: 'Recording expenses and income: taxi 21 somoni, bread 15, salary 3000, yesterday meat 85, tea 8.',
};

const b64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Матни овоз. Забон аз танзимоти корбар (на худкор): мушкили «забон нодуруст муайян шуд» нест. */
export async function transcribe(env: Env, audio: Uint8Array, lang: Lang): Promise<string> {
  if (!env.AI) throw new Error('noai');
  const base = { audio: b64(audio), task: 'transcribe', initial_prompt: PROMPT[lang] };
  try {
    return ((await env.AI.run(MODEL, { ...base, language: lang })).text ?? '').trim();
  } catch (e) {
    // Агар модел коди забонро қабул накунад, бе он кӯшиш мекунем
    console.log(`stt language=${lang}: ${e instanceof Error ? e.message : e}`);
    return ((await env.AI.run(MODEL, base)).text ?? '').trim();
  }
}
