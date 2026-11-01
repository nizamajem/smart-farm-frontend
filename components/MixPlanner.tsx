'use client';
import { useEffect, useRef, useState } from 'react';
import { Calculator, FlaskConical, Play, Square } from 'lucide-react';
import { api } from '@/lib/api';
import type { MixPlan, NutrientStatus } from '@/lib/types';
const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 3 });
const labels = { running: 'Sedang mencampur', completed: 'Campuran selesai', stopped: 'Campuran dihentikan', failed: 'Campuran gagal' };

export default function MixPlanner({ deviceId, onCheckWater }: { deviceId: number; onCheckWater: () => void }) {
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
  const errorBox = useRef<HTMLDivElement>(null);
  const runError = data?.mix?.status === 'failed' ? data.mix.error : '';
  useEffect(() => { if (error || connectionError || runError) errorBox.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [error, connectionError, runError]);
  const running = data?.mix?.status === 'running';
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try { const d = await api.nutrientStatus(deviceId); if (mounted) { setData(d); setConnectionError(''); } }
      catch { if (mounted) setConnectionError('Status belum tersedia. Periksa koneksi.'); }
    };
    load(); const timer = setInterval(load, 1500);
    return () => { mounted = false; clearInterval(timer); };
  }, [deviceId]);
  async function saveRecipe(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { setData(await api.saveNutrientRecipe(deviceId, { liters: Number(referenceLiters), aSeconds: Number(a), bSeconds: Number(b) })); setEditing(false); setPlan(null); }
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
    try { setData(await api.stopNutrientMix(deviceId)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const valid = Number(liters) >= .01 && Number(liters) <= 1000000 && Number.isFinite(Number(liters)) && !!data?.recipe && !connectionError;
  const used = !!requestId && data?.mix?.requestId === requestId;
  const recipe = data?.recipe;
  return <section className="card garden-mix simple-flow" aria-label="Campur nutrisi">
    <div className="simple-heading"><FlaskConical size={28} /><div><h2>Campur Nutrisi</h2><p>Isi liter air. Durasi A/B dihitung otomatis.</p></div></div>
    <div className="simple-recipe"><span>{recipe ? `${fmt(recipe.liters)} liter → A ${fmt(recipe.aSeconds)} detik · B ${fmt(recipe.bSeconds)} detik` : 'Kalibrasi belum diatur'}</span><button className="btn" disabled={busy || running} onClick={() => { setReferenceLiters(recipe ? String(recipe.liters) : ''); setA(recipe ? String(recipe.aSeconds) : ''); setB(recipe ? String(recipe.bSeconds) : ''); setEditing(!editing); }}>Atur Kalibrasi</button></div>
    {editing && <form className="simple-mix-form" onSubmit={saveRecipe}><div className="simple-fields three"><label className="field">Air acuan (liter)<input type="number" min="0.01" max="1000000" step="any" required value={referenceLiters} onChange={e => setReferenceLiters(e.target.value)} placeholder="Contoh: 10" /></label><label className="field">Relay A (detik)<input type="number" min="0.5" max="60" step="any" required value={a} onChange={e => setA(e.target.value)} placeholder="Contoh: 4" /></label><label className="field">Relay B (detik)<input type="number" min="0.5" max="60" step="any" required value={b} onChange={e => setB(e.target.value)} placeholder="Contoh: 4" /></label></div><small>Gunakan hasil uji resep nutrisi kamu. Disimpan bersama untuk web dan aplikasi.</small><button className="btn" disabled={busy || running}>Simpan Kalibrasi</button></form>}
    <label className="field">Air di tandon (liter)<input type="number" min="0.01" step="any" placeholder="Contoh: 10" value={liters} disabled={busy || running} onChange={e => { setLiters(e.target.value); setPlan(null); setRequestId(''); }} /></label>
    <label className="simple-checkbox"><input type="checkbox" checked={newWater} disabled={busy || running} onChange={e => setNewWater(e.target.checked)} /><span>Air belum diberi AB mix</span></label>
    {plan && <div className="garden-status-grid" aria-live="polite"><article className="garden-status"><span>Relay A</span><strong>{fmt(plan.aSeconds)} <small>detik</small></strong></article><article className="garden-status"><span>Relay B</span><strong>{fmt(plan.bSeconds)} <small>detik</small></strong></article></div>}
    {(error || connectionError || runError) && <div className="alert error" role="alert" ref={errorBox} tabIndex={-1}><b>Belum bisa diproses.</b> {error || connectionError || runError}</div>}
    {plan?.issues?.map(issue => <div className="alert info" key={issue}>{issue}</div>)}
    <div className="smart-mcb-actions"><button className="btn" disabled={busy || running || !valid} onClick={() => calculate(false)}><Calculator size={20} />{busy ? 'Memproses…' : 'Hitung Takaran'}</button><button className="btn primary" disabled={busy || running || !valid || !newWater || used || (!!plan && !plan.ready)} onClick={() => calculate(true)}><Play size={20} />Campur Nutrisi</button></div>
    {(running || connectionError) && <button className="btn simple-action" onClick={stop} disabled={busy}><Square size={18} />Hentikan Campuran</button>}
    {data?.mix && <div role="status"><b>{labels[data.mix.status]}</b><p>{fmt(data.mix.liters)} liter · A {fmt(data.mix.aSeconds)} detik · B {fmt(data.mix.bSeconds)} detik</p>{data.mix.error && <p>{data.mix.error}</p>}</div>}
    {data?.mix?.status === 'completed' && <button className="btn" onClick={onCheckWater}>Lanjut Cek Air</button>}
    <details className="simple-help"><summary>Cara kerja</summary><p>Contoh: kalibrasi 4 detik per 10 liter → 20 liter memakai 8 detik. A menyala lalu mati, dilanjutkan B. Maksimal 60 detik tiap relay. Pastikan sirkulasi air aktif. Setelah tercampur, cek TDS dan pH.</p></details>
  </section>;
}
