export default function StatusPill({ online }: { online: boolean }) {
  return (
    <span className={`pill ${online ? 'ok' : 'off'}`}>
      <span className="dot" />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
