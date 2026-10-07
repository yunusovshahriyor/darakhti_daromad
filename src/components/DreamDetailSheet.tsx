import { useState } from 'react';
import { ACCOUNTS, fmt, formatEta } from '../model';
import { LADDER_WEEKS, monthsUntil, topCuts } from '../dreams';
import type { Dream } from '../types';
import type { Props } from '../views/props';
import BuyDreamForm from './BuyDreamForm';
import { useConfirm } from './ConfirmSheet';
import DreamForm from './DreamForm';
import type { DreamValues } from './DreamForm';
import DreamSaveSheet from './DreamSaveSheet';
import Sheet from './Sheet';

export interface DreamInfo {
  funded: number;
  ready: boolean;
  rank: number;
  /** Маблағи то нарх боқимонда (бо назардошти навбат). */
  need: number;
  /** Моҳҳои боқимонда бо суръати ҳозира (0 — маълум нест). */
  months: number;
  rate: number;
  extra: number;
  faster: number;
}

/** Саҳифаи орзу: ҳолат, муддат, ҷамъкунӣ, харид ва таҳрир дар як ҷо. */
export default function DreamDetailSheet({ state, setState, dream, info, onClose, onToast }: Props & {
  dream: Dream;
  info: DreamInfo;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ask, confirmDialog] = useConfirm();

  const pct = Math.min(100, (info.funded / dream.target) * 100);
  const left = Math.max(0, dream.target - info.funded);
  const color = dream.color ?? 'var(--primary)';

  // Санаи мақсад: ҳар моҳ чӣ қадар лозим аст
  const monthsLeft = dream.deadline ? monthsUntil(dream.deadline) : 0;
  const perMonth = dream.deadline && info.need > 0 ? (monthsLeft <= 0.03 ? info.need : info.need / monthsLeft) : 0;
  const behind = dream.deadline ? info.need > 0.005 && info.rate < perMonth * 0.9 : false;

  // «Чӣ кам кунем?»
  const cuts = info.need > 0 && info.rate > 0 ? topCuts(state.expenses) : [];
  const auto = dream.autoSave;

  const save = (v: DreamValues) => {
    setState(s => ({
      ...s,
      // Майдонҳои иловагиро, ки холӣ шудаанд, бояд пок кард (`undefined` ба ҷойи пештара нигоҳ намедорад)
      dreams: s.dreams.map(d => (d.id === dream.id ? { ...d, ...v, deadline: v.deadline, image: v.image, color: v.color, link: v.link, note: v.note, incomeShare: v.incomeShare, autoSave: v.autoSave } : d)),
    }));
    onToast('Орзу нигоҳ дошта шуд ✓');
    onClose();
  };

  const remove = async () => {
    const ok = await ask({
      title: 'Нест кардани орзу',
      text: `Орзуи «${dream.title}» нест мешавад. Маблағи ҷамъшуда дар ҳисоби орзуҳо мемонад.`,
      ok: 'Нест кардан',
      danger: true,
    });
    if (!ok) return;
    setState(s => ({ ...s, dreams: s.dreams.filter(d => d.id !== dream.id) }));
    onClose();
  };

  return (
    <Sheet title={dream.title} eyebrow={dream.kind === 'big' ? '🏠 Орзуи калон' : '✈️ Орзуи хурд'} onClose={onClose} tall>
      <div className="dd" style={{ '--dc': color } as React.CSSProperties}>
        {editing ? (
          <DreamForm formId="dream-edit" hideSubmit initial={dream} state={state} onSubmit={save} submitLabel="Нигоҳ доштан" />
        ) : (
          <>
        {dream.image && <div className="dd-img" style={{ backgroundImage: `url(${dream.image})` }} />}
        <section className="dd-hero">
          <div className="dd-pct">{Math.floor(pct)}<small>%</small></div>
          <div className="dd-bar"><i style={{ width: `${pct}%` }} /></div>
          <div className="dd-line"><span>Ҷамъшуда</span><b>{fmt(info.funded)} аз {fmt(dream.target)}</b></div>
          {!info.ready && <div className="dd-line"><span>Боқӣ</span><b>{fmt(left)}</b></div>}
          <div className="dd-line">
            <span>Навбат</span>
            <b>№ {info.rank}{dream.priority ? ' · ⭐ афзалиятнок' : ' · аз рӯи нарх'}</b>
          </div>
        </section>

        <section className="dd-eta">
          {info.ready ? (
            <div className="dd-ready">🎉 Маблағ кифоя аст — метавонед харед!</div>
          ) : info.rate > 0 ? (
            <>
              <div className="dd-eta-main">⏳ {formatEta(info.months)}</div>
              <small>Бо суръати ҳозира, тақрибан {fmt(Math.round(info.rate))} дар моҳ</small>
              {info.months - info.faster >= 1 && (
                <small className="hl">Бо +{fmt(info.extra)} дар моҳ: {formatEta(info.faster)}</small>
              )}
            </>
          ) : (
            <small>Муддат пас аз аввалин ҷамъкунӣ ҳисоб мешавад.</small>
          )}
        </section>

        {dream.deadline && (
          <section className={behind ? 'dd-card warn' : 'dd-card ok'}>
            <b>📅 То {dream.deadline.split('-').reverse().join('.')}</b>
            {info.need <= 0.005 ? (
              <small>Нарх пурра ҷамъ шудааст.</small>
            ) : monthsLeft <= 0.03 ? (
              <small>Муҳлат расид. Боқӣ: {fmt(info.need)}.</small>
            ) : (
              <>
                <small>{formatEta(monthsLeft)} мондааст · ҳар моҳ лозим: <b>{fmt(Math.ceil(perMonth))}</b></small>
                <small>
                  Ҳозир ҷамъ мешавад: {fmt(Math.round(info.rate))} дар моҳ —{' '}
                  {behind ? `⚠️ аз реҷа мондед, ${fmt(Math.ceil(perMonth - info.rate))} дар моҳ зиёд кунед` : '✅ дар реҷа'}
                </small>
              </>
            )}
          </section>
        )}

        {info.need > 0 && info.rate > 0 && (
          <section className="dd-card">
            <b>✂️ Чӣ кам кунем?</b>
            {cuts.length === 0 ? (
              <small>Ҳангоми сабти хароҷот категория интихоб кунед — ман мегӯям, аз куҷо кам кардан беҳтар аст.</small>
            ) : cuts.map(c => {
              const faster = info.need / (info.rate + c.saves);
              const gain = Math.floor(info.months - faster);
              return (
                <small key={c.category}>
                  «{c.category}»-ро 20% кам кунед (−{fmt(Math.round(c.saves))} дар моҳ):{' '}
                  {gain >= 1 ? <b className="hl">орзу {gain} моҳ барвақттар меояд</b> : 'орзу каме барвақттар меояд'}
                </small>
              );
            })}
          </section>
        )}

        {auto && (
          <section className="dd-card">
            <b>🔁 {auto.every === 'week' ? 'Ҳар ҳафта' : 'Ҳар моҳ'}{auto.ladder ? ' · бозии 52 ҳафта' : `: ${fmt(auto.amount)}`}</b>
            <small>Аз «{ACCOUNTS[auto.from]?.name}» · то ҳол {auto.count} маротиба гузошта шуд</small>
            {auto.ladder && (
              <div className="ladder">
                {Array.from({ length: LADDER_WEEKS }, (_, i) => (
                  <i key={i} className={i < auto.count ? 'on' : ''} title={`Ҳафтаи ${i + 1}: ${fmt(auto.amount * (i + 1))}`} />
                ))}
              </div>
            )}
          </section>
        )}

        {(dream.link || dream.note) && (
          <section className="dd-card">
            {dream.note && <small>📝 {dream.note}</small>}
            {dream.link && (
              <button type="button" className="dd-link" onClick={() => {
                const u = /^https?:\/\//i.test(dream.link!) ? dream.link! : `https://${dream.link}`;
                window.open(u, '_blank', 'noopener');
              }}>🔗 Кушодани истинод</button>
            )}
          </section>
        )}

        <div className="dd-actions">
          <button type="button" className="dd-add" onClick={() => setSaving(true)}>
            <span>＋</span> Ҷамъ кардан
          </button>
        </div>

        <section className={info.ready ? 'dd-buy ready' : 'dd-buy'}>
          <div className="dd-buy-t">
            <b>🛒 Харидани орзу</b>
            <small>{info.ready ? 'Нарх пурра ҷамъ шудааст' : `То пурра шудан боқӣ: ${fmt(left)}`}</small>
          </div>
          <button type="button" onClick={() => setBuying(true)}>Харидан</button>
        </section>

          </>
        )}

        <div className="dd-bar-actions">
          <button type="button" className={editing ? 'on' : ''} onClick={() => setEditing(e => !e)}>
            {editing ? '← Маълумот' : '✎ Таҳрир'}
          </button>
          {editing
            ? <button type="submit" form="dream-edit" className="save">✓ Нигоҳ доштан</button>
            : <button type="button" className="del" onClick={remove}>🗑 Нест кардан</button>}
        </div>
      </div>

      {confirmDialog}
      {saving && (
        <DreamSaveSheet state={state} setState={setState} dream={dream}
          onClose={() => setSaving(false)} onDone={onToast} />
      )}
      {buying && (
        <Sheet title={`Харид: ${dream.title}`} onClose={() => setBuying(false)}>
          <BuyDreamForm state={state} setState={setState} dream={dream}
            defaultSource={dream.kind === 'big' ? 'bigDream' : 'smallDream'}
            onDone={() => { setBuying(false); onClose(); }} />
        </Sheet>
      )}
    </Sheet>
  );
}
