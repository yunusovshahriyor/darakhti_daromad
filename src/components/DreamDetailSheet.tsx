import { useState } from 'react';
import { fmt, formatEta } from '../model';
import type { Dream } from '../types';
import type { Props } from '../views/props';
import BuyDreamForm from './BuyDreamForm';
import { useConfirm } from './ConfirmSheet';
import DreamForm from './DreamForm';
import DreamSaveSheet from './DreamSaveSheet';
import Sheet from './Sheet';

export interface DreamInfo {
  funded: number;
  ready: boolean;
  rank: number;
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
  const [ask, confirmDialog] = useConfirm();

  const pct = Math.min(100, (info.funded / dream.target) * 100);
  const left = Math.max(0, dream.target - info.funded);

  const save = (v: { title: string; target: number; kind: Dream['kind']; priority: boolean }) => {
    setState(s => ({ ...s, dreams: s.dreams.map(d => (d.id === dream.id ? { ...d, ...v } : d)) }));
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
      <div className="dd">
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

        <h3 className="group-title"><span>Таҳрир</span></h3>
        <DreamForm initial={dream} onSubmit={save} submitLabel="Нигоҳ доштан" />
        <button type="button" className="btn danger" onClick={remove}>Нест кардани орзу</button>
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
