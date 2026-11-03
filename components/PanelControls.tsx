'use client';
import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Device, HaRelayStatus } from '@/lib/types';
import SmartMcbCard from './SmartMcbCard';
import Switch from './Switch';

export default function PanelControls({ device }: { device: Device }) {
  const [states, setStates] = useState<HaRelayStatus[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0), pending = useRef(false);
  async function refresh() {
    if (pending.current) return;
    const request = ++generation.current;
    try { const next = await api.haRelayStatus(device.id); if (request === generation.current) { setStates(next); setError(''); } }
    catch (e) { if (request === generation.current) { setStates([]); setError((e as Error).message); } }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 3000); return () => { clearInterval(timer); ++generation.current; }; }, [device.id]);
  async function change(relay: number, on: boolean) {
    if (pending.current) return;
    pending.current = true; ++generation.current; setBusy(true); setError('');
    try { setStates(await api.manualRelay(device.id, relay, on)); }
    catch (e) { setStates([]); setError((e as Error).message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="farm-control" aria-label="Kontrol panel">
    <SmartMcbCard device={device} />
    <div className="section-title"><h2>Relay</h2><button className="icon-btn" disabled={busy} aria-label="Perbarui relay" onClick={refresh}><RefreshCw size={19} /></button></div>
    {error && <div className="alert error" role="alert">{error}</div>}
    <div className="farm-control-grid">{['Larutan A', 'Larutan B', 'pH Up', 'pH Down'].map((name, i) => {
      const state = states.find(s => s.relay === i + 1)?.state;
      const available = state === 'on' || state === 'off';
      return <article className="farm-relay" key={name}><small>Relay {i + 1}</small><h3>{name}</h3><div className="farm-relay-footer"><span className="muted small">{available ? state === 'on' ? 'ON' : 'OFF' : 'Tidak tersedia'}</span><Switch label={`Relay ${i + 1} ${name}`} checked={state === 'on'} disabled={busy || !available} onChange={on => change(i + 1, on)} /></div></article>;
    })}</div>
  </section>;
}
