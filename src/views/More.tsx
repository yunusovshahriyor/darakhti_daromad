import { ChevronIcon } from '../components/Icons';
import { fmt, hasDebt, remaining } from '../model';
import type { Props } from './props';

export type Sub = 'dreams' | 'debts' | 'settings';

interface MoreProps extends Props {
  open: (s: Sub) => void;
  canInstall: boolean;
  install: () => void;
  standalone: boolean;
  ios: boolean;
}

export default function More({ state, open, canInstall, install, standalone, ios }: MoreProps) {
  const left = state.debts.reduce((s, d) => s + remaining(d), 0);

  return (
    <>
      <div className="cells">
        <button className="cell tap link" onClick={() => open('dreams')}>
          <div className="ic">✨</div>
          <div className="grow">
            <b>Орзуҳо</b>
            <small>{state.dreams.length ? `${state.dreams.length} орзу` : 'Ҳадафҳои худро илова кунед'}</small>
          </div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => open('debts')}>
          <div className="ic">💳</div>
          <div className="grow">
            <b>Қарзҳо</b>
            <small>{hasDebt(state.debts) ? `Бақия: ${fmt(left)} сомонӣ` : 'Қарз нест'}</small>
          </div>
          <ChevronIcon />
        </button>
        <button className="cell tap link" onClick={() => open('settings')}>
          <div className="ic">⚙️</div>
          <div className="grow">
            <b>Танзимот</b>
            <small>Фоизҳои тақсим, маълумот</small>
          </div>
          <ChevronIcon />
        </button>
      </div>

      {!standalone && (canInstall || ios) && (
        <>
          <h3 className="group-title">Барнома</h3>
          <div className="cells">
            {canInstall ? (
              <button className="cell tap link" onClick={install}>
                <div className="ic">📲</div>
                <div className="grow">
                  <b>Насб кардан</b>
                  <small>Ба экрани асосӣ илова кунед</small>
                </div>
                <ChevronIcon />
              </button>
            ) : (
              <div className="cell">
                <div className="ic">📲</div>
                <div className="grow">
                  <b>Насб кардан</b>
                  <small>Тугмаи «Мубодила» (↑) → «Add to Home Screen»</small>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
