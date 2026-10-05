export default function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty">
      <span className="icon">{icon}</span>
      {text}
    </div>
  );
}
