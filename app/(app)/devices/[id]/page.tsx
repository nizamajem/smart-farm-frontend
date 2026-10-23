'use client';

import { Activity, ArrowLeft, Check, Copy, Eye, EyeOff, Gauge, Power, PowerOff, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import HomeAssistantCard from '@/components/HomeAssistantCard';
import LineChart from '@/components/LineChart';
import MqttCard from '@/components/MqttCard';
import NutrientPanel from '@/components/NutrientPanel';
import { MetricGrid } from '@/components/Metric';
import { ConfirmDialog } from '@/components/Modal';
import StatusPill from '@/components/StatusPill';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import type { Device, RelayCommand, SensorReading } from '@/lib/types';

const STATUS_LABEL: Record<RelayCommand['status'], string> = {
  pending: 'Menunggu perangkat',
  sent: 'Dikirim ke perangkat',
  done: 'Selesai',
  expired: 'Tidak terkirim',
};

const SOURCE_LABEL = { mqtt: 'MQTT', ha: 'Home Assistant', http: 'HTTP' } as const;

type Tab = 'nutrients' | 'overview' | 'control' | 'settings';
const TABS: { id: Tab; label: string; Icon: typeof Gauge }[] = [
  { id: 'nutrients', label: 'Nutrisi & pH', Icon: Gauge },
  { id: 'overview', label: 'Ringkasan', Icon: Gauge },
  { id: 'control', label: 'Kontrol', Icon: Power },
  { id: 'settings', label: 'Pengaturan', Icon: Settings },
];

export default function DeviceDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [commands, setCommands] = useState<RelayCommand[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('nutrients');

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

  if (!device) {
    return error ? (
      <div className="alert error">{error}</div>
    ) : (
      <div className="muted">Memuat perangkat…</div>
    );
  }

  return (
    <>
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={16} />
        Kembali ke dashboard
      </Link>

      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1>{device.name}</h1>
            <StatusPill online={device.online} />
          </div>
          <p className="muted">
            {device.location || 'Lokasi belum diisi'} ·{' '}
            {device.lastSeenAt ? `aktif ${timeAgo(device.lastSeenAt)}` : 'belum pernah mengirim data'}
          </p>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="tabs" role="tablist">
        {TABS.map(({ id: t, label, Icon }) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'nutrients' && <NutrientPanel key={device.id} device={device} commands={commands} onSettings={() => setTab('settings')} />}

      {tab === 'overview' && (
        <>
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Kondisi terkini</h2>
                <p className="muted small">
                  {device.latestReading ? `Diperbarui ${timeAgo(device.latestReading.createdAt)}` : 'Belum ada data sensor'}
                  {device.latestReading?.source && (
                    <>
                      {' · via '}
                      <span className="source-badge">{SOURCE_LABEL[device.latestReading.source]}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <MetricGrid reading={device.latestReading} wide />
          </div>
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Riwayat sensor</h2>
                <p className="muted small">{readings.length} data terakhir</p>
              </div>
            </div>
            <LineChart readings={readings} />
          </div>
          {!device.latestReading && (
            <div className="card">
              <div className="alert info">
                <Activity size={16} />
                <span>
                  Perangkat ini belum menerima data. Buka tab <b>Pengaturan</b> untuk menghubungkan perangkat lewat MQTT,
                  Home Assistant, atau HTTP.
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'control' && <ControlTab device={device} commands={commands} onSent={load} toast={toast} />}

      {tab === 'settings' && (
        <SettingsTab
          device={device}
          isAdmin={user?.role === 'admin'}
          onSaved={load}
          onDeleted={() => {
            toast(`Perangkat "${device.name}" dihapus`);
            router.replace('/dashboard');
          }}
        />
      )}
    </>
  );
}

function ControlTab({
  device,
  commands,
  onSent,
  toast,
}: {
  device: Device;
  commands: RelayCommand[];
  onSent: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function send(relay: number, action: 'ON' | 'OFF') {
    setBusy(`${relay}${action}`);
    try {
      await api.sendCommand(device.id, relay, action, action === 'ON' ? 3000 : undefined);
      toast(`${device.relayLabels[relay - 1]}: perintah ${action === 'ON' ? 'nyalakan' : 'matikan'} dikirim`);
      onSent();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  const lastFor = (relay: number) => commands.find((c) => c.relay === relay);

  return (
    <div className="two-col">
      <div className="card">
        <div className="card-head">
          <div>
            <h2>Kontrol relay</h2>
            <p className="muted small">Saat dinyalakan, relay otomatis mati lagi setelah 3 detik demi keamanan.</p>
          </div>
        </div>
        {!device.online && (
          <div className="alert info" style={{ marginBottom: 12 }}>
            <span>Perangkat sedang offline. Perintah akan menunggu maks. 30 detik, lalu dibatalkan.</span>
          </div>
        )}
        <div className="relays">
          {device.relayLabels.map((label, i) => {
            const last = lastFor(i + 1);
            return (
              <div key={i} className="relay">
                <div className="relay-name">
                  <span className="relay-num">{i + 1}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    <div className="muted small">
                      {last ? `${last.action === 'ON' ? 'Nyala' : 'Mati'} · ${STATUS_LABEL[last.status].toLowerCase()}` : 'Belum pernah dipakai'}
                    </div>
                  </div>
                </div>
                <div className="relay-actions">
                  <button className="btn primary sm" disabled={!!busy} onClick={() => send(i + 1, 'ON')}>
                    <Power size={15} />
                    Nyalakan
                  </button>
                  <button className="btn sm" disabled={!!busy} onClick={() => send(i + 1, 'OFF')}>
                    <PowerOff size={15} />
                    Matikan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Riwayat perintah</h2>
        </div>
        {commands.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Belum ada perintah yang dikirim.
          </p>
        ) : (
          <div className="list">
            {commands.slice(0, 10).map((c) => (
              <div key={c.id} className="list-row">
                <span className="relay-num">{c.relay}</span>
                <div className="grow">
                  <div className="title">
                    {device.relayLabels[c.relay - 1]} · {c.action === 'ON' ? 'Nyalakan' : 'Matikan'}
                  </div>
                  <div className="muted small">{timeAgo(c.createdAt)}</div>
                </div>
                <span className={`status-text ${c.status}`}>{STATUS_LABEL[c.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  device,
  isAdmin,
  onSaved,
  onDeleted,
}: {
  device: Device;
  isAdmin: boolean;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(device.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('Gagal menyalin, salin manual', 'error');
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteDevice(device.id);
      onDeleted();
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <>
      <MqttCard deviceId={device.id} />

      {isAdmin && <HomeAssistantCard key={device.id} device={device} onSaved={onSaved} />}

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Hubungkan lewat HTTP (alternatif)</h2>
            <p className="muted small">
              Tanam kunci ini di firmware. ESP32 mengirim data ke <code>POST /api/iot/readings</code> dan mengambil perintah dari{' '}
              <code>GET /api/iot/commands</code> dengan header <code>x-device-key</code>.
            </p>
          </div>
        </div>
        <div className="key-box">
          <code>{showKey ? device.apiKey : '•'.repeat(32)}</code>
          <button className="icon-btn" onClick={() => setShowKey((s) => !s)} aria-label={showKey ? 'Sembunyikan' : 'Tampilkan'}>
            {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
          <button className="icon-btn" onClick={copyKey} aria-label="Salin kunci">
            {copied ? <Check size={17} color="var(--primary)" /> : <Copy size={17} />}
          </button>
        </div>
      </div>

      <div className="card danger-zone">
        <div className="card-head" style={{ marginBottom: 0, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2>Hapus perangkat</h2>
            <p className="muted small">Semua data sensor dan riwayat perintah perangkat ini ikut terhapus.</p>
          </div>
          <button className="btn outline-danger" onClick={() => setConfirm(true)}>
            <Trash2 size={16} />
            Hapus
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Hapus perangkat?"
          message={
            <>
              <b>{device.name}</b> beserta seluruh datanya akan dihapus permanen.
            </>
          }
          confirmLabel="Ya, hapus"
          busy={busy}
          onConfirm={remove}
          onClose={() => setConfirm(false)}
        />
      )}
    </>
  );
}
