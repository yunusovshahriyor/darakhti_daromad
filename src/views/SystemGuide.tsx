import { useState } from 'react';
import { useConfirm } from '../components/ConfirmSheet';
import { GUIDE, TRAINING_ID, TRAINING_URL } from '../guideText';
import { currentLang } from '../i18n';
import { DEFAULT_ACCOUNTS, allocate, defaultTree, fmt, isFree, toFreeMode, toSystemMode } from '../model';
import { openInBrowser, inTelegram } from '../tg';
import type { Props } from './props';

const SPLIT_ORDER = ['charity', 'parents', 'future', 'debt', 'fun', 'capital', 'bigDream', 'smallDream', 'living'];
const ICON = Object.fromEntries(DEFAULT_ACCOUNTS.map(a => [a.id, a.icon]));

/** Саҳифаи шарҳ: ду система, тарзи кори системаи Давлатов, калкулятор, саволҳо ва гузариш аз як система ба дигар. */
export default function SystemGuide({ state, setState, onToast }: Props & { onToast: (m: string) => void }) {
  const g = GUIDE[currentLang()];
  const free = isFree(state);
  const [amount, setAmount] = useState('1000');
  const [debt, setDebt] = useState(false);
  const num = Math.max(0, parseFloat(amount.replace(',', '.')) || 0);
  const split = allocate(num, defaultTree(), debt);
  const pct = allocate(100, defaultTree(), debt);

  const open = (e: React.MouseEvent) => {
    if (inTelegram()) { e.preventDefault(); openInBrowser(TRAINING_URL); }
  };
  const [ask, confirmDialog] = useConfirm();
  const [play, setPlay] = useState(false);
  const swap = async () => {
    const ok = await ask({ title: g.confirmTitle, text: free ? g.confirmToSystem : g.confirmToFree, ok: g.confirmOk });
    if (!ok) return;
    setState(s => (isFree(s) ? toSystemMode(s) : toFreeMode(s)));
    onToast(free ? g.switched : g.switchedFree);
  };

  return (
    <div className="guide">
      <section className="guide-hero">
        <span className="gh-glow" aria-hidden />
        <h2>{g.heroTitle}</h2>
        <p>{g.heroText}</p>
        <div className="gh-modes">
          {g.cards.map((c, i) => {
            const on = (i === 1) === free;
            return (
              <button key={c.title} className={on ? 'gh-mode on' : 'gh-mode'} onClick={on ? undefined : swap}
                aria-pressed={on} disabled={on}>
                <span className="gm-ic">{c.icon}</span>
                <b>{c.title}</b>
                <small>{c.text}</small>
                <span className="gm-tag">{on ? `✓ ${g.badgeOn}` : `${g.tapSwitch} →`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="guide-video">
        <div className="gv-head">
          <span className="gc-ic">🎬</span>
          <div><b>{g.videoTitle}</b><p>{g.videoText}</p></div>
        </div>
        <div className="gv-frame">
          {play ? (
            <iframe src={`https://www.youtube-nocookie.com/embed/${TRAINING_ID}?autoplay=1&rel=0&playsinline=1`}
              title={g.videoTitle} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin" />
          ) : (
            <button className="gv-poster" onClick={() => setPlay(true)} aria-label={g.playHint}
              style={{ backgroundImage: `url(https://i.ytimg.com/vi/${TRAINING_ID}/hqdefault.jpg)` }}>
              <span className="gv-play"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
              <small>{g.playHint}</small>
            </button>
          )}
        </div>
        <a className="gv-link" href={TRAINING_URL} target="_blank" rel="noopener noreferrer" onClick={open}>{g.videoFallback}</a>
      </section>

      <h3 className="group-title"><span>{g.cmpTitle}</span></h3>
      <div className="guide-cmp">
        {g.cmp.map(([k, a, b]) => (
          <div className="gcmp-row" key={k}>
            <b>{k}</b>
            <div className={free ? 'gcmp-col' : 'gcmp-col on'}><small>{g.cmpHead[1]}</small>{a}</div>
            <div className={free ? 'gcmp-col on' : 'gcmp-col'}><small>{g.cmpHead[2]}</small>{b}</div>
          </div>
        ))}
      </div>

      <h3 className="group-title"><span>🌳 {g.sysTitle}</span></h3>
      <p className="guide-p">{g.sysIntro}</p>

      <h4 className="guide-h">{g.stepsTitle}</h4>
      <ol className="guide-steps">
        {g.steps.map(([t, d]) => (
          <li key={t}><b>{t}</b><span>{d}</span></li>
        ))}
      </ol>

      <h4 className="guide-h">{g.calcTitle}</h4>
      <p className="guide-p">{g.calcHint}</p>
      <label className="guide-calc">
        <span>{g.calcLabel}</span>
        <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
      </label>
      <label className="guide-check"><input type="checkbox" checked={debt} onChange={e => setDebt(e.target.checked)} /> {g.calcDebt}</label>
      <div className="cells guide-split">
        {SPLIT_ORDER.map(id => (
          <div className="cell" key={id}>
            <div className="ic">{ICON[id]}</div>
            <div className="grow"><b>{g.tree[id]}</b><small>{fmt(Math.round((pct[id] ?? 0) * 100) / 100)}%</small></div>
            <b>{fmt(Math.round((split[id] ?? 0) * 100) / 100)}</b>
          </div>
        ))}
      </div>
      <p className="note">{g.calcNote}</p>

      <h4 className="guide-h">{g.rulesTitle}</h4>
      <ul className="guide-list">{g.rules.map(r => <li key={r}>{r}</li>)}</ul>

      <h3 className="group-title"><span>💼 {g.freeTitle}</span></h3>
      <p className="guide-p">{g.freeIntro}</p>
      <ul className="guide-list">{g.free.map(r => <li key={r}>{r}</li>)}</ul>

      <h3 className="group-title"><span>{g.faqTitle}</span></h3>
      <div className="guide-faq">
        {g.faq.map(([q, a]) => (
          <details key={q}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </div>

      <p className="note">{g.note}</p>
      {confirmDialog}
    </div>
  );
}
