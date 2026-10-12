import { useState } from 'react';
import { useConfirm } from '../components/ConfirmSheet';
import VideoPlayer from '../components/VideoPlayer';
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
        <VideoPlayer videoId={TRAINING_ID} title={g.videoTitle}
          labels={{ play: g.vPlay, pause: g.vPause, stop: g.vStop, expand: g.vExpand, shrink: g.vShrink, hint: g.playHint }} />
        <a className="gv-link" href={TRAINING_URL} target="_blank" rel="noopener noreferrer" onClick={open}>{g.videoFallback}</a>
      </section>

      <section className="gs">
        <header className="gs-head"><span className="gs-ic">⚖️</span><h3>{g.cmpTitle}</h3></header>
        <div className="gcmp">
          <div className="gcmp-h">
            <span />
            <b className={free ? '' : 'on'}>🌳 {g.cmpHead[1]}</b>
            <b className={free ? 'on' : ''}>💼 {g.cmpHead[2]}</b>
          </div>
          {g.cmp.map(([k, a, b]) => (
            <div className="gcmp-r" key={k}>
              <em>{k}</em>
              <p className={free ? '' : 'on'}>{a}</p>
              <p className={free ? 'on' : ''}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="gs">
        <header className="gs-head"><span className="gs-ic">🌳</span><h3>{g.sysTitle}</h3></header>
        <p className="gs-p">{g.sysIntro}</p>
        <h4 className="gs-sub">{g.stepsTitle}</h4>
        <ol className="gsteps">
          {g.steps.map(([t, d]) => (
            <li key={t}><b>{t}</b><span>{d}</span></li>
          ))}
        </ol>
      </section>

      <section className="gs">
        <header className="gs-head"><span className="gs-ic">🧮</span><h3>{g.calcTitle}</h3></header>
        <p className="gs-p">{g.calcHint}</p>
        <div className="gcalc">
          <label className="gcalc-in">
            <span>{g.calcLabel}</span>
            <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
          </label>
          <button className={debt ? 'gcalc-chip on' : 'gcalc-chip'} onClick={() => setDebt(d => !d)} aria-pressed={debt}>
            {debt ? '✓ ' : ''}{g.calcDebt}
          </button>
        </div>
        <div className="gsplit">
          {SPLIT_ORDER.map(id => {
            const p = pct[id] ?? 0;
            return (
              <div className={p > 0 ? 'gsplit-r' : 'gsplit-r zero'} key={id}>
                <span className="gsplit-ic">{ICON[id]}</span>
                <div className="gsplit-m">
                  <div className="gsplit-t"><b>{g.tree[id]}</b><span>{fmt(Math.round((split[id] ?? 0) * 100) / 100)}</span></div>
                  <div className="gsplit-bar"><i style={{ width: `${Math.min(100, p * 2.2)}%` }} /></div>
                  <small>{fmt(Math.round(p * 100) / 100)}%</small>
                </div>
              </div>
            );
          })}
        </div>
        <p className="gs-note">{g.calcNote}</p>
      </section>

      <section className="gs">
        <header className="gs-head"><span className="gs-ic">📌</span><h3>{g.rulesTitle}</h3></header>
        <ul className="grules">{g.rules.map(r => <li key={r}>{r}</li>)}</ul>
      </section>

      <section className="gs">
        <header className="gs-head"><span className="gs-ic">💼</span><h3>{g.freeTitle}</h3></header>
        <p className="gs-p">{g.freeIntro}</p>
        <ul className="grules">{g.free.map(r => <li key={r}>{r}</li>)}</ul>
      </section>

      <section className="gs">
        <header className="gs-head"><span className="gs-ic">💬</span><h3>{g.faqTitle}</h3></header>
        <div className="gfaq">
          {g.faq.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      <p className="gs-foot">{g.note}</p>
      {confirmDialog}
    </div>
  );
}
