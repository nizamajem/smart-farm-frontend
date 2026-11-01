'use client';

import { Power, PowerOff, ShieldCheck, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import type { Device, HaMcbStatus, HaState } from '@/lib/types';

export default function SmartMcbCard({ device }: { device: Device }) {
  const { user } = useAuth();
  const [entity, setEntity] = useState(device.haMcbEntity || '');
  const [selected, setSelected] = useState(device.haMcbEntity || '');
  const [status, setStatus] = useState<HaMcbStatus | null>(null);
  const [entities, setEntities] = useState<HaState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sensorEntities, setSensorEntities] = useState<HaState[]>([]);
  const [powerEntity, setPowerEntity] = useState(device.haMcbSensors?.power || '');
  const [energyEntity, setEnergyEntity] = useState(device.haMcbSensors?.energy || '');
  const generation = useRef(0);
  useEffect(() => { setEntity(device.haMcbEntity || ''); setSelected(device.haMcbEntity || ''); }, [device.haMcbEntity]);
  async function refresh() {
    const request = ++generation.current;
    try { const next = await api.haMcbStatus(device.id); if (request === generation.current) { setStatus(next); setError(''); } }
    catch (e) { if (request === generation.current) { setStatus(null); setError((e as Error).message); } }
  }
  useEffect(() => {
    setStatus(null);
    if (busy) return;
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { clearInterval(timer); ++generation.current; };
  }, [device.id, entity, busy]);
  async function loadEntities() {
    try { const [switches, sensors] = await Promise.all([api.haRelayEntities(), api.haStates('sensor')]); setEntities(switches.filter(e => e.entity_id.startsWith('switch.'))); setSensorEntities(sensors); setError(''); }
    catch (e) { setError((e as Error).message); }
  }
  async function saveSensors() {
    setBusy(true); setError('');
    try { await api.setMcbSensors(device.id, powerEntity, energyEntity); setMessage('Sensor listrik tersimpan.'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError(''); setMessage('');
    try { const next = await api.setHaMcb(device.id, selected); setEntity(next.haMcbEntity || ''); setMessage('Smart MCB tersimpan.'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function command(action: 'ON' | 'OFF') {
    setBusy(true); ++generation.current; setError(''); setMessage('');
    try { setStatus(await api.commandHaMcb(device.id, action)); setMessage('Perintah dikirim. Status mengikuti laporan Home Assistant.'); }
    catch (e) { setStatus(null); setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const available = status?.state === 'on' || status?.state === 'off';
  const label = busy ? 'Memproses…' : !entity ? 'Belum terhubung' : status?.state === 'on' ? 'Menyala' : status?.state === 'off' ? 'Mati' : 'Tidak tersedia';
  return <section className="card smart-mcb-card" aria-label="Smart MCB">
    <div className="smart-mcb-heading"><span className="smart-mcb-icon"><ShieldCheck size={26} /></span><div><h3>Listrik Panel</h3><small className="muted">Smart MCB · Home Assistant</small></div><span className={`pill ${status?.state === 'on' ? 'ok' : 'off'}`} role="status">{label}</span></div>
    <div className="garden-status-grid">{(['power', 'energy'] as const).map(key => <article className="garden-status" key={key}><span>{key === 'power' ? 'Daya sekarang' : 'Energi total'}</span><strong>{status?.[key] ? status[key]!.value.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : '—'} <small>{key === 'power' ? 'W' : 'kWh'}</small></strong><small>{status?.[key]?.updatedAt ? `Diperbarui ${timeAgo(status[key]!.updatedAt!)}` : 'Sensor belum tersedia'}</small></article>)}</div>
    <div className="smart-mcb-actions">
      <button className="btn primary" disabled={busy || !available || status?.state === 'on'} onClick={() => command('ON')}><Power size={18} /> Nyalakan MCB</button>
      <button className="btn" disabled={busy || !available || status?.state === 'off'} onClick={() => command('OFF')}><PowerOff size={18} /> Matikan MCB</button>
      <button className="btn" disabled={busy} onClick={refresh} aria-label="Perbarui status MCB"><RefreshCw size={18} /></button>
    </div>
    {message && <small role="status">{message}</small>}
    {error && <small role="alert">{error}</small>}
    {user?.role === 'admin' && <details onToggle={e => { if (e.currentTarget.open) loadEntities(); }}><summary>Hubungkan Smart MCB</summary><div className="simple-mix-form" style={{ marginTop: 12 }}><label className="field">Entity MCB<select value={selected} disabled={busy} onChange={e => setSelected(e.target.value)}><option value="">Tidak dipetakan</option>{selected && !entities.some(e => e.entity_id === selected) && <option value={selected}>{selected}</option>}{entities.map(e => <option key={e.entity_id} value={e.entity_id}>{e.attributes.friendly_name || e.entity_id} · {e.entity_id}</option>)}</select></label><button className="btn" disabled={busy || selected === entity} onClick={save}>Simpan MCB</button>{(['power', 'energy'] as const).map(key => { const value = key === 'power' ? powerEntity : energyEntity; const options = sensorEntities.filter(e => (key === 'power' ? ['W', 'kW'] : ['Wh', 'kWh']).includes(e.attributes.unit_of_measurement || '')); return <label className="field" key={key}>{key === 'power' ? 'Sensor daya (W/kW)' : 'Sensor energi (Wh/kWh)'}<select value={value} disabled={busy} onChange={e => (key === 'power' ? setPowerEntity : setEnergyEntity)(e.target.value)}><option value="">Belum dipilih</option>{value && !options.some(e => e.entity_id === value) && <option value={value}>{value}</option>}{options.map(e => <option key={e.entity_id} value={e.entity_id}>{e.attributes.friendly_name || e.entity_id}</option>)}</select></label>; })}<button className="btn" disabled={busy} onClick={saveSensors}>Simpan Sensor Listrik</button></div></details>}
    {!entity && user?.role !== 'admin' && <small className="muted">Minta admin menghubungkan entity Smart MCB.</small>}
  </section>;
}
