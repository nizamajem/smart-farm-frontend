import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { SensorReading } from '@/lib/types';

export default function TankFlow({ reading }: { reading?: Partial<SensorReading> | null }) {
  const number = (n?: number | null) => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  return <section className="card simple-flow garden-mix" aria-label="Aliran air tandon">
    <div className="simple-heading"><ArrowDownToLine size={28} /><div><h2>Aliran Air</h2><p>Satu sensor keluar: debit dan total larutan terpakai.</p></div></div>
    <div className="garden-status-grid">
      <article className="garden-status"><ArrowDownToLine /><span>Larutan terpakai</span><strong>{number(reading?.flowOutTotal)} <small>liter</small></strong><small>Total dari sensor keluar</small></article>
      <article className="garden-status"><ArrowUpFromLine /><span>Air nutrisi keluar</span><strong>{number(reading?.flowOut)} <small>L/menit</small></strong><small>Dari tandon ke tanaman</small></article>
    </div>
    {reading?.flowOutTotal == null && reading?.flowOut == null && <small className="muted">Sensor aliran belum terhubung.</small>}
  </section>;
}
