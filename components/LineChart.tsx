import { Activity } from 'lucide-react';
import type { SensorReading } from '@/lib/types';

type Key = 'temperature' | 'humidity';

const SERIES: { key: Key; label: string; color: string; unit: string }[] = [
  { key: 'temperature', label: 'Suhu', color: 'var(--c-temp)', unit: '°C' },
  { key: 'humidity', label: 'Kelembapan udara', color: 'var(--c-hum)', unit: '%' },
];

const W = 640;
const H = 220;
const PAD = { l: 34, r: 10, t: 10, b: 24 };

/** Grafik garis SVG sederhana tanpa library. Sumbu Y 0..100 cukup untuk °C dan %. */
export default function LineChart({ readings }: { readings: SensorReading[] }) {
  if (readings.length < 2) {
    return (
      <div className="empty" style={{ padding: '32px 16px' }}>
        <div className="empty-icon">
          <Activity size={24} />
        </div>
        <p className="muted">Grafik muncul setelah perangkat mengirim minimal 2 data sensor.</p>
      </div>
    );
  }

  const x = (i: number) => PAD.l + (i / (readings.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - Math.min(Math.max(v, 0), 100) / 100) * (H - PAD.t - PAD.b);
  const time = (s: string) => new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const ticks = [0, Math.floor((readings.length - 1) / 2), readings.length - 1];
  const present = SERIES.filter((s) => readings.some((r) => r[s.key] != null));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Grafik riwayat sensor">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="gridline" />
            <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" className="axis">
              {v}
            </text>
          </g>
        ))}
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === readings.length - 1 ? 'end' : 'middle'} className="axis">
            {time(readings[i].createdAt)}
          </text>
        ))}
        {present.map((s) => {
          const pts = readings
            .map((r, i) => (r[s.key] == null ? null : `${x(i).toFixed(1)},${y(r[s.key]!).toFixed(1)}`))
            .filter(Boolean)
            .join(' ');
          return (
            <polyline key={s.key} points={pts} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" />
          );
        })}
      </svg>
      <div className="legend">
        {present.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} />
            {s.label} ({s.unit})
          </span>
        ))}
      </div>
    </div>
  );
}
