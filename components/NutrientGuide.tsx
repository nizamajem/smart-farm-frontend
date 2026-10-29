'use client';
import { useEffect, useState } from 'react';
import { Droplets, FlaskConical, RefreshCw, Calculator, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { SensorReading } from '@/lib/types';

const CROPS = [
  { name: 'Selada', ph: [6, 7], ec: [1.2, 1.8] },
  { name: 'Bayam', ph: [6, 7], ec: [1.8, 2.3] },
  { name: 'Tomat', ph: [6, 6.5], ec: [2, 4] },
];
const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });

export function WaterGuide({ reading, online, deviceId, example = false }: { reading?: Partial<SensorReading> | null; online: boolean; deviceId: number; example?: boolean }) {
  const [cropIndex, setCropIndex] = useState(0);
  const [scale, setScale] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState<{ reading: Partial<SensorReading> | null; online: boolean } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(timer); }, []);
  const current = checked ? checked.reading : reading;
  const age = current?.createdAt ? Math.max(now, Date.now()) - Date.parse(current.createdAt) : NaN;
  const fresh = Boolean((checked ? checked.online : online) && age >= 0 && age < 5 * 60_000);
  const crop = CROPS[cropIndex];
  async function check() {
    setBusy(true); setError('');
    try {
      if (example) setChecked({ reading: reading ?? null, online: true });
      else { const d = await api.device(deviceId); setChecked({ reading: d.latestReading, online: d.online }); }
    } catch { setError('Belum bisa mengambil data. Coba lagi.'); }
    finally { setBusy(false); }
  }
  return <section className="garden-guide simple-flow" aria-label="Cek air">
    <div className="simple-heading"><Droplets size={28} /><div><h2>Cek Air</h2><p>Lihat pH dan kepekatan air.</p></div></div>
    <div className="simple-fields two">
      <label className="field">Tanaman<select value={cropIndex} onChange={e => setCropIndex(Number(e.target.value))}>{CROPS.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}</select></label>
      <label className="field">Skala TDS<select value={scale} onChange={e => setScale(e.target.value)}><option value="">Belum tahu</option><option value="500">ppm 500</option><option value="700">ppm 700</option></select></label>
    </div>
    <button className="btn primary simple-action" onClick={check} disabled={busy}><RefreshCw size={20} />{busy ? 'Mengambil data…' : 'Cek Air Sekarang'}</button>
    {error && <p role="alert">{error}</p>}
    <div className="garden-status-grid" aria-live="polite">
      <Status name="pH" number={current?.ph} range={crop.ph} unit="" fresh={fresh} valid={current?.ph == null || (current.ph >= 0 && current.ph <= 14)} />
      <Status name="TDS" number={current?.tds} range={scale ? crop.ec.map(n => n * Number(scale)) : null} unit="ppm" fresh={fresh} valid={current?.tds == null || current.tds >= 0} />
    </div>
    <small className="muted" role="status">{current?.createdAt ? `Data sensor ${timeAgo(current.createdAt)}` : 'Menunggu data sensor'}</small>
    <details className="simple-help"><summary>Panduan & patokan</summary><p>Skala TDS mengikuti manual alat. Patokan berubah sesuai tanaman dan fase tumbuh. TDS tidak menunjukkan keseimbangan setiap unsur. Cek Air mengambil data terakhir dari server.</p><p>Rujukan: <a href="https://extension.okstate.edu/fact-sheets/electrical-conductivity-and-ph-guide-for-hydroponics" target="_blank" rel="noreferrer">Oklahoma State University</a> dan <a href="https://global.bluelab.com/pages/conductivity-ec-nutrient-strength" target="_blank" rel="noreferrer">Bluelab</a>.</p></details>
  </section>;
}

