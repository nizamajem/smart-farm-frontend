'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import HomeAssistantCard from '@/components/HomeAssistantCard';
import LineChart from '@/components/LineChart';
import Metric from '@/components/Metric';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Device, RelayCommand, SensorReading } from '@/lib/types';

const STATUS_LABEL: Record<RelayCommand['status'], string> = {
  pending: 'Menunggu',
  sent: 'Terkirim',
  done: 'Selesai',
  expired: 'Kedaluwarsa',
};

export default function DeviceDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const { user } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [commands, setCommands] = useState<RelayCommand[]>([]);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, r, c] = await Promise.all([api.device(id), api.readings(id), api.commands(id)]);
      setDevice(d);
      setReadings(r);
      setCommands(c);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5_000);
    return () => clearInterval(t);
  }, [load]);

  async function send(relay: number, action: 'ON' | 'OFF') {
    try {
      await api.sendCommand(id, relay, action, action === 'ON' ? 3000 : undefined);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    if (!device || !confirm(`Hapus perangkat "${device.name}" beserta seluruh datanya?`)) return;
    await api.deleteDevice(id);
    router.replace('/dashboard');
  }

  if (!device) return <div className="muted">{error || 'Memuat…'}</div>;
  const r = device.latestReading;

  return (
    <>
      <Link href="/dashboard" className="muted small">
        ← Kembali
      </Link>
      <div className="page-head">
        <div>
          <h1>{device.name}</h1>
          <p className="muted">
            {device.location || 'Tanpa lokasi'} ·{' '}
            {device.lastSeenAt ? `terakhir aktif ${new Date(device.lastSeenAt).toLocaleString('id-ID')}` : 'belum pernah terhubung'}
          </p>
        </div>
        <span className={`badge ${device.online ? 'on' : 'off'}`}>{device.online ? 'Online' : 'Offline'}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="card">
        <div className="metrics wide">
          <Metric label="Suhu" value={r?.temperature} unit="°C" />
          <Metric label="Kelembapan udara" value={r?.humidity} unit="%" />
          <Metric label="Kelembapan tanah" value={r?.soilMoisture} unit="%" />
          <Metric label="Cahaya" value={r?.lightLux} unit="lx" />
        </div>
      </section>

      <section className="card">
        <h2>Riwayat sensor</h2>
        <LineChart readings={readings} />
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Kontrol relay</h2>
          <p className="muted small">ON otomatis mati setelah maks. 3 detik (batas keamanan firmware).</p>
          <div className="relays">
            {device.relayLabels.map((label, i) => (
              <div key={i} className="relay">
                <div>
                  <strong>Relay {i + 1}</strong>
                  <div className="muted small">{label}</div>
                </div>
                <div className="relay-actions">
                  <button className="btn primary" onClick={() => send(i + 1, 'ON')}>
                    ON 3s
                  </button>
                  <button className="btn" onClick={() => send(i + 1, 'OFF')}>
                    OFF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Perintah terakhir</h2>
          {commands.length === 0 ? (
            <p className="muted">Belum ada perintah.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Relay</th>
                  <th>Aksi</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((c) => (
                  <tr key={c.id}>
                    <td>{new Date(c.createdAt).toLocaleTimeString('id-ID')}</td>
                    <td>{c.relay}</td>
                    <td>{c.action}</td>
                    <td>
                      <span className={`status ${c.status}`}>{STATUS_LABEL[c.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {user?.role === 'admin' && <HomeAssistantCard key={device.id} device={device} onSaved={load} />}

      <section className="card">
        <h2>Koneksi perangkat</h2>
        <p className="muted small">
          Tanam kunci ini di firmware ESP32 dan kirim lewat header <code>x-device-key</code> ke{' '}
          <code>POST /api/iot/readings</code> dan <code>GET /api/iot/commands</code>.
        </p>
        <div className="key-row">
          <code>{showKey ? device.apiKey : '•'.repeat(24)}</code>
          <button className="btn ghost" onClick={() => setShowKey((s) => !s)}>
            {showKey ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>
        <button className="btn danger" onClick={remove}>
          Hapus perangkat
        </button>
      </section>
    </>
  );
}
