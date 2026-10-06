import Sheet from './Sheet';

export type InfoKind = 'debts' | 'dreams' | 'settings';

interface Step {
  icon: string;
  title: string;
  text: string;
}

const CONTENT: Record<InfoKind, {
  title: string;
  lead: string;
  steps: Step[];
  example: string;
  exampleLabel: string;
  tip: string;
}> = {
  debts: {
    title: 'Тартиби қарзҳо',
    lead: 'Рӯйхат нишон медиҳад, ки кадом қарзро аввал пардохт кардан лозим аст.',
    steps: [
      { icon: '⭐', title: 'Аввал афзалиятнокҳо', text: 'Қарзҳои бо ⭐ қайдшуда ҳамеша дар боло меоянд.' },
      { icon: '↗️', title: 'Аз хурд ба калон', text: 'Дар ҳар гурӯҳ қарзи хурд аз қарзи калон боло меистад (аз рӯи бақия).' },
      { icon: '🔄', title: 'Худкор нав мешавад', text: 'Пас аз пардохти қисман бақия кам мешавад ва тартиб худаш нав мешавад.' },
      { icon: '✅', title: 'Пардохтшудаҳо', text: 'Қарзи пурра пардохтшуда нест намешавад, ба таби «Пардохтшуда» бо сана мегузарад.' },
    ],
    exampleLabel: 'Мисол',
    example: '⭐ 300 → ⭐ 900 → 50 → 780 → 1 000',
    tip: 'Афзалиятро бо пахши қалами ✎ дар қарз иваз мекунед.',
  },
  dreams: {
    title: 'Тартиби орзуҳо',
    lead: 'Рӯйхат нишон медиҳад, ки кадом орзуро аввал харидан лозим аст.',
    steps: [
      { icon: '⭐', title: 'Аввал афзалиятнокҳо', text: 'Орзуҳои бо ⭐ қайдшуда ҳамеша дар боло меоянд.' },
      { icon: '↗️', title: 'Аз арзон ба қимат', text: 'Дар ҳар гурӯҳ орзуи арзон аз орзуи қимат боло меистад (аз рӯи нарх).' },
      { icon: '💰', title: 'Маблағ аз навбат тақсим мешавад', text: 'Маблағи ҷамъшуда аввал ба орзуи якум меравад, баъд ба дуюм ва ҳамин тавр. Вақте кифоя шуд, «Тайёр ✓» пайдо мешавад.' },
      { icon: '🏠', title: 'Калон ва хурд алоҳида', text: 'Орзуҳои калон ва хурд ҳисоби худро доранд ва ба ҳам таъсир намерасонанд.' },
      { icon: '✅', title: 'Харидшудаҳо', text: 'Орзуи харидашуда нест намешавад, ба таби «Харидшуда» бо нарх ва сана мегузарад.' },
    ],
    exampleLabel: 'Мисол',
    example: '⭐ 2 000 → 1 000 → 3 000 → 4 000',
    tip: 'Барои харидан орзуро пахш кунед, барои таҳрир қалами ✎-ро.',
  },
  settings: {
    title: 'Ҳисобҳо ва фоизҳо',
    lead: 'Ҳар даромад худкор аз рӯи фоизҳо ба ҳисобҳо тақсим мешавад.',
    steps: [
      { icon: '📊', title: 'Фоиз нисбат ба гурӯҳ', text: 'Фоизи ҳар ҳисоб нисбат ба гурӯҳи волидаш аст. Зери ном ҳиссаи он аз ҳар даромад навишта шудааст.' },
      { icon: '🧮', title: 'Боқимонда', text: 'Охирин ҳисоби ҳар гурӯҳ — боқимонда: фоизи он худкор ҳисоб мешавад, то ҷамъ 100% бошад.' },
      { icon: '📂', title: 'Кушодан ва пӯшидан', text: 'Гурӯҳро пахш кунед, то ҳисобҳояш кушода ё пӯшида шаванд. Қалами ✎ — таҳрир.' },
      { icon: '💳', title: 'Пардохти қарз', text: 'Ҳангоми қарз фоизи «Вақтхушӣ» ба ин ҳисоб меравад.' },
      { icon: '🕒', title: 'Танҳо барои даромадҳои нав', text: 'Тағйироти фоизҳо ба даромадҳои пештара таъсир намерасонад.' },
    ],
    exampleLabel: 'Нигоҳдорӣ',
    example: 'Маълумот танҳо дар ҳамин дастгоҳ нигоҳ дошта мешавад.',
    tip: 'Бо тугмаи «Ҳисоби нав» ҳисоби иловагӣ илова мекунед.',
  },
};

/** Варақаи маълумот бо тарҳи махсус: тартиби ҷойгиршавии рӯйхат. */
export default function InfoSheet({ kind, onClose }: { kind: InfoKind; onClose: () => void }) {
  const c = CONTENT[kind];
  return (
    <Sheet title={c.title} onClose={onClose}>
      <div className="info">
        <div className="info-lead">
          <span className="info-badge">ℹ️</span>
          <p>{c.lead}</p>
        </div>

        <ol className="info-steps">
          {c.steps.map((s, i) => (
            <li key={s.title}>
              <span className="info-num">{i + 1}</span>
              <div>
                <b>{s.icon} {s.title}</b>
                <small>{s.text}</small>
              </div>
            </li>
          ))}
        </ol>

        <div className="info-example">
          <small>{c.exampleLabel}</small>
          <b>{c.example}</b>
        </div>

        <p className="info-tip">💡 {c.tip}</p>
        <button className="btn" onClick={onClose}>Фаҳмо</button>
      </div>
    </Sheet>
  );
}
