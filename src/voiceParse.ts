/**
 * Фаҳмидани гуфтори овозӣ бо қоидаҳои оддӣ (бе сервер, бе LLM): маблағ, навъ (даромад/хароҷот), эзоҳ ва сана.
 * Забонҳо: тоҷикӣ, русӣ, англисӣ. Рақамҳо ҳам бо ҳарф («ду ҳазору панҷсад») ва ҳам бо рақам («2 500», «2,5 тыс»).
 */
export interface VoiceResult {
  kind: 'expense' | 'income' | 'debt';
  amount: number | null;
  note: string;
  /** Санаи ISO (YYYY-MM-DD) ё null (имрӯз). */
  date: string | null;
  heard: string;
}

const UNITS: Record<string, number> = {
  // тоҷикӣ
  як: 1, ду: 2, се: 3, чор: 4, панҷ: 5, шаш: 6, ҳафт: 7, ҳашт: 8, нӯҳ: 9, даҳ: 10, ёздаҳ: 11, дувоздаҳ: 12, сенздаҳ: 13, чордаҳ: 14, понздаҳ: 15, шонздаҳ: 16, ҳабдаҳ: 17, ҳаждаҳ: 18, нуздаҳ: 19,
  бист: 20, сӣ: 30, чил: 40, панҷоҳ: 50, шаст: 60, ҳафтод: 70, ҳаштод: 80, навад: 90,
  дусад: 200, сесад: 300, чорсад: 400, панҷсад: 500, шашсад: 600, ҳафтсад: 700, ҳаштсад: 800, нӯҳсад: 900,
  // русӣ
  один: 1, одна: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
  одиннадцать: 11, двенадцать: 12, тринадцать: 13, четырнадцать: 14, пятнадцать: 15, шестнадцать: 16, семнадцать: 17, восемнадцать: 18, девятнадцать: 19,
  двадцать: 20, тридцать: 30, сорок: 40, пятьдесят: 50, шестьдесят: 60, семьдесят: 70, восемьдесят: 80, девяносто: 90,
  двести: 200, триста: 300, четыреста: 400, пятьсот: 500, шестьсот: 600, семьсот: 700, восемьсот: 800, девятьсот: 900,
  // англисӣ
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const HUNDRED = new Set(['сад', 'сто', 'hundred']);
const THOUSAND = /^(ҳазор|тысяч|тыс|thousand|hazor)/;
const MILLION = /^(миллион|млн|million|million)/;

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[!?;:«»"()]/g, ' ').replace(/[.,](?=\s|$)/g, ' ');

/** Рақами «калима»: ҳазору → ҳазор, саду → сад. */
const base = (w: string) => (/^(сад|ҳазор|сесад|дусад)у$/.test(w) || /^(.+)у$/.test(w) && (UNITS[w.slice(0, -1)] !== undefined || HUNDRED.has(w.slice(0, -1)) || THOUSAND.test(w.slice(0, -1))) ? w.slice(0, -1) : w);

interface Num { value: number; start: number; end: number }

/** Рақамҳо бо рақам: «2 500», «2500», «2,5 тыс», «5к». */
function digitNumber(tokens: string[]): Num | null {
  for (let i = 0; i < tokens.length; i++) {
    if (!/^\d/.test(tokens[i])) continue;
    let j = i;
    let txt = tokens[i];
    // «2 500»: гурӯҳҳои сеқамаи рақамӣ
    const first = /^\d{1,3}$/.test(tokens[i]);
    while (first && j + 1 < tokens.length && /^\d{3}$/.test(tokens[j + 1])) { txt += tokens[j + 1]; j++; }
    let v = parseFloat(txt.replace(',', '.').replace(/[^\d.]/g, ''));
    if (!isFinite(v) || v <= 0) continue;
    const nxt = tokens[j + 1] ?? '';
    const k = txt.match(/\d(к|k)$/i);
    if (k) v *= 1000;
    else if (THOUSAND.test(nxt) || nxt === 'к' || nxt === 'k') { v *= 1000; j++; }
    else if (MILLION.test(nxt)) { v *= 1e6; j++; }
    return { value: Math.round(v * 100) / 100, start: i, end: j };
  }
  return null;
}

/** Рақамҳо бо калима: «ду ҳазору панҷсад», «две тысячи пятьсот», «two thousand five hundred». */
function wordNumber(tokens: string[]): Num | null {
  let best: Num | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const w = base(tokens[i]);
    const isNum = UNITS[w] !== undefined || HUNDRED.has(w) || THOUSAND.test(w) || MILLION.test(w);
    if (!isNum) continue;
    let total = 0; let cur = 0; let j = i; let any = false;
    for (; j < tokens.length; j++) {
      const t = base(tokens[j]);
      if (UNITS[t] !== undefined) { cur += UNITS[t]; any = true; }
      else if (HUNDRED.has(t)) { cur = t === 'hundred' ? (cur || 1) * 100 : (t === 'сад' && cur > 0 && cur < 10 ? cur * 100 : cur + 100); any = true; }
      else if (THOUSAND.test(t)) { total += (cur || 1) * 1000; cur = 0; any = true; }
      else if (MILLION.test(t)) { total += (cur || 1) * 1e6; cur = 0; any = true; }
      else if (t === 'и' || t === 'and') { /* пайвандак */ }
      else break;
    }
    const value = total + cur;
    if (any && value > 0) { best = { value, start: i, end: j - 1 }; break; }
  }
  return best;
}

const INC_WORDS = 'зарплат|получил|заработал|поступил|премия|музд|даромад|гирифт|маош|бонус|ҷоиза|income|salary|earned|received|доход';
const INCOME = new RegExp(INC_WORDS);
const INCOME_WORD = new RegExp(`(?<![\\p{L}])\\p{L}*(?:${INC_WORDS})\\p{L}*(?![\\p{L}])`, 'giu');
const DEBT = /(қарз|долг|debt|loan|заём|займ)/;
const NOISE = /(?:^|\s)(потратил[аи]?|заплатил[аи]?|купил[аи]?|сегодня|вчера|позавчера|имрӯз|дирӯз|пагоҳ|today|yesterday|сомонӣ|сомони|смн|somoni|рубл\p{L}*|руб|долл\p{L}*|dollars?|евро|харҷ|хароҷ\p{L}*|харч\p{L}*|кардам|карда|сарф|пардохт\p{L}*|барои|потрачено|расход\p{L}*|spent|paid|for|on|at|to|на|за|в|и|the|a)(?=\s|$)/giu;

const isoOf = (d: Date) => d.toLocaleDateString('sv-SE');

export function parseVoice(text: string, now = new Date()): VoiceResult {
  const heard = text.trim();
  const low = norm(heard).replace(/\s+/g, ' ').trim();
  const tokens = low.split(' ').filter(Boolean);
  const num = digitNumber(tokens) ?? wordNumber(tokens);

  const kind: VoiceResult['kind'] = DEBT.test(low) ? 'debt' : INCOME.test(low) ? 'income' : 'expense';

  let date: string | null = null;
  const day = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return isoOf(d); };
  if (/(позавчера)/.test(low)) date = day(2);
  else if (/(вчера|дирӯз|yesterday)/.test(low)) date = day(1);

  const rest = num ? tokens.filter((_, i) => i < num.start || i > num.end) : tokens;
  const note = rest.join(' ').replace(NOISE, ' ').replace(INCOME_WORD, ' ').replace(/\s+/g, ' ').trim();
  return { kind, amount: num ? num.value : null, note: note ? note.charAt(0).toUpperCase() + note.slice(1) : '', date, heard };
}
