'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Device, HaEntityMap, HaHealth, HaMetric, HaState } from '@/lib/types';

const METRICS: { key: HaMetric; label: string }[] = [
  { key: 'temperature', label: 'Suhu' },
  { key: 'humidity', label: 'Kelembapan udara' },
  { key: 'soilMoisture', label: 'Kelembapan tanah' },
  { key: 'lightLux', label: 'Cahaya' },
];

/** Admin: petakan entity sensor Home Assistant ke metrik perangkat ini. */
export default function HomeAssistantCard({ device, onSaved }: { device: Device; onSaved: () => void }) {
  const [health, setHealth] = useState<HaHealth | null>(null);
  const [entities, setEntities] = useState<HaState[]>([]);
  const [map, setMap] = useState<HaEntityMap>(device.haEntities ?? {});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .haHealth()
      .then((h) => {
        setHealth(h);
        if (h.status === 'ok') return api.haStates('sensor').then(setEntities);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setNotice(await action());
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      const payload = Object.fromEntries(METRICS.map((m) => [m.key, map[m.key] ?? ''])) as HaEntityMap;
      await api.setHaEntities(device.id, payload);
      return 'Pemetaan disimpan.';
    });

  const sync = () =>
    run(async () => {
      const r = await api.haSync();
      if (r.status === 'busy') return 'Sync sedang berjalan, coba lagi sebentar.';
      const mine = r.skipped?.find((s) => s.deviceId === device.id);
      return mine ? `Perangkat ini dilewati: ${mine.reason}` : `Sync selesai: ${r.inserted} perangkat diperbarui.`;
    });

  const unit = (id?: string) => entities.find((e) => e.entity_id === id);

  return (
    <section className="card">
      <div className="device-head">
        <h2>Home Assistant</h2>
        {health && (
          <span className={`badge ${health.status === 'ok' ? 'on' : 'off'}`}>
            {health.status === 'ok' ? 'Terhubung' : health.status === 'not_configured' ? 'Belum diatur' : 'Error'}
          </span>
        )}
      </div>
      <p className="muted small">
        {health?.status === 'ok'
          ? `${health.baseUrl} · ${entities.length} sensor tersedia. Data disalin berkala ke riwayat perangkat ini.`
          : health?.message ?? 'Memeriksa koneksi…'}
      </p>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <div className="user-form">
        {METRICS.map((m) => {
          const s = unit(map[m.key]);
          return (
            <label key={m.key}>
              {m.label}
              <input
                list="ha-sensors"
                placeholder="sensor.…"
                value={map[m.key] ?? ''}
                onChange={(e) => setMap({ ...map, [m.key]: e.target.value.trim() })}
              />
              {s && (
                <span className="muted small">
                  Sekarang: {s.state} {s.attributes.unit_of_measurement ?? ''}
                </span>
              )}
            </label>
          );
        })}
      </div>
      <datalist id="ha-sensors">
        {entities.map((e) => (
          <option key={e.entity_id} value={e.entity_id}>
            {e.attributes.friendly_name} ({e.state} {e.attributes.unit_of_measurement ?? ''})
          </option>
        ))}
      </datalist>

      <div className="relay-actions" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={save} disabled={busy}>
          Simpan pemetaan
        </button>
        <button className="btn" onClick={sync} disabled={busy || health?.status !== 'ok'}>
          Sync sekarang
        </button>
      </div>
    </section>
  );
}