function Status({ name, number, range, unit, fresh, valid }: { name: string; number?: number | null; range: number[] | null; unit: string; fresh: boolean; valid: boolean }) {
  const exists = number != null && Number.isFinite(number);
  const state = !exists ? 'empty' : !valid ? 'invalid' : !fresh ? 'old' : !range ? 'scale' : number < range[0] ? 'low' : number > range[1] ? 'high' : 'ok';
  const labels = { empty: 'Belum terbaca', invalid: 'Periksa alat', old: 'Data belum terbaru', scale: 'Pilih skala TDS', low: 'Rendah', high: 'Tinggi', ok: 'Aman' };
  return <article className={`garden-status garden-status-${state}`}><span>{name}</span><strong>{exists ? fmt(number) : '—'} <small>{unit}</small></strong><b>{labels[state]}</b>{range && <small>Patokan {range.map(fmt).join('–')} {unit}</small>}</article>;
}

export function MixPlanner({ pumps, onCheckWater }: { pumps: Partial<Record<number, { seconds: string; volume: string }>>; onCheckWater: () => void }) {
  const [liters, setLiters] = useState('');
  const [doseA, setDoseA] = useState('');
  const [doseB, setDoseB] = useState('');
  const [newWater, setNewWater] = useState(false);
  const [result, setResult] = useState<number[] | null>(null);
  const valid = newWater && [liters, doseA, doseB].every(n => n.trim() && Number.isFinite(Number(n)) && Number(n) > 0) && [doseA, doseB].every(n => Number.isFinite(Number(n) * Number(liters)));
  function change(setter: (n: string) => void, value: string) { setter(value); setResult(null); }
  return <section className="card garden-mix simple-flow" aria-label="Campur nutrisi">
    <div className="simple-heading"><FlaskConical size={28} /><div><h2>Campur Nutrisi</h2><p>Isi air dan dosis dari kemasan.</p></div></div>
    <form className="simple-mix-form" onSubmit={e => { e.preventDefault(); if (valid) setResult([Number(liters) * Number(doseA), Number(liters) * Number(doseB)]); }}>
      <div className="simple-fields three">
        <label className="field">Air (liter)<input type="number" inputMode="decimal" min="0" step="any" required placeholder="Contoh: 20" value={liters} onChange={e => change(setLiters, e.target.value)} /></label>
        <label className="field">Dosis A (ml/liter)<input type="number" inputMode="decimal" min="0" step="any" required placeholder="Sesuai kemasan" value={doseA} onChange={e => change(setDoseA, e.target.value)} /></label>
        <label className="field">Dosis B (ml/liter)<input type="number" inputMode="decimal" min="0" step="any" required placeholder="Sesuai kemasan" value={doseB} onChange={e => change(setDoseB, e.target.value)} /></label>
      </div>
      <label className="simple-checkbox"><input type="checkbox" checked={newWater} onChange={e => { setNewWater(e.target.checked); setResult(null); }} /><span>Air belum diberi AB mix</span></label>
      <button className="btn primary simple-action" type="submit" disabled={!valid}><Calculator size={20} />Hitung Takaran</button>
    </form>
    {result && <div className="simple-result" aria-live="polite"><h3>Takaran untuk {fmt(Number(liters))} liter</h3><div className="garden-status-grid">{result.map((ml, i) => { const pump = pumps[i]; const rate = pump ? Number(pump.volume) / Number(pump.seconds) : 0; return <article className="garden-status" key={i}><span>Larutan {i === 0 ? 'A' : 'B'}</span><strong>{fmt(ml)} <small>ml</small></strong>{rate > 0 && Number.isFinite(rate) && <small>± {fmt(ml / rate)} detik</small>}</article>; })}</div><button className="btn simple-action" disabled>Mulai Pompa · belum tersedia</button><button className="btn primary simple-action" onClick={onCheckWater}>Cek Air Setelah Dicampur <ArrowRight size={20} /></button></div>}
    <details className="simple-help"><summary>Cara mencampur</summary><p>A ke air → aduk → B ke air → aduk → cek air. Jangan mencampur pekatan A dan B langsung. Pompa otomatis belum terhubung.</p></details>
  </section>;
}
