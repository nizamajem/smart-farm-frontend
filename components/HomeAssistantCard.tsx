'use client';

import { House, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import type { Device, HaEntityMap, HaHealth, HaMetric, HaState } from '@/lib/types';

const METRICS: { key: HaMetric; label: string }[] = [
  { key: 'temperature', label: 'Suhu' },
  { key: 'humidity', label: 'Kelembapan udara' },
  { key: 'ph', label: 'pH' },
  { key: 'orp', label: 'ORP (mV)' },
  { key: 'conductivity', label: 'EC (µS/cm)' },
  { key: 'tds', label: 'TDS (ppm)' },
  { key: 'salinity', label: 'Salinitas (ppm)' },
  { key: 'specificGravity', label: 'Berat jenis' },
  { key: 'conductivityFactor', label: 'Faktor konduktivitas' },

];

/** Admin: petakan entity sensor Home Assistant ke metrik perangkat ini. */
export default function HomeAssistantCard({ device, onSaved }: { device: Device; onSaved: () => void }) {
  const toast = useToast();
  const [health, setHealth] = useState<HaHealth | null>(null);
  const [entities, setEntities] = useState<HaState[]>([]);
  const [map, setMap] = useState<HaEntityMap>(device.haEntities ?? {});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .haHealth()
      .then((h) => {
        setHealth(h);
        if (h.status === 'ok') return api.haStates('sensor').then(setEntities);
      })
      .catch((e) => setHealth({ status: 'error', message: e.message }));
  }, []);

  async function run(action: () => Promise<string>) {
    setBusy(true);
    try {
      toast(await action());
      onSaved();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      const payload = Object.fromEntries(METRICS.map((m) => [m.key, map[m.key] ?? ''])) as HaEntityMap;
      await api.setHaEntities(device.id, payload);
      return 'Pemetaan Home Assistant disimpan';
    });

  const sync = () =>
    run(async () => {
      const r = await api.haSync();
      if (r.status === 'busy') return 'Sinkronisasi sedang berjalan, coba sebentar lagi';
      const mine = r.skipped?.find((s) => s.deviceId === device.id);
      if (mine) throw new Error(`Belum ada data: ${mine.reason}`);
      return 'Data terbaru berhasil diambil dari Home Assistant';
    });

  const entity = (id?: string) => entities.find((e) => e.entity_id === id);
  const connected = health?.status === 'ok';

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <House size={18} />
            <h2>Sensor dari Home Assistant</h2>
          </div>
          <p className="muted small">
            {connected
              ? 'Pilih sensor HA untuk tiap data. Nilainya disalin otomatis setiap 5 menit.'
              : health?.message ?? 'Memeriksa koneksi…'}
          </p>
        </div>
        {health && (
          <span className={`pill ${connected ? 'ok' : health.status === 'not_configured' ? 'off' : 'warn'}`}>
            <span className="dot" />
            {connected ? 'Terhubung' : health.status === 'not_configured' ? 'Belum diatur' : 'Gangguan'}
          </span>
        )}
      </div>

      {connected && (
        <>
          <div className="form-grid">
            {METRICS.map((m) => {
              const s = entity(map[m.key]);
              const unavailable = s && (s.state === 'unavailable' || s.state === 'unknown');
              return (
                <label key={m.key} className="field">
                  {m.label}
                  <input
                    list="ha-sensors"
                    placeholder="Ketik untuk mencari sensor…"
                    value={map[m.key] ?? ''}
                    onChange={(e) => setMap({ ...map, [m.key]: e.target.value.trim() })}
                  />
                  {s && (
                    <span className="hint" style={{ color: unavailable ? 'var(--warning)' : undefined }}>
                      {unavailable ? 'Sensor sedang offline di Home Assistant' : `Nilai sekarang: ${s.state} ${s.attributes.unit_of_measurement ?? ''}`}
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

          <div className="actions-row">
            <button className="btn primary" onClick={save} disabled={busy}>
              Simpan pemetaan
            </button>
            <button className="btn" onClick={sync} disabled={busy}>
              <RefreshCw size={16} />
              Ambil data sekarang
            </button>
          </div>
        </>
      )}
    </div>
  );
}
