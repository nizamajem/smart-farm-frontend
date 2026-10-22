'use client';

import { Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import CopyField from '@/components/CopyField';
import { api } from '@/lib/api';
import type { MqttCredentials } from '@/lib/types';

/** Kredensial MQTT perangkat ini — untuk diserahkan ke tim hardware. */
export default function MqttCard({ deviceId }: { deviceId: number }) {
  const [cred, setCred] = useState<MqttCredentials | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () =>
      api
        .mqttCredentials(deviceId)
        .then(setCred)
        .catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [deviceId]);

  if (error) return <div className="card alert error">{error}</div>;
  if (!cred) return null;

  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${cred.wsPath}`;
  const pill = !cred.enabled
    ? { cls: 'off', text: 'MQTT dimatikan' }
    : cred.connected
      ? { cls: 'ok', text: 'Tersambung' }
      : { cls: 'off', text: 'Belum tersambung' };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio size={18} />
            <h2>Hubungkan lewat MQTT</h2>
          </div>
          <p className="muted small">
            Berikan data ini ke tim hardware. Perangkat mengirim data sensor & menerima perintah relay seketika.
          </p>
        </div>
        <span className={`pill ${pill.cls}`}>
          <span className="dot" />
          {pill.text}
        </span>
      </div>

      {!cred.enabled && (
        <div className="alert info" style={{ marginBottom: 12 }}>
          Jalur MQTT sedang dimatikan oleh admin (menu Integrasi). Perangkat belum bisa tersambung.
        </div>
      )}

      <div className="form-grid">
        <CopyField label="Server — jaringan lokal" value={`mqtt://${cred.tcp.host ?? location.hostname}:${cred.tcp.port}`} />
        <CopyField label="Server — lewat internet" value={wsUrl} />
        <CopyField label="Username" value={cred.username} />
        <CopyField label="Password" value={cred.password} secret />
        <CopyField label="Client ID (disarankan)" value={cred.clientIdHint} />
      </div>

      <div className="section-label">Topik</div>
      <div className="form-grid">
        <CopyField label="Kirim data sensor (publish)" value={cred.topics.telemetry} />
        <CopyField label="Terima perintah relay (subscribe)" value={cred.topics.command} />
        <CopyField label="Konfirmasi perintah (publish)" value={cred.topics.ack} />
        <CopyField label="Status online/offline (Last Will)" value={cred.topics.status} />
      </div>

      <div className="section-label">Contoh payload</div>
      <div className="form-grid">
        <div>
          <span className="copy-label">Data sensor → {cred.topics.telemetry}</span>
          <pre className="code">{JSON.stringify(cred.examples.telemetry, null, 2)}</pre>
        </div>
        <div>
          <span className="copy-label">Perintah ← {cred.topics.command}</span>
          <pre className="code">{JSON.stringify(cred.examples.command, null, 2)}</pre>
          <span className="copy-label" style={{ marginTop: 8 }}>
            Balas ke {cred.topics.ack}: <code>{JSON.stringify(cred.examples.ack)}</code>
          </span>
        </div>
      </div>
    </div>
  );
}
