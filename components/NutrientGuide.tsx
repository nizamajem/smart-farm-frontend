'use client';

import { useEffect, useState } from 'react';
import type { SensorReading } from '@/lib/types';

const CROPS = [
  { name: 'Selada', ph: [6, 7], ec: [1.2, 1.8] },
  { name: 'Bayam', ph: [6, 7], ec: [1.8, 2.3] },
  { name: 'Tomat', ph: [6, 6.5], ec: [2, 4] },
];
const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });

export function WaterGuide({ reading, online }: { reading?: Partial<SensorReading> | null; online: boolean }) {
  const [cropIndex, setCropIndex] = useState(0);
  const [scale, setScale] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const crop = CROPS[cropIndex];
  const age = reading?.createdAt ? Math.max(now, Date.now()) - Date.parse(reading.createdAt) : NaN;
  const fresh = Boolean(online && age >= 0 && age < 5 * 60_000);
  const factor = scale ? Number(scale) : null;
  return <section className="garden-guide" aria-label="Panduan kondisi air">
    <div className="garden-welcome"><span aria-hidden="true">🌱</span><div><h3>Yuk, cek air tanamanmu!</h3><p>Pilih tanaman, lalu lihat dua angka penting ini.</p></div></div>
    <div className="form-grid">
      <label className="field">Tanaman yang dirawat<select value={cropIndex} onChange={e => setCropIndex(Number(e.target.value))}>{CROPS.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}</select></label>
      <label className="field">Skala TDS pada alat<select value={scale} onChange={e => setScale(e.target.value)}><option value="">Belum tahu skala alat</option><option value="500">ppm 500</option><option value="700">ppm 700</option></select><span className="hint">Cek manual alat. Skala berbeda menghasilkan angka ppm berbeda.</span></label>
    </div>
    <div className="garden-status-grid">
      <Status name="Keasaman air · pH" number={reading?.ph} range={crop.ph} unit="" fresh={fresh} valid={reading?.ph == null || (reading.ph >= 0 && reading.ph <= 14)} low="Air terlalu asam. Periksa kalibrasi sebelum menyesuaikan pH sedikit demi sedikit." high="Air terlalu basa. Periksa kalibrasi sebelum menyesuaikan pH sedikit demi sedikit." />
      <Status name="Kepekatan larutan · TDS" number={reading?.tds} range={factor ? crop.ec.map(n => n * factor) : null} unit="ppm" fresh={fresh} valid={reading?.tds == null || reading.tds >= 0} low="Di bawah patokan. Periksa alat dan resep nutrisi sebelum menambah larutan bertahap." high="Di atas patokan. Periksa alat; pengenceran bertahap dapat diperlukan, lalu ukur kembali." />
    </div>
    <p className="garden-footnote">Patokan awal untuk {crop.name.toLowerCase()}, bukan jaminan semua unsur nutrisi seimbang. Sesuaikan dengan fase tumbuh dan panduan budidaya. EC acuan: {crop.ec.map(fmt).join('–')} mS/cm.</p>
    <details><summary>Dari mana patokannya?</summary><p>Rentang pH dan EC: <a href="https://extension.okstate.edu/fact-sheets/electrical-conductivity-and-ph-guide-for-hydroponics" target="_blank" rel="noreferrer">Oklahoma State University, Tabel 2</a>. TDS dihitung dari EC × skala 500 atau 700 menurut <a href="https://global.bluelab.com/pages/conductivity-ec-nutrient-strength" target="_blank" rel="noreferrer">panduan Bluelab</a>. TDS menunjukkan zat terlarut secara keseluruhan. Atur kepekatan dahulu, kemudian periksa pH setelah air tercampur.</p></details>
  </section>;
}

