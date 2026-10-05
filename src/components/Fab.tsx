import { PlusIcon } from './Icons';

export default function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="fab" onClick={onClick} aria-label={label}>
      <PlusIcon />
    </button>
  );
}
