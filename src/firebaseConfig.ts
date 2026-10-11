import type { FirebaseOptions } from 'firebase/app';

/**
 * Танзимоти лоиҳаи Firebase (Project settings → Your apps → Web app → firebaseConfig).
 * Ин қиматҳо оммавӣ ҳастанд ва хавфнок нестанд: амният аз қоидаҳои `firestore.rules` меояд.
 * Агар `null` бошад, корбар дар «Профил» дастӣ ворид мекунад (барои санҷиш).
 */
export const EMBEDDED_CONFIG: FirebaseOptions | null = null;
