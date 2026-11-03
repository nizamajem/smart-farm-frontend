'use client';
import { useEffect, useState } from 'react';
import { AirVent, ArrowDown, ArrowUp, Droplets, Leaf, Sun, Thermometer, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import type { Device, HaMcbStatus, SensorReading } from '@/lib/types';

const number = (n?: number | null) => n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('id-ID', { maximumFractionDigits: 1 });

function Trend({ rows, metric, color, label }: { rows: SensorReading[]; metric: keyof SensorReading; color: string; label: string }) {
  const values = rows.map(row => ({ value: row[metric], time: Date.parse(row.createdAt) })).filter((p): p is {value: number; time: number} => typeof p.value === 'number' && Number.isFinite(p.value) && Number.isFinite(p.time)).sort((a,b) => a.time - b.time);
  if (values.length < 2) return <small>Data terkini</small>;
  const min = Math.min(...values.map(p => p.value)), max = Math.max(...values.map(p => p.value));
  const start = values[0].time, span = values.at(-1)!.time - start;
  const points = values.map((p,i) => `${span ? (p.time - start) / span * 140 : i / (values.length - 1) * 140},${max === min ? 13 : 24 - (p.value - min) / (max - min) * 22}`).join(' ');
  return <svg className="farm-sparkline" viewBox="0 0 140 26" preserveAspectRatio="none" role="img" aria-label={`Tren ${label}`}><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}

export default function PanelMetrics({ device }: { device: Device }) {
  const [mcb, setMcb] = useState<HaMcbStatus | null>(null);
  const [rows, setRows] = useState<SensorReading[]>([]);
  useEffect(() => {
    let mounted = true, pending = false;
    const load = async () => {
      if (pending) return; pending = true;
      const results = await Promise.allSettled([api.haMcbStatus(device.id), api.readings(device.id, 24)]);
      if (mounted) {
        setMcb(results[0].status === 'fulfilled' ? results[0].value : null);
        setRows(results[1].status === 'fulfilled' ? results[1].value : []);
      }
      pending = false;
    };
    load(); const timer = setInterval(load, 10000);
    return () => { mounted = false; clearInterval(timer); };
  }, [device.id]);
  const r = device.latestReading;
  const metrics = [
    { key: 'temperature', label: 'Suhu', value: r?.temperature, unit: '°C', Icon: Thermometer, color: '#E88915' },
    { key: 'humidity', label: 'Udara', value: r?.humidity, unit: '% RH', Icon: AirVent, color: '#258DD8' },
    { key: 'lightLux', label: 'Cahaya', value: r?.lightLux, unit: 'lux', Icon: Sun, color: '#C98B17' },
    { key: 'ph', label: 'pH Air', value: r?.ph, unit: 'pH', Icon: Droplets, color: '#009B8D' },
    { key: 'tds', label: 'TDS', value: r?.tds, unit: 'ppm', Icon: Leaf, color: '#4CA65A' },
    { key: 'power', label: 'Listrik', value: mcb?.power?.value, unit: 'W', Icon: Zap, color: '#EF7046' },
    { key: 'flowIn', label: 'Air masuk', value: r?.flowIn, unit: 'L/menit', Icon: ArrowDown, color: '#079FB4' },
    { key: 'flowOut', label: 'Air keluar', value: r?.flowOut, unit: 'L/menit', Icon: ArrowUp, color: '#5264B8' },
  ] as const;
  return <div className="farm-metrics">{metrics.map(({key, label, value, unit, Icon, color}) => <div key={key} className="farm-metric" style={{ backgroundColor: `${color}0C` }}>
    <span className="farm-metric-label"><Icon size={18} style={{ color }} />{label}</span>
    <strong>{number(value)} <small>{unit}</small></strong>
    {key === 'power' ? <small>{number(mcb?.energy?.value)} kWh</small> : value == null ? <small>Belum ada data</small> : <Trend rows={rows} metric={key} color={color} label={label} />}
  </div>)}</div>;
}
