import { Droplets, Leaf, Thermometer } from 'lucide-react';
import { formatValue } from '@/lib/format';
import type { SensorReading } from '@/lib/types';

export const METRIC_DEFS = [
  { key: 'temperature', label: 'Suhu', unit: '°C', Icon: Thermometer, color: 'var(--c-temp)' },
  { key: 'humidity', label: 'Kelembapan udara', unit: '%', Icon: Droplets, color: 'var(--c-hum)' },
] as const;

export default function Metric({ def, value }: { def: (typeof METRIC_DEFS)[number]; value: number | null | undefined }) {
  const text = formatValue(value, def.unit);
  const { Icon } = def;
  return (
    <div className="metric">
      <div className="metric-icon" style={{ color: def.color }}>
        <Icon size={17} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="metric-label">{def.label}</div>
        <div className="metric-value">
          {text ?? '—'}
          {text && <span className="metric-unit">{def.unit}</span>}
        </div>
      </div>
    </div>
  );
}

export function MetricGrid({ reading, wide }: { reading: SensorReading | null | undefined; wide?: boolean }) {
  return (
    <div className={`metrics ${wide ? 'wide' : ''}`}>
      {METRIC_DEFS.map((d) => (
        <Metric key={d.key} def={d} value={reading?.[d.key]} />
      ))}
    </div>
  );
}

export function WaterMetricGrid({ reading }: { reading: SensorReading | null | undefined }) {
  const metrics = [
    { key: 'ph', label: 'pH air', unit: '', Icon: Droplets, color: 'var(--primary)' },
    { key: 'conductivity', label: 'EC', unit: 'µS/cm', Icon: Leaf, color: 'var(--info)' },
    { key: 'tds', label: 'TDS', unit: 'ppm', Icon: Droplets, color: 'var(--c-hum)' },
    { key: 'temperature', label: 'Suhu air', unit: '°C', Icon: Thermometer, color: 'var(--c-temp)' },
  ] as const;
  return <div className="metrics">{metrics.map(({ key, label, unit, Icon, color }) => <div className="metric" key={key}>
    <div className="metric-icon" style={{ color }}><Icon size={17} /></div>
    <div><div className="metric-label">{label}</div><div className="metric-value">{reading?.[key] == null ? '—' : reading[key]!.toLocaleString('id-ID', { maximumFractionDigits: 2 })}<span className="metric-unit">{unit}</span></div></div>
  </div>)}</div>;
}
