import { useEffect, useRef, useState } from 'react';
import { useHistoryLayer } from './useHistoryLayer';

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  destroy(): void;
}
interface YTApi {
  Player: new (el: HTMLElement, opts: {
    videoId: string;
    playerVars: Record<string, number | string>;
    events: { onReady: () => void; onStateChange: (e: { data: number }) => void };
  }) => YTPlayer;
}
declare global {
  interface Window { YT?: YTApi; onYouTubeIframeAPIReady?: () => void }
}

let api: Promise<YTApi> | null = null;
const loadApi = (): Promise<YTApi> => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!api) {
    api = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT as YTApi); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { api = null; reject(new Error('youtube api')); };
      document.head.appendChild(s);
    });
  }
  return api;
};

export interface PlayerLabels { play: string; pause: string; stop: string; expand: string; shrink: string; hint: string }

const I = {
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,
  pause: <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />,
  stop: <path d="M6 6h12v12H6z" fill="currentColor" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
};
const Icon = ({ n }: { n: keyof typeof I }) => <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>{I[n]}</svg>;

/**
 * Плеери худи барнома: видеои YouTube бе интерфейси YouTube; фақат оғоз, таваққуф, қатъ ва калон/хурд кардан.
 * Расми болоӣ ва қабати шаффоф тугмаҳои YouTube-ро пинҳон мекунад ва пахши тасодуфиро намегузорад.
 */
export default function VideoPlayer({ videoId, title, labels, onError }: {
  videoId: string; title: string; labels: PlayerLabels; onError?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [big, setBig] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useHistoryLayer(big, () => resize(false));

  // Калон кардан: ҳамеша қабати пурраи барнома; агар браузер иҷозат диҳад — экрани пурра ва ҳолати уфуқӣ
  const resize = (on: boolean) => {
    setBig(on);
    try {
      if (on) {
        void box.current?.requestFullscreen?.().then(() => (screen.orientation as { lock?: (o: string) => Promise<void> }).lock?.('landscape')).catch(() => {});
      } else {
        screen.orientation?.unlock?.();
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      }
    } catch { /* ignore */ }
  };
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setBig(false); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => () => { try { player.current?.destroy(); } catch { /* ignore */ } player.current = null; }, []);

  const start = async () => {
    if (player.current) { player.current.playVideo(); return; }
    setStatus('loading');
    try {
      const YT = await loadApi();
      const mount = document.createElement('div');
      host.current?.appendChild(mount);
      player.current = new YT.Player(mount, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, cc_load_policy: 0 },
        events: {
          onReady: () => player.current?.playVideo(),
          onStateChange: e => {
            if (e.data === 1) setStatus('playing');
            else if (e.data === 2) setStatus('paused');
            else if (e.data === 0 || e.data === 5) setStatus('idle');
          },
        },
      });
    } catch {
      setStatus('idle');
      onError?.();
    }
  };

  const toggle = () => { if (status === 'playing') player.current?.pauseVideo(); else void start(); };
  const stop = () => { player.current?.stopVideo(); setStatus('idle'); };
  const idle = status === 'idle' || status === 'loading';

  return (
    <div className={big ? 'vp big' : 'vp'} ref={box}>
      <div className="vp-stage">
        <div className="vp-host" ref={host} />
        {/* Қабати шаффоф: ба интерфейси YouTube дастрасӣ намедиҳад */}
        <div className="vp-shield" onClick={() => (idle ? void start() : toggle())} aria-hidden />
        {idle && (
          <button className="vp-poster" onClick={() => void start()} aria-label={labels.play}
            style={{ backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }}>
            <span className="vp-play">{status === 'loading' ? <span className="spin" /> : <Icon n="play" />}</span>
            <small>{labels.hint}</small>
          </button>
        )}
      </div>
      <div className="vp-bar" role="group" aria-label={title}>
        <button onClick={toggle} aria-label={status === 'playing' ? labels.pause : labels.play}>
          <Icon n={status === 'playing' ? 'pause' : 'play'} />
        </button>
        <button onClick={stop} disabled={idle} aria-label={labels.stop}><Icon n="stop" /></button>
        <span className="vp-grow" />
        <button onClick={() => resize(!big)} aria-label={big ? labels.shrink : labels.expand}>
          <Icon n={big ? 'shrink' : 'expand'} />
        </button>
      </div>
    </div>
  );
}
