import Sheet from './Sheet';

/** Интихоби услуби кор (дар оғози кор барои корбари нав). */
export default function ModeChooser({ onPick }: { onPick: (m: 'system' | 'free') => void }) {
  return (
    <Sheet title="Чӣ тавр кор кардан мехоҳед?" onClose={() => onPick('system')}>
      <p className="note">Дар ҳар вақт онро дар Танзимот иваз кардан мумкин аст, маълумоти шумо намемирад.</p>
      <div className="cells">
        <button className="cell tap link" onClick={() => onPick('system')}>
          <div className="ic">🌳</div>
          <div className="grow">
            <b>Системаи Саидмурод Давлатов</b>
            <small>Даромад худкор аз рӯи фоиз ба ҳисобҳо тақсим мешавад: садақа, волидон, оянда, қарз, сармоя, орзу ва ғайра.</small>
          </div>
        </button>
        <button className="cell tap link" onClick={() => onPick('free')}>
          <div className="ic">💼</div>
          <div className="grow">
            <b>Ба тарзи худам</b>
            <small>Ҳисобҳои худатонро месозед (Нақд, Корт…), даромадро ба ҳисоби дилхоҳ медиҳед, бе фоиз ва тақсими худкор.</small>
          </div>
        </button>
      </div>
    </Sheet>
  );
}
