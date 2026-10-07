import { useEffect } from 'react';
import { balancesOf, fundDreams } from './model';
import type { State } from './types';

const MS_KEY = 'darakhti:dreamMs';
const BOUGHT_KEY = 'darakhti:dreamBought';

const read = <T,>(key: string): T | null => {
  try { const r = localStorage.getItem(key); return r === null ? null : (JSON.parse(r) as T); } catch { return null; }
};
const write = (key: string, v: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
};

const level = (pct: number) => (pct >= 100 - 1e-6 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0);

const MESSAGE: Record<number, (t: string) => string> = {
  25: t => `🌱 «${t}»: 25% — оғози хуб!`,
  50: t => `🔥 Нисфи роҳро гузаштед! «${t}» 50%`,
  75: t => `🚀 Қариб расидед! «${t}» 75%`,
  100: t => `🎉 «${t}» тайёр аст — метавонед харед!`,
};

/**
 * Ҳавасмандӣ: огоҳӣ ҳангоми расидан ба 25 / 50 / 75 / 100% ва ҷашн ҳангоми хариди орзу.
 * Ҳолати пештара дар хотира нигоҳ дошта мешавад, то бо кушодани барнома такрор нашавад.
 */
export function useDreamMilestones(
  state: State,
  toast: (msg: string) => void,
  celebrate: (title: string, text: string) => void,
) {
  useEffect(() => {
    const bal = balancesOf(state);
    const stored = read<Record<string, number>>(MS_KEY);
    const map: Record<string, number> = { ...(stored ?? {}) };
    let message = '';

    for (const [kind, account] of [['big', 'bigDream'], ['small', 'smallDream']] as const) {
      for (const { dream, funded } of fundDreams(state.dreams.filter(d => d.kind === kind), bal[account] ?? 0)) {
        const lv = level((funded / dream.target) * 100);
        const key = String(dream.id);
        const prev = map[key];
        // Бори аввал: ҳолати ҷорӣ бе огоҳӣ нигоҳ дошта мешавад
        if (stored !== null && prev !== undefined && lv > prev && lv > 0) message = MESSAGE[lv](dream.title);
        map[key] = lv;
      }
    }
    write(MS_KEY, map);
    if (message) {
      toast(message);
      navigator.vibrate?.([30, 40, 30]);
    }

    const seen = read<number[]>(BOUGHT_KEY);
    const boughtNow = state.dreams.filter(d => d.boughtAt);
    if (seen !== null) {
      const fresh = boughtNow.filter(d => !seen.includes(d.id));
      if (fresh.length) {
        const d = fresh[fresh.length - 1];
        celebrate(`Орзуи «${d.title}» амалӣ шуд!`, 'Табрик! Шумо ба мақсади худ расидед. Ба орзуи навбатӣ!');
      }
    }
    write(BOUGHT_KEY, boughtNow.map(d => d.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dreams, state.incomes, state.transfers, state.expenses]);
}
