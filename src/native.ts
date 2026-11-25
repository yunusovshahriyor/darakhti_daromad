import { Capacitor, registerPlugin } from '@capacitor/core';

/** Пули барномаи Android (Capacitor): дар браузер/PWA ҳамеша `null`. Плагини «Overlay» — тугмаи шино болои барномаҳо. */
export interface OverlayApi {
  canDraw(): Promise<{ value: boolean }>;
  requestPermission(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<{ value: boolean }>;
  takePending(): Promise<{ value: string }>;
  /** Номи барномаи кушодашуда дар болои экран: иҷозати «Дастрасӣ ба маълумоти истифода». */
  hasUsageAccess(): Promise<{ value: boolean }>;
  requestUsageAccess(): Promise<void>;
  setAppName(o: { enabled: boolean }): Promise<void>;
  isAppName(): Promise<{ value: boolean }>;
}

let cached: OverlayApi | null | undefined;

/**
 * Тугмаи шино: танҳо дар APK-и Android. `registerPlugin` аз @capacitor/core (ҷузъи бастаи сайт) гирифта мешавад:
 * пули нативӣ дар саҳифаи дурдаст танҳо `window.Capacitor`-ро медиҳад, на `registerPlugin`-ро.
 */
export function overlayApi(): OverlayApi | null {
  if (cached !== undefined) return cached;
  try {
    cached = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' ? registerPlugin<OverlayApi>('Overlay') : null;
  } catch { cached = null; }
  return cached;
}
