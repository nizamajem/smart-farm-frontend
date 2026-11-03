'use client';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Mascot from '@/components/Mascot';
import { api } from '@/lib/api';
import type { Device, SensorReading } from '@/lib/types';

const number = (n?: number | null) => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('id-ID', {maximumFractionDigits: 2});
const dateText = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export default function HistoryPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState('');
  const [period, setPeriod] = useState('today');
  const [date, setDate] = useState(() => dateText(new Date()));
  const [rows, setRows] = useState<SensorReading[]>([]);
  const [busy, setBusy] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const range = useRef({from:'',to:''});
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => { let active = true; api.devices().then(next => {if (active) setDevices(next);}).catch(() => {}); return () => {active = false;}; }, []);
  async function fetchRows(more = false) {
    if (more && pending.current) return;
    const version = ++generation.current; pending.current = true; setBusy(true); setError('');
    if (!more) {
      setRows([]); setHasMore(false);
      const now = new Date();
      const start = period === 'date' ? new Date(`${date}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - (period === 'week' ? 6 : 0));
      const end = period === 'date' ? new Date(start.getFullYear(), start.getMonth(), start.getDate()+1) : now;
      range.current = {from:start.toISOString(),to:new Date(Math.min(end.getTime(),now.getTime())).toISOString()};
    }
    try {
      const next = await api.readingHistory(range.current.from,range.current.to,more ? rows.length : 0,selected ? Number(selected) : undefined);
      if (version === generation.current) {setRows(more ? [...rows,...next] : next);setHasMore(next.length === 200);}
    } catch (e) { if (version === generation.current) setError((e as Error).message); }
    finally { if (version === generation.current) {pending.current = false;setBusy(false);} }
  }
  useEffect(() => { fetchRows(); return () => {++generation.current;}; }, [selected,period,date]);
  const groups = new Map<string, SensorReading[]>();
  for (const row of [...rows].sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    const time = new Date(row.createdAt);
    const key = `${row.deviceId}:${dateText(time)}:${time.getHours()}`;
    const group = groups.get(key) ?? []; group.push(row); groups.set(key,group);
  }
  return <>
    <section className="farm-hero"><div><span className="farm-eyebrow">CATATAN KEBUNMU</span><h1>Riwayat semua panel</h1><p>Lihat perubahan air, dari waktu ke waktu.</p></div><Mascot scene="water" eager /></section>
    <section className="card farm-history-filters" aria-label="Filter riwayat">
      <label className="field">Panel<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Semua panel</option>{devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <label className="field">Periode<select value={period} onChange={e => setPeriod(e.target.value)}><option value="today">Hari ini</option><option value="week">7 hari</option><option value="date">Pilih tanggal</option></select></label>
      {period === 'date' ? <label className="field">Tanggal<input type="date" value={date} max={dateText(new Date())} required onChange={e => { if (e.target.value) setDate(e.target.value); }} /></label> : <button className="btn" onClick={() => fetchRows()} disabled={busy}><RefreshCw size={18} />Perbarui</button>}
    </section>
    {error && <div className="alert error" role="alert">{error}<button className="btn" disabled={busy} onClick={() => fetchRows()}>Coba lagi</button></div>}
    {!busy && !error && !rows.length && <div className="card farm-empty"><Mascot scene="water" /><h2>Belum ada pembacaan</h2><span className="muted">Coba periode lain.</span></div>}
    {busy && !rows.length && <div className="card muted" role="status">Memuat riwayat...</div>}
    {!!rows.length && <><div className="section-title"><h2>Terbaru tiap jam</h2><span className="muted small">Ketuk kartu untuk detail</span></div><div className="farm-history-grid">{[...groups.entries()].map(([key, group]) => {
      const latest = group[0], deviceName = latest.deviceName ?? devices.find(d => d.id === latest.deviceId)?.name ?? `Panel ${latest.deviceId}`;
      return <details className="farm-history-card" key={key}><summary><div className="farm-history-head"><strong>{deviceName}</strong><time dateTime={latest.createdAt}>{new Date(latest.createdAt).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div><div className="farm-history-values"><div><span>pH Air</span><strong>{number(latest.ph)}</strong></div><div><span>TDS</span><strong>{number(latest.tds)} <small>ppm</small></strong></div><ChevronDown size={20} /></div></summary><div className="farm-history-detail">{group.map(row => <div key={row.id}><small>{new Date(row.createdAt).toLocaleTimeString('id-ID')}</small><p>Suhu {number(row.temperature)} °C · Udara {number(row.humidity)}% · Cahaya {number(row.lightLux)} lux</p><p>pH {number(row.ph)} · TDS {number(row.tds)} ppm · EC {number(row.conductivity)} µS/cm</p><p>Air masuk {number(row.flowIn)} · keluar {number(row.flowOut)} L/menit</p></div>)}</div></details>;
    })}</div></>}
    {hasMore && <button className="btn" disabled={busy} style={{marginTop:20}} onClick={() => fetchRows(true)}>{busy ? 'Memuat...' : 'Muat data lebih lama'}</button>}
  </>;
}
