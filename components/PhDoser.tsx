'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Droplets, Settings, Square } from 'lucide-react';
import { api } from '@/lib/api';
import type { NutrientStatus } from '@/lib/types';

const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 3 });
const duration = (n: number) => n >= 60 ? `${fmt(n / 60)} menit (${fmt(n)} detik)` : `${fmt(n)} detik`;
const labels = { running: 'Sedang menambahkan', completed: 'Penambahan selesai', stopped: 'Penambahan dihentikan', failed: 'Penambahan gagal' };

export default function PhDoser({ deviceId, onCheckWater }: { deviceId: number; onCheckWater: () => void }) {
  const [data, setData] = useState<NutrientStatus | null>(null);
  const [channel, setChannel] = useState<'phUp' | 'phDown'>('phUp');
  const [ml, setMl] = useState('');
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState(false);
  const [volume, setVolume] = useState('');
  const requestId = useRef('');
  const mutation = useRef(0);
  const pending = useRef(false);
  const label = channel === 'phUp' ? 'pH Up' : 'pH Down';
  const pump = data?.pumps[channel];
  const running = data?.phDose?.status === 'running';
  const occupied = running || data?.mix?.status === 'running';
  const validPump = pump && Number.isFinite(pump.seconds) && pump.seconds >= .5 && pump.seconds <= 86400 && Number.isFinite(pump.ml) && pump.ml >= .001 && pump.ml <= 1000000;
  const seconds = validPump && Number.isFinite(Number(ml)) && Number(ml) > 0 ? Math.round(Number(ml) / pump.ml * pump.seconds * 1000) / 1000 : null;
  const used = !!requestId.current && data?.phDose?.requestId === requestId.current;
  const ready = !connectionError && Number(ml) >= .001 && Number(ml) <= 1000000 && seconds != null && seconds >= .5 && seconds <= 3600;
  useEffect(() => {
    let mounted = true, loading = false;
    const load = async () => {
      if (loading || pending.current) return;
      loading = true;
      const version = mutation.current;
      try { const next = await api.nutrientStatus(deviceId); if (mounted && version === mutation.current && !pending.current) { setData(next); setConnectionError(''); } }
      catch (e) { if (mounted && version === mutation.current && !pending.current) setConnectionError((e as Error).message); }
      finally { loading = false; }
    };
    load(); const timer = setInterval(load, 2000);
    return () => { mounted = false; clearInterval(timer); };
  }, [deviceId]);
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; mutation.current++; setBusy(true); setError('');
    try { await action(); setConnectionError(''); } catch (e) { setError((e as Error).message); }
    finally { pending.current = false; setBusy(false); }
  }
  function start() {
    if (!ready || occupied || used) return;
    run(async () => {
      requestId.current ||= crypto.randomUUID();
      const plan = await api.phDosePlan(deviceId, channel, Number(ml));
      if (!plan.ready) throw new Error(plan.issues.join(' '));
      setData(await api.startPhDose(deviceId, plan, requestId.current));
    });
  }
  function saveCalibration(e: React.FormEvent) {
    e.preventDefault();
    run(async () => { setData(await api.saveDosingPump(deviceId, channel, { seconds: Number(time) * (minutes ? 60 : 1), ml: Number(volume) })); requestId.current = ''; setEditing(false); });
  }
  return <section className="card garden-mix simple-flow" aria-label="Atur pH">
    <div className="simple-heading"><Droplets size={28} /><div><h2>Atur pH</h2><p>Pilih cairan dan isi jumlah yang ingin ditambahkan.</p></div></div>
    <div className="simple-actions" role="group" aria-label="Pilih cairan pH">
      <button className={`btn ${channel === 'phUp' ? 'primary' : ''}`} aria-pressed={channel === 'phUp'} disabled={busy || occupied} onClick={() => { setChannel('phUp'); setEditing(false); requestId.current = ''; setError(''); }}><ArrowUp size={20} /> pH Up</button>
      <button className={`btn ${channel === 'phDown' ? 'primary' : ''}`} aria-pressed={channel === 'phDown'} disabled={busy || occupied} onClick={() => { setChannel('phDown'); setEditing(false); requestId.current = ''; setError(''); }}><ArrowDown size={20} /> pH Down</button>
    </div>
    <div className="simple-recipe"><span>{validPump ? `${fmt(pump.ml)} ml selama ${duration(pump.seconds)}` : `${label} belum dikalibrasi`}</span><button className="btn" disabled={busy || occupied || !data} onClick={() => { setTime(pump ? String(pump.seconds) : ''); setMinutes(false); setVolume(pump ? String(pump.ml) : ''); setEditing(!editing); }}><Settings size={18} /> Atur kalibrasi</button></div>
    {editing && <form className="simple-mix-form" onSubmit={saveCalibration}>
      <h3>Kalibrasi {label}</h3>
      <div className="simple-fields three">
        <label className="field">Lama uji<input type="number" min={minutes ? .5 / 60 : .5} max={minutes ? 1440 : 86400} step="any" required value={time} onChange={e => setTime(e.target.value)} /></label>
        <label className="field">Satuan waktu<select value={minutes ? 'minutes' : 'seconds'} onChange={e => setMinutes(e.target.value === 'minutes')}><option value="seconds">Detik</option><option value="minutes">Menit</option></select></label>
        <label className="field">Cairan terkumpul (ml)<input type="number" min="0.001" max="1000000" step="any" required value={volume} onChange={e => setVolume(e.target.value)} /></label>
      </div><small>Contoh: 150 ml selama 60 menit. Menyimpan kalibrasi tidak menyalakan relay.</small>
      <button className="btn" disabled={busy || occupied}>Simpan Kalibrasi</button>
    </form>}
    <label className="field">Jumlah cairan (ml)<input type="number" min="0.001" max="1000000" step="any" placeholder="Contoh: 10" value={ml} disabled={busy || occupied} onChange={e => { setMl(e.target.value); requestId.current = ''; setError(''); }} /></label>
    {seconds != null && <div className="garden-status"><span>Relay {label} menyala</span><strong>{duration(seconds)}</strong>{seconds < .5 || seconds > 3600 ? <small>Sesuaikan jumlah ml. Batas penambahan 0,5 detik sampai 60 menit.</small> : null}</div>}
    {(error || connectionError) && <div className="alert error" role="alert">{error || connectionError}</div>}
    {data?.phDose && <div className={`alert ${data.phDose.status === 'failed' ? 'error' : 'info'}`} role="status"><span><b>{labels[data.phDose.status]}: {data.phDose.channel === 'phUp' ? 'pH Up' : 'pH Down'}</b><br />{fmt(data.phDose.ml)} ml - {duration(data.phDose.seconds)}{data.phDose.error && <><br />{data.phDose.error}</>}</span></div>}
    {running ? <button className="btn danger simple-action" disabled={busy} onClick={() => run(async () => { setData(await api.stopPhDose(deviceId)); })}><Square size={20} /> Hentikan</button> : <button className="btn primary simple-action" disabled={busy || occupied || !ready || used} onClick={start}><Droplets size={20} /> {busy ? 'Memproses...' : `Tambahkan ${label}`}</button>}
    {occupied && !running && <small>Tunggu campuran nutrisi selesai.</small>}
    {used && !running && <button className="btn" onClick={() => { requestId.current = ''; setMl(''); }}>Dosis baru</button>}
    <small>Volume dihitung dari kalibrasi pompa. Setelah cairan tercampur, cek pH lagi.</small>
    <button className="btn" onClick={onCheckWater}>Cek Air</button>
  </section>;
}