function Status({ name, number, range, unit, fresh, valid, low, high }: { name: string; number?: number | null; range: number[] | null; unit: string; fresh: boolean; valid: boolean; low: string; high: string }) {
  const exists = number != null && Number.isFinite(number);
  const state = !exists ? 'empty' : !valid ? 'invalid' : !fresh ? 'old' : !range ? 'scale' : number < range[0] ? 'low' : number > range[1] ? 'high' : 'ok';
  const labels = { empty: 'Belum terbaca', invalid: 'Periksa alat', old: 'Perlu data terbaru', scale: 'Pilih skala alat', low: 'Rendah', high: 'Tinggi', ok: 'Aman · dalam patokan' };
  const help = { empty: 'Menunggu angka dari sensor.', invalid: 'Angka di luar skala pengukuran yang valid.', old: 'Data lebih dari 5 menit, waktu tidak valid, atau alat terputus. Tunggu data baru sebelum mengambil keputusan.', scale: 'Pilih skala TDS untuk membandingkan angka dengan patokan.', low, high, ok: 'Sudah dalam patokan. Terus pantau secara berkala, ya!' };
  return <article className={`garden-status garden-status-${state}`}><span>{name}</span><strong>{exists ? fmt(number) : '—'} <small>{unit}</small></strong><b>{state === 'ok' ? '✓ ' : ''}{labels[state]}</b><p>{help[state]}</p>{range && <div className="garden-range"><span>Rendah<br />&lt; {fmt(range[0])}</span><span>Aman<br />{range.map(fmt).join('–')}</span><span>Tinggi<br />&gt; {fmt(range[1])}</span></div>}</article>;
}

export function MixPlanner({ pumps }: { pumps: Partial<Record<number, { seconds: string; volume: string }>> }) {
  const [liters, setLiters] = useState('');
  const [doseA, setDoseA] = useState('');
  const [doseB, setDoseB] = useState('');
  const [newWater, setNewWater] = useState(false);
  const valid = newWater && [liters, doseA, doseB].every(n => n.trim() && Number.isFinite(Number(n)) && Number(n) > 0) && [doseA, doseB].every(n => Number.isFinite(Number(n) * Number(liters)));
  return <section className="card garden-mix" aria-label="Rencana campuran AB mix">
    <div className="garden-welcome"><span aria-hidden="true">🧪</span><div><h2>Racik nutrisi, langkah demi langkah</h2><p>Untuk membuat larutan baru dari air yang belum diberi nutrisi.</p></div></div>
    <label className="calibration-agree"><input type="checkbox" checked={newWater} onChange={e => setNewWater(e.target.checked)} />Air ini belum diberi nutrisi AB mix.</label>
    <div className="form-grid"><label className="field">1. Berapa liter airnya?<input type="number" inputMode="decimal" min="0.01" step="any" placeholder="Contoh: 20" value={liters} onChange={e => setLiters(e.target.value)} /><span className="hint">Masukkan jumlah air yang benar-benar ada di tangki.</span></label><div><b>2. Ikuti takaran pada kemasan</b><p>Isi dosis masing-masing larutan. A dan B tidak selalu sama.</p></div><label className="field">Dosis A (ml per liter)<input type="number" inputMode="decimal" min="0.01" step="any" placeholder="Lihat petunjuk produk" value={doseA} onChange={e => setDoseA(e.target.value)} /></label><label className="field">Dosis B (ml per liter)<input type="number" inputMode="decimal" min="0.01" step="any" placeholder="Lihat petunjuk produk" value={doseB} onChange={e => setDoseB(e.target.value)} /></label></div>
    <h3>3. Ini kebutuhan campuranmu</h3>
    <div className="garden-status-grid" aria-live="polite">{[doseA, doseB].map((dose, i) => { const ml = Number(liters) * Number(dose); const pump = pumps[i]; const rate = pump ? Number(pump.volume) / Number(pump.seconds) : 0; return <article className="garden-status" key={i}><span>Larutan {i === 0 ? 'A' : 'B'}</span><strong>{valid ? fmt(ml) : '—'} <small>ml</small></strong><p>{valid && rate > 0 ? `Perkiraan ${fmt(ml / rate)} detik berdasarkan catatan pompa.` : 'Isi data di atas. Catat debit pompa untuk melihat perkiraan durasi.'}</p></article>; })}</div>
    {!newWater && <p>Sudah ada nutrisi di tangki? Gunakan menu Cek Air sebelum melakukan koreksi.</p>}
    <div className="garden-next"><b>🌿 Setelah ditakar</b><p>Masukkan A ke air dan aduk, lalu masukkan B dan aduk kembali. Jangan campur pekatan A dan B langsung. Tunggu pembacaan stabil, lalu buka Cek Air.</p></div>
    <p className="garden-footnote">Ini kalkulator takaran. Pompa tidak menyala dari form ini. Pencampuran otomatis belum tersedia.</p>
  </section>;
}
