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

interface CapacitorGlobal { isNativePlatform?: () => boolean; getPlatform?: () => string; registerPlugin?: (name: string) => unknown }

let cached: OverlayApi | null | undefined;

/** Тугмаи шино: танҳо дар APK-и Android. */
export function overlayApi(): OverlayApi | null {
  if (cached !== undefined) return cached;
  const c = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  cached = c?.isNativePlatform?.() && c.getPlatform?.() === 'android' && c.registerPlugin ? (c.registerPlugin('Overlay') as OverlayApi) : null;
  return cached;
}
