const KEY = 'darakhti:errlog';
const MAX = 5;

const read = (): string[] => { try { return JSON.parse(sessionStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; } };
const add = (m: string) => {
  try { sessionStorage.setItem(KEY, JSON.stringify([...read(), `${new Date().toISOString().slice(11, 19)} ${m}`.slice(0, 300)].slice(-MAX))); } catch { /* ignore */ }
};

/** Хатогиҳои охирини барнома (барои замима ба хабар дар бораи хато). */
export const lastErrors = (): string[] => read();

export function initErrorLog() {
  window.addEventListener('error', e => add(`${e.message} @${(e.filename ?? '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', e => add(`promise: ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`));
}
