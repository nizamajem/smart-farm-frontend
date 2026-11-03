'use client';
import { useEffect, useRef, useState } from 'react';
import { Calculator, FlaskConical, Play, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { loadNutrients } from '@/lib/dosing-calibration';
import type { MixPlan, NutrientStatus, PumpChannel } from '@/lib/types';
const fmt = (n: number | null) => n == null ? '\u2014' : n.toLocaleString('id-ID', { maximumFractionDigits: 3 });
const labels = { running: 'Sedang mencampur', completed: 'Campuran selesai', stopped: 'Campuran dihentikan', failed: 'Campuran gagal' };

export default function MixPlanner({ deviceId, ownerId, onCheckWater, onPumpsSaved }: { deviceId: number; ownerId: number; onCheckWater: () => void; onPumpsSaved?: (data: NutrientStatus) => void }) {
  const [data, setData] = useState<NutrientStatus | null>(null);
  const [liters, setLiters] = useState('');
  const [newWater, setNewWater] = useState(false);
  const [referenceLiters, setReferenceLiters] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [plan, setPlan] = useState<MixPlan | null>(null);
  const [requestId, setRequestId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [editing, setEditing] = useState(false);
  const [pumpEditing, setPumpEditing] = useState<PumpChannel | null>(null);
  const [pumpSeconds, setPumpSeconds] = useState('');
  const [pumpMl, setPumpMl] = useState('');
  async function savePump(e: React.FormEvent) {
    e.preventDefault(); if (!pumpEditing) return;
    setBusy(true); setError('');
    try { const next = await api.saveDosingPump(deviceId, pumpEditing, { seconds: Number(pumpSeconds), ml: Number(pumpMl) }); setData(next); onPumpsSaved?.(next); setPumpEditing(null); setPlan(null); setRequestId(''); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const errorBox = useRef<HTMLDivElement>(null);
  const runError = data?.mix?.status === 'failed' ? data.mix.error : '';
  useEffect(() => { if (error || connectionError || runError) errorBox.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [error, connectionError, runError]);
  const running = data?.mix?.status === 'running' || data?.phDose?.status === 'running';
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try { const d = await loadNutrients(deviceId, ownerId); if (mounted) { setData(d); setConnectionError(''); } }
      catch (e) { if (mounted) setConnectionError(`Kalibrasi belum tersinkron. ${(e as Error).message}`); }
    };
    load(); const timer = setInterval(load, 1500);
    return () => { mounted = false; clearInterval(timer); };
  }, [deviceId, ownerId]);
  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { setData(await api.saveNutrientRecipe(deviceId, { waterLiters: Number(referenceLiters), aMl: Number(a), bMl: Number(b) })); setEditing(false); setPlan(null); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function calculate(start: boolean) {
    setBusy(true); setError('');
    try {
      const next = start && plan ? plan : await api.nutrientPlan(deviceId, Number(liters));
      setPlan(next);
      const key = start && requestId ? requestId : crypto.randomUUID(); setRequestId(key);
      if (start && !next.ready) { setError(next.issues?.join(' ') || 'Relay A dan B belum siap. Periksa pemetaan dan durasi.'); return; }
      if (start) setData(await api.startNutrientMix(deviceId, next, key));
    } catch (e) { setPlan(null); setError((e as Error).message || 'Permintaan gagal. Coba lagi.'); }
    finally { setBusy(false); }
  }
  async function stop() {
    setBusy(true); setError('');
    try { setData(data?.phDose?.status === 'running' ? await api.stopPhDose(deviceId) : await api.stopNutrientMix(deviceId)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const valid = Number(liters) >= .01 && Number(liters) <= 1000000 && Number.isFinite(Number(liters)) && !!data?.recipe && !connectionError;
  const used = !!requestId && data?.mix?.requestId === requestId;
  const recipe = data?.recipe;
  return <section className="card garden-mix simple-flow" aria-label="Campur nutrisi">
    <div className="simple-heading"><FlaskConical size={28} /><div><h2>Campur Nutrisi</h2><p>Air utama dalam liter. Larutan A/B dalam ml.</p></div></div>
    <div className="simple-recipe"><span>{recipe ? `${fmt(recipe.waterLiters)} liter air utama: A ${fmt(recipe.aMl)} ml + B ${fmt(recipe.bMl)} ml` : 'Resep nutrisi belum diatur'}</span><button className="btn" disabled={busy || running} onClick={() => { setReferenceLiters(recipe ? String(recipe.waterLiters) : ''); setA(recipe ? String(recipe.aMl) : ''); setB(recipe ? String(recipe.bMl) : ''); setEditing(!editing); }}>Atur Resep</button></div>
    {data?.legacyRecipe && <div className="alert info">Pengaturan lama memakai detik per liter. Isi ulang resep dalam ml; data lama tetap disimpan.</div>}
    {editing && <form className="simple-mix-form" onSubmit={saveRecipe}><div className="simple-fields three"><label className="field">Air tandon utama (liter)<input type="number" min="0.01" max="1000000" step="any" required value={referenceLiters} onChange={e => setReferenceLiters(e.target.value)} placeholder="Contoh: 1000" /></label><label className="field">Larutan A (ml)<input type="number" min="0.001" max="1000000" step="any" required value={a} onChange={e => setA(e.target.value)} placeholder="Sesuai resep produk" /></label><label className="field">Larutan B (ml)<input type="number" min="0.001" max="1000000" step="any" required value={b} onChange={e => setB(e.target.value)} placeholder="Sesuai resep produk" /></label></div><small>Takaran mengikuti produk dan tanaman. Menyimpan resep tidak menyalakan pompa.</small><button className="btn" disabled={busy || running}>Simpan Resep</button></form>}
    <details className="simple-help"><summary>4 wadah larutan & kalibrasi pompa</summary><div className="garden-status-grid">{([['a', 'Larutan A'], ['b', 'Larutan B'], ['phUp', 'pH Up'], ['phDown', 'pH Down']] as const).map(([channel, label]) => { const pump = data?.pumps?.[channel]; return <article className="garden-status" key={channel}><b>{label}</b><small>{pump ? `${fmt(pump.seconds)} detik menghasilkan ${fmt(pump.ml)} ml` : 'Belum dikalibrasi'}</small><button className="btn" disabled={busy || running} onClick={() => { setPumpEditing(channel); setPumpSeconds(pump ? String(pump.seconds) : ''); setPumpMl(pump ? String(pump.ml) : ''); }}>Kalibrasi {label}</button></article>; })}</div></details>
    {pumpEditing && <form className="simple-mix-form" onSubmit={savePump}><h3>Kalibrasi pompa {({ a: 'A', b: 'B', phUp: 'pH Up', phDown: 'pH Down' })[pumpEditing]}</h3><div className="simple-fields two"><label className="field">Lama relay menyala (detik)<input type="number" min="0.5" max="86400" step="any" required value={pumpSeconds} onChange={e => setPumpSeconds(e.target.value)} /></label><label className="field">Larutan tertampung (ml)<input type="number" min="0.001" max="1000000" step="any" required value={pumpMl} onChange={e => setPumpMl(e.target.value)} /></label></div><small>Isi hasil gelas ukur. Ini volume larutan, bukan liter air tandon utama.</small><button className="btn" disabled={busy || running}>Simpan Kalibrasi Pompa</button></form>}
    <label className="field">Air tandon utama sekarang (liter)<input type="number" min="0.01" step="any" placeholder="Contoh: 10" value={liters} disabled={busy || running} onChange={e => { setLiters(e.target.value); setPlan(null); setRequestId(''); }} /></label>
    <label className="simple-checkbox"><input type="checkbox" checked={newWater} disabled={busy || running} onChange={e => setNewWater(e.target.checked)} /><span>Air belum diberi AB mix</span></label>
    {plan && <div className="garden-status-grid" aria-live="polite"><article className="garden-status"><span>Larutan A</span><strong>{fmt(plan.aMl)} <small>ml</small></strong><small>Relay {fmt(plan.aSeconds)} detik</small></article><article className="garden-status"><span>Larutan B</span><strong>{fmt(plan.bMl)} <small>ml</small></strong><small>Relay {fmt(plan.bSeconds)} detik</small></article></div>}
    {(error || connectionError || runError) && <div className="alert error" role="alert" ref={errorBox} tabIndex={-1}><b>Belum bisa diproses.</b> {error || connectionError || runError}</div>}
    {plan?.issues?.map(issue => <div className="alert info" key={issue}>{issue}</div>)}
    <div className="smart-mcb-actions"><button className="btn" disabled={busy || running || !valid} onClick={() => calculate(false)}><Calculator size={20} />{busy ? 'Memproses…' : 'Hitung Takaran'}</button><button className="btn primary" disabled={busy || running || !valid || !newWater || used || (!!plan && !plan.ready)} onClick={() => calculate(true)}><Play size={20} />Campur Nutrisi</button></div>
    {(running || connectionError) && <button className="btn simple-action" onClick={stop} disabled={busy}><Square size={18} />Hentikan Campuran</button>}
    {data?.mix && <div role="status"><b>{labels[data.mix.status]}</b><p>{fmt(data.mix.liters)} liter · A {fmt(data.mix.aSeconds)} detik · B {fmt(data.mix.bSeconds)} detik</p>{data.mix.error && <p>{data.mix.error}</p>}</div>}
    {data?.mix?.status === 'completed' && <button className="btn" onClick={onCheckWater}>Lanjut Cek Air</button>}
    <details className="simple-help"><summary>Cara kerja</summary><p>Resep menentukan ml A/B dari liter air utama. Kalibrasi pompa menentukan detik relay dari kebutuhan ml. A masuk lalu B, dengan sirkulasi aktif. pH Up/Down dikontrol terpisah setelah pemeriksaan pH. Batas tiap relay tetap 0,5-60 detik.</p></details>
  </section>;
}
