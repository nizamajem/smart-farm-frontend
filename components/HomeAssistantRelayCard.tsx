'use client';

import { House, RefreshCw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Device, HaRelayKey, HaRelayMap, HaState } from '@/lib/types';
import { DOSING_CHANNELS } from './NutrientPanel';
import { useToast } from './Toast';

const KEYS: HaRelayKey[] = ['relay1', 'relay2', 'relay3', 'relay4'];
const stateLabel = (state?: string) => state === 'on' ? 'Nyala' : state === 'off' ? 'Mati' : 'Tidak tersedia';

export default function HomeAssistantRelayCard({ device, onSaved }: { device: Device; onSaved: () => void }) {
  const toast = useToast();
  const [map, setMap] = useState<HaRelayMap>(() => Object.fromEntries(KEYS.map((key) => [key, device.haRelays?.[key] || ''])));
  const [entities, setEntities] = useState<HaState[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(device.haRelays || {});

  async function refresh() {
    setLoading(true);
    try { setEntities(await api.haRelayEntities()); setError(''); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  const selected = KEYS.map((key) => map[key]).filter(Boolean);
  const duplicate = new Set(selected).size !== selected.length;
  const dirty = KEYS.some((key) => (map[key] || '') !== (saved[key] || ''));

  async function save() {
    setBusy(true);
    try {
      const next = await api.setHaRelays(device.id, Object.fromEntries(KEYS.map((key) => [key, map[key] || ''])));
      setSaved(next.haRelays || {});
      setError('');
      toast('Pemetaan relay disimpan. Buka tab Kontrol untuk menguji kanal.');
      onSaved();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="card ha-relay-settings">
    <div className="card-head"><div><div className="nutrient-module-title"><House size={20} /><h2>Modul relay dari Home Assistant</h2></div><p className="muted small">Pilih entity Dosing01 yang sesuai untuk setiap larutan. Menyimpan pemetaan tidak menyalakan relay.</p></div><button className="btn sm" onClick={refresh} disabled={loading || busy}><RefreshCw size={15} />{loading ? 'Memuat…' : 'Muat ulang entity'}</button></div>
    <div className="form-grid">{KEYS.map((key, i) => {
      const selectedEntity = entities.find((e) => e.entity_id === map[key]);
      const missing = !!map[key] && !selectedEntity;
      return <label className="field" key={key}>
        Relay {i + 1} · {DOSING_CHANNELS[i].name}
        <select value={map[key] || ''} disabled={loading || busy} onChange={(e) => setMap({ ...map, [key]: e.target.value })}>
          <option value="">Tanpa Home Assistant · gunakan MQTT/HTTP</option>
          {missing && <option value={map[key]}>{map[key]} · belum ditemukan</option>}
          {entities.map((entity) => <option value={entity.entity_id} key={entity.entity_id} disabled={KEYS.some((other) => other !== key && map[other] === entity.entity_id)}>{entity.attributes.friendly_name || entity.entity_id} — {entity.entity_id}</option>)}
        </select>
        <span className="hint">{map[key] ? loading ? 'Memeriksa entity…' : missing ? 'Entity tidak ditemukan. Muat ulang atau pilih entity lain.' : `Status di HA: ${stateLabel(selectedEntity?.state)}` : 'Kanal ini tetap memakai protokol perangkat Smart Farm.'}</span>
      </label>;
    })}</div>
    <p className="muted small">Label kanal yang dipetakan akan mengikuti Larutan A, Larutan B, pH Up, dan pH Down. Satu entity hanya boleh dipakai pada satu kanal/panel.</p>
    {duplicate && <div className="alert error">Pilih entity yang berbeda untuk setiap kanal.</div>}
    {error && <div className="alert error" role="alert">{error}</div>}
    <div className="ha-relay-settings-actions"><span className="muted small" role="status">{dirty ? 'Ada perubahan yang belum disimpan' : 'Pemetaan sesuai pengaturan tersimpan'}</span><button className="btn primary" onClick={save} disabled={!dirty || busy || loading || duplicate}><Save size={16} />{busy ? 'Menyimpan…' : 'Simpan pemetaan relay'}</button></div>
  </section>;
}
