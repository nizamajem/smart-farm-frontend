'use client';

import { ChevronRight, Plus, Sprout } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import PanelMetrics from '@/components/PanelMetrics';
import Mascot from '@/components/Mascot';
import { DOSING_CHANNELS } from '@/components/NutrientPanel';
import Modal from '@/components/Modal';
import StatusPill from '@/components/StatusPill';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import type { Device } from '@/lib/types';

export default function DashboardPage() {
  return <Suspense fallback={<div className="card muted">Memuat kebun...</div>}><DashboardContent /></Suspense>;
}
function DashboardContent() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const search = useSearchParams();
  useEffect(() => { if (search.get('add') === '1') { setAdding(true); router.replace('/dashboard', { scroll: false }); } }, [search, router]);

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


  return (
    <>
      <section className="farm-hero">
        <div><span className="farm-eyebrow">KEBUNMU HARI INI</span><h1>Halo, {user?.name.split(' ')[0]}!</h1><p>Tanaman terawat, hati pun tenang.</p><button className="btn primary" onClick={() => setAdding(true)}><Plus size={18} />Tambah Perangkat</button></div>
        <Mascot eager />
      </section>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

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

      <div className="farm-panel-grid">
        {devices?.map((d) => (
          <Link key={d.id} href={`/devices/${d.id}`} className="card device-card">
            <div className="top">
              <div style={{ minWidth: 0 }}>
                <h2>{d.name}</h2>
                <div className="muted small">{d.location || 'Lokasi belum diisi'}</div>
              </div>
              <StatusPill online={d.online} />
            </div>
            <PanelMetrics device={d} />
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
  const [nutrient, setNutrient] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onCreated(await api.createDevice(name.trim(), location.trim(), nutrient ? DOSING_CHANNELS.map((c) => c.name) : undefined));
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
        <label className="field">
          Jenis panel
          <select value={nutrient ? 'nutrient' : 'general'} onChange={(e) => setNutrient(e.target.value === 'nutrient')}>
            <option value="nutrient">Nutrisi & pH · 1 sensor + 4 relay dosing</option>
            <option value="general">Greenhouse umum</option>
          </select>
          <span className="hint">{nutrient ? 'Relay 1: Larutan A · 2: Larutan B · 3: pH Up · 4: pH Down' : 'Pompa Air, Kipas, Lampu Tumbuh, Pompa Nutrisi'}</span>
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
