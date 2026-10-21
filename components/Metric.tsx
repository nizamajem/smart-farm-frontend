export default function Metric({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value == null ? '—' : value}
        {value != null && <span className="metric-unit">{unit}</span>}
      </div>
    </div>
  );
}
