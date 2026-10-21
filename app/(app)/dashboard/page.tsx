'use client';

import { ChevronRight, Clock, Cpu, Plus, Sprout, Thermometer, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MetricGrid } from '@/components/Metric';
import Modal from '@/components/Modal';
import StatusPill from '@/components/StatusPill';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatValue, timeAgo } from '@/lib/format';
import type { Device } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api
      .devices()
      .then((d) => {
        setDevices(d);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  const online = devices?.filter((d) => d.online).length ?? 0;
  const temps = devices?.map((d) => d.latestReading?.temperature).filter((v): v is number => v != null) ?? [];
  const avgTemp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  const lastUpdate = devices
    ?.map((d) => d.latestReading?.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  const stats = [
    { label: 'Perangkat', value: devices?.length ?? '—', Icon: Cpu, color: 'var(--info)', bg: 'var(--info-soft)' },
    { label: 'Online', value: devices ? `${online} / ${devices.length}` : '—', Icon: Wifi, color: 'var(--primary)', bg: 'var(--primary-soft)' },
    {
      label: 'Rata-rata suhu',
      value: avgTemp != null ? `${formatValue(avgTemp, '°C')} °C` : '—',
      Icon: Thermometer,
      color: 'var(--c-temp)',
      bg: 'var(--warning-soft)',
    },
    { label: 'Data terakhir', value: timeAgo(lastUpdate) ?? '—', Icon: Clock, color: 'var(--muted)', bg: 'var(--surface-2)' },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Halo, {user?.name.split(' ')[0]} 👋</h1>
          <p className="muted">Ringkasan kondisi greenhouse Anda.</p>
        </div>
        <button className="btn primary" onClick={() => setAdding(true)}>
          <Plus size={18} />
          Tambah perangkat
        </button>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="stats">
        {stats.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="card stat">
            <div className="stat-icon" style={{ color, background: bg }}>
              <Icon size={20} />
            </div>
            <div>
              <div className="muted small">{label}</div>
              <div className="stat-value">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">
        <h2>Perangkat</h2>
        {devices && devices.length > 0 && <span className="muted small">Klik perangkat untuk detail & kontrol</span>}
      </div>

      {devices === null && !error && <div className="card muted">Memuat perangkat…</div>}

      {devices?.length === 0 && (
        <div className="card empty">
          <div className="empty-icon">
            <Sprout size={26} />
          </div>
          <h2>Belum ada perangkat</h2>
          <p className="muted">
            Tambahkan perangkat greenhouse pertama Anda, lalu hubungkan ESP32 atau sensor Home Assistant.
          </p>
          <button className="btn primary" onClick={() => setAdding(true)}>
            <Plus size={18} />
            Tambah perangkat
          </button>
        </div>
      )}

      <div className="grid">
        {devices?.map((d) => (
          <Link key={d.id} href={`/devices/${d.id}`} className="card device-card">
            <div className="top">
              <div style={{ minWidth: 0 }}>
                <h2>{d.name}</h2>
                <div className="muted small">{d.location || 'Lokasi belum diisi'}</div>
              </div>
              <StatusPill online={d.online} />
            </div>
            <MetricGrid reading={d.latestReading} />
            <div className="footer">
              <span>{d.latestReading ? `Diperbarui ${timeAgo(d.latestReading.createdAt)}` : 'Belum ada data sensor'}</span>
              <ChevronRight size={18} />
            </div>
          </Link>
        ))}
      </div>

      {adding && (
        <AddDeviceModal
          onClose={() => setAdding(false)}
          onCreated={(d) => {
            setAdding(false);
            toast(`Perangkat "${d.name}" ditambahkan`);
            router.push(`/devices/${d.id}`);
          }}
        />
      )}
    </>
  );
}

function AddDeviceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (d: Device) => void }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onCreated(await api.createDevice(name.trim(), location.trim()));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Tambah perangkat" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label className="field">
          Nama perangkat
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Greenhouse 1" required minLength={2} autoFocus />
        </label>
        <label className="field">
          Lokasi <span className="hint">Opsional</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="mis. Blok A" />
        </label>
        <p className="muted small" style={{ margin: 0 }}>
          Setelah dibuat, Anda akan diarahkan ke halaman perangkat untuk menghubungkan sensor.
        </p>
        {error && <div className="alert error">{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
