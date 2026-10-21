'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Metric from '@/components/Metric';
import { api } from '@/lib/api';
import type { Device } from '@/lib/types';

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [showForm, setShowForm] = useState(false);

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

  async function addDevice(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createDevice(name, location);
      setName('');
      setLocation('');
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const online = devices?.filter((d) => d.online).length ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            {devices ? `${devices.length} perangkat · ${online} online` : 'Memuat perangkat…'}
          </p>
        </div>
        <button className="btn primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Batal' : '+ Tambah perangkat'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <form className="card inline-form" onSubmit={addDevice}>
          <input placeholder="Nama perangkat" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          <input placeholder="Lokasi (opsional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <button className="btn primary">Simpan</button>
        </form>
      )}

      <div className="grid">
        {devices?.map((d) => (
          <Link key={d.id} href={`/devices/${d.id}`} className="card device-card">
            <div className="device-head">
              <div>
                <h2>{d.name}</h2>
                <div className="muted small">{d.location || 'Tanpa lokasi'}</div>
              </div>
              <span className={`badge ${d.online ? 'on' : 'off'}`}>{d.online ? 'Online' : 'Offline'}</span>
            </div>
            <div className="metrics">
              <Metric label="Suhu" value={d.latestReading?.temperature} unit="°C" />
              <Metric label="Kelembapan" value={d.latestReading?.humidity} unit="%" />
              <Metric label="Tanah" value={d.latestReading?.soilMoisture} unit="%" />
              <Metric label="Cahaya" value={d.latestReading?.lightLux} unit="lx" />
            </div>
            <div className="muted small">
              {d.latestReading
                ? `Update: ${new Date(d.latestReading.createdAt).toLocaleString('id-ID')}`
                : 'Belum ada data sensor'}
            </div>
          </Link>
        ))}
        {devices?.length === 0 && <div className="card muted">Belum ada perangkat. Tambahkan perangkat pertama Anda.</div>}
      </div>
    </>
  );
}
