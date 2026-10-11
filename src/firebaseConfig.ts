import type { FirebaseOptions } from 'firebase/app';

/**
 * Танзимоти лоиҳаи Firebase (Project settings → Your apps → Web app → firebaseConfig).
 * Ин қиматҳо оммавӣ ҳастанд ва хавфнок нестанд: амният аз қоидаҳои `firestore.rules` меояд.
 * Агар `null` бошад, корбар дар «Профил» дастӣ ворид мекунад (барои санҷиш).
 */
export const EMBEDDED_CONFIG: FirebaseOptions | null = {
  apiKey: 'AIzaSyCTUYdfwV5KxJGnIyPGpJ9DzovbStplcs8',
  authDomain: 'darakhti-daromad.firebaseapp.com',
  projectId: 'darakhti-daromad',
  storageBucket: 'darakhti-daromad.firebasestorage.app',
  messagingSenderId: '21659404718',
  appId: '1:21659404718:web:0edaba49f6e89bc943a03f',
};

/**
 * Google «Web client ID» (Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration).
 * Оммавӣ аст. Бо он «Google One Tap» (равзанаи интихоби ҳисоб дар болои барнома) фаъол мешавад.
 * Агар холӣ бошад, воридшавӣ бо равзанаи оддии Google (popup) кор мекунад.
 */
export const GOOGLE_CLIENT_ID = '21659404718-jd3c7vpsnjphfnlogjrq2udja3amv68g.apps.googleusercontent.com';
