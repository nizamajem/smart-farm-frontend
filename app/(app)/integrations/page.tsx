'use client';

import { CircleAlert, House, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import CopyField from '@/components/CopyField';
import Switch from '@/components/Switch';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import type { IntegrationsStatus } from '@/lib/types';

/** Admin: saklar & status jalur data — MQTT langsung dan Home Assistant (bisa aktif bersamaan). */
export default function IntegrationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  const load = useCallback(() => {
    api
      .integrations()
      .then(setStatus)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard');
      return;
    }
    load();
    const t = setInterval(load, 5_000);
    return () => clearInterval(t);
  }, [isAdmin, router, load]);

  async function toggle(name: 'mqtt' | 'home-assistant', enabled: boolean) {
    setBusy(name);
    try {
      setStatus(await api.setIntegration(name, enabled));
      toast(`${name === 'mqtt' ? 'MQTT' : 'Home Assistant'} ${enabled ? 'diaktifkan' : 'dimatikan'}`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  if (!isAdmin) return null;
  if (!status) return <div className="muted">Memuat…</div>;

  const { mqtt, homeAssistant: ha } = status;
  const wsUrl = typeof window !== 'undefined' ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${mqtt.wsPath}` : '';
  const tcpHost = mqtt.publicHost ?? (typeof window !== 'undefined' ? location.hostname : '');
  const mqttPill = mqtt.running
    ? { cls: 'ok', text: 'Berjalan' }
    : mqtt.lastError && mqtt.enabled
      ? { cls: 'warn', text: 'Gangguan' }
      : { cls: 'off', text: 'Mati' };
  const haPill = !ha.configured
    ? { cls: 'off', text: 'Belum diatur' }
    : ha.enabled
      ? ha.lastSyncError
        ? { cls: 'warn', text: 'Gangguan' }
        : { cls: 'ok', text: 'Aktif' }
      : { cls: 'off', text: 'Mati' };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Integrasi</h1>
          <p className="muted">Atur jalur data dari perangkat ke server. MQTT dan Home Assistant boleh aktif bersamaan.</p>
        </div>
      </div>

      <div className="two-col">
        {/* ---------- MQTT ---------- */}
        <section className="card">
          <div className="integration-head">
            <div className="stat-icon" style={{ color: 'var(--primary)', background: 'var(--primary-soft)' }}>
              <Radio size={20} />
            </div>
            <div className="grow">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2>MQTT langsung</h2>
                <span className={`pill ${mqttPill.cls}`}>
                  <span className="dot" />
                  {mqttPill.text}
                </span>
              </div>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                Perangkat (ESP32) mengirim data & menerima perintah relay seketika lewat broker di server.
              </p>
            </div>
            <Switch label="Aktifkan MQTT" checked={mqtt.enabled} disabled={busy === 'mqtt'} onChange={(v) => toggle('mqtt', v)} />
          </div>

          {mqtt.lastError && mqtt.enabled && (
            <div className="alert error">
              <CircleAlert size={16} />
              {mqtt.lastError}
            </div>
          )}

          <div className="mini-stats">
            <div>
              <span className="muted small">Perangkat tersambung</span>
              <b>{mqtt.devicesConnected.length}</b>
            </div>
            <div>
              <span className="muted small">Pesan diterima</span>
              <b>{mqtt.messagesReceived.toLocaleString('id-ID')}</b>
            </div>
            <div>
              <span className="muted small">Pesan terakhir</span>
              <b>{timeAgo(mqtt.lastMessageAt) ?? '—'}</b>
            </div>
            <div>
              <span className="muted small">Aktif sejak</span>
              <b>{mqtt.running ? timeAgo(mqtt.startedAt) : '—'}</b>
            </div>
          </div>

          <div className="section-label">Alamat broker untuk tim hardware</div>
          <div className="copy-grid">
            <CopyField label="Jaringan lokal (TCP)" value={`mqtt://${tcpHost}:${mqtt.publicPort}`} />
            <CopyField label="Lewat internet (WebSocket)" value={wsUrl} />
          </div>

          {mqtt.adminUsername && (
            <>
              <div className="section-label">Akun pemantau (semua topik, untuk debugging)</div>
              <div className="copy-grid">
                <CopyField label="Username" value={mqtt.adminUsername} />
                {mqtt.adminPassword && <CopyField label="Password" value={mqtt.adminPassword} secret />}
              </div>
            </>
          )}
          <p className="muted small" style={{ marginBottom: 0 }}>
            Kredensial tiap perangkat (username, password, topik) ada di halaman perangkat → tab <b>Pengaturan</b>.
          </p>
        </section>

        {/* ---------- Home Assistant ---------- */}
        <section className="card">
          <div className="integration-head">
            <div className="stat-icon" style={{ color: 'var(--info)', background: 'var(--info-soft)' }}>
              <House size={20} />
            </div>
            <div className="grow">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2>Home Assistant</h2>
                <span className={`pill ${haPill.cls}`}>
                  <span className="dot" />
                  {haPill.text}
                </span>
              </div>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                Server mengambil nilai sensor dari Home Assistant setiap {Math.round(ha.intervalSec / 60)} menit.
              </p>
            </div>
            <Switch
              label="Aktifkan Home Assistant"
              checked={ha.enabled}
              disabled={busy === 'home-assistant' || !ha.configured}
              onChange={(v) => toggle('home-assistant', v)}
            />
          </div>

          {!ha.configured ? (
            <div className="alert info">
              <CircleAlert size={16} />
              <span>
                Isi <code>HA_BASE_URL</code> dan <code>HA_TOKEN</code> di <code>.env</code> server lalu deploy ulang.
              </span>
            </div>
          ) : (
            <>
              {ha.lastSyncError && (
                <div className="alert error">
                  <CircleAlert size={16} />
                  {ha.lastSyncError}
                </div>
              )}
              <div className="mini-stats">
                <div>
                  <span className="muted small">Sinkron terakhir</span>
                  <b>{timeAgo(ha.lastSyncAt) ?? 'Belum'}</b>
                </div>
                <div>
                  <span className="muted small">Perangkat terpetakan</span>
                  <b>{ha.lastSyncResult?.devices ?? '—'}</b>
                </div>
                <div>
                  <span className="muted small">Data masuk (sync terakhir)</span>
                  <b>{ha.lastSyncResult?.inserted ?? '—'}</b>
                </div>
                <div>
                  <span className="muted small">Dilewati</span>
                  <b>{ha.lastSyncResult?.skipped.length ?? '—'}</b>
                </div>
              </div>
              <div className="copy-grid">
                <CopyField label="Alamat Home Assistant" value={ha.baseUrl ?? ''} />
              </div>
              <p className="muted small" style={{ marginBottom: 0 }}>
                Pilih sensor HA untuk tiap perangkat di halaman perangkat → tab <b>Pengaturan</b>.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
