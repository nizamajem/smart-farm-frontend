'use client';

import { Activity, ArrowLeft, Check, Copy, Eye, EyeOff, Gauge, Power, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import HomeAssistantCard from '@/components/HomeAssistantCard';
import HomeAssistantRelayCard from '@/components/HomeAssistantRelayCard';
import LineChart from '@/components/LineChart';
import MqttCard from '@/components/MqttCard';
import NutrientPanel from '@/components/NutrientPanel';
import PanelMetrics from '@/components/PanelMetrics';
import PanelControls from '@/components/PanelControls';
import Mascot from '@/components/Mascot';
import { ConfirmDialog } from '@/components/Modal';
import StatusPill from '@/components/StatusPill';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import type { Device, HaRelayStatus, RelayCommand, SensorReading } from '@/lib/types';


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
  const [relayStates, setRelayStates] = useState<HaRelayStatus[]>([]);
  const [relayError, setRelayError] = useState('');
  const relayMap = JSON.stringify(device?.haRelays || {});

  const refreshRelays = useCallback(async () => {
    if (!Object.values(JSON.parse(relayMap)).some(Boolean)) { setRelayStates([]); setRelayError(''); return; }
    try { setRelayStates(await api.haRelayStatus(id)); setRelayError(''); }
    catch (e) { setRelayStates([]); setRelayError((e as Error).message); }
  }, [id, relayMap]);

  useEffect(() => {
    setRelayStates([]);
    refreshRelays();
    const timer = setInterval(refreshRelays, 5000);
    return () => clearInterval(timer);
  }, [refreshRelays]);

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

      <div className="page-head farm-device-heading">
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
        <Mascot scene="water" />
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

      {tab === 'nutrients' && <NutrientPanel key={device.id} device={device} commands={commands} relayStates={relayStates} onSettings={() => setTab('settings')} onControl={() => setTab('control')} />}

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
            <PanelMetrics device={device} />
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

      {tab === 'control' && <PanelControls device={device} />}

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
      {isAdmin && <HomeAssistantRelayCard key={`relays-${device.id}`} device={device} onSaved={onSaved} />}
      {isAdmin && <HomeAssistantCard key={device.id} device={device} onSaved={onSaved} />}
      <MqttCard deviceId={device.id} />

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
