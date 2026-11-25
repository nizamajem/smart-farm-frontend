'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AccessoryMapping, AccessoryStatus, AccessoryValue, Device, HaState, PanelAccessories as Config } from '@/lib/types';
import Switch from './Switch';
import Link from 'next/link';

const tankNames = {main:'Tandon Utama',a:'Tandon Larutan A',b:'Tandon Larutan B'};
const defaults = (): Config => ({ plugs: [{name:'Pompa Air Utama'}, {name:'Pompa Sirkulasi'}], valve:{name:'Katup Air Tandon'}, curtain:{name:'Tirai GH'}, tanks: (['main','a','b'] as const).map(key=>({key,entity:'',mode:'percent'})), level:{name:'Level Air'}, soils:[{name:'Soil Sensor 1'}] });
const normalized = (config?: Config | null): Config => ({...defaults(), ...config, tanks: config?.tanks || defaults().tanks});
const value = (v?:AccessoryValue) => v?.value != null ? `${v.value.toLocaleString('id-ID')} ${v.unit || ''}` : v?.state === 'on' ? 'Aktif' : v?.state === 'off' ? 'Tidak aktif' : v?.state || (v?.entityId ? 'Tidak tersedia' : 'Belum dihubungkan');

export default function PanelAccessories({device,settingsOnly=false,onSaved}:{device:Device;settingsOnly?:boolean;onSaved?:()=>void}) {
  const {user} = useAuth();
  const [config,setConfig] = useState<Config>(normalized(device.accessories));
  const [status,setStatus] = useState<AccessoryStatus|null>(null);
  const [entities,setEntities] = useState<HaState[]>([]);
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('');
  const generation = useRef(0), pending = useRef(false);
  useEffect(() => {
    setConfig(normalized(device.accessories)); setStatus(null);setMessage('');
    async function load() {
      if (pending.current) return;
      const version = ++generation.current;
      try { const s = await api.accessoryStatus(device.id); if (version === generation.current) setStatus(s); }
      catch { if (version === generation.current) setStatus(null); }
    }
    if(settingsOnly) return;
    load(); const timer=setInterval(load,10000);
    return () => {clearInterval(timer); ++generation.current;};
  },[device.id,settingsOnly]);
  async function command(key:string,on:boolean) {
    if(pending.current) return;
    pending.current=true; const version=++generation.current; setBusy(true); setMessage('');
    try {const next=await api.commandAccessory(device.id,key,on?'ON':'OFF');if(version===generation.current)setStatus(next);}
    catch {if(version===generation.current){setStatus(null);setMessage('Status belum terkonfirmasi. Periksa perangkat, lalu perbarui.');}}
    finally {pending.current=false;setBusy(false);}
  }
  async function save() {
    pending.current=true; const version=++generation.current; setBusy(true);setMessage('');
    try {const saved=await api.saveAccessories(device.id,config);const next=settingsOnly?null:await api.accessoryStatus(device.id);if(version===generation.current){setConfig(saved);setStatus(next);setMessage('Pengaturan tersimpan.');onSaved?.();}}
    catch(e) {if(version===generation.current)setMessage((e as Error).message);}
    finally {pending.current=false;setBusy(false);}
  }
  function fields(p:AccessoryMapping,keys:[keyof AccessoryMapping,string][],update:(p:AccessoryMapping)=>void) {
    return <div className="card" style={{padding:14}}><label className="field">Nama<input maxLength={80} value={p.name} disabled={busy} onChange={e=>update({...p,name:e.target.value})}/></label>{keys.map(([key,label])=>{
      const options=entities.filter(e=>key==='entity'?e.entity_id.startsWith('switch.'):key==='status'?/^(sensor|binary_sensor)\./.test(e.entity_id):e.entity_id.startsWith('sensor.'));
      return <label className="field" key={key}>{label}<select value={p[key]||''} disabled={busy} onChange={e=>update({...p,[key]:e.target.value})}><option value="">Belum dihubungkan</option>{p[key]&&!options.some(e=>e.entity_id===p[key])&&<option value={p[key]}>{p[key]}</option>}{options.map(e=><option key={e.entity_id} value={e.entity_id}>{e.attributes.friendly_name||e.entity_id} · {e.entity_id}</option>)}</select></label>;
    })}</div>;
  }
  const controls = status ? [...status.plugs,status.valve,...(status.curtain?[status.curtain]:[])] : [...config.plugs.map((p,i)=>({...p,key:`plug${i+1}`,state:null})),{...config.valve,key:'valve',state:null},{...config.curtain!,key:'curtain',state:null}];
  return <section aria-label="Perlengkapan panel" style={{marginTop:16}}><h3>Parameter Kontrol & Monitoring Aplikasi</h3>{!settingsOnly && <><div className="farm-control-grid">{controls.map(p=><article className="card" key={p.key} style={{padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><strong>{p.name}</strong><div className="muted small">{p.state==='on'?'ON':p.state==='off'?'OFF':'Tidak tersedia'}</div></div><Switch label={p.name} checked={p.state==='on'} disabled={busy||!['on','off'].includes(p.state||'')} onChange={on=>command(p.key,on)}/></article>)}</div>
    <Link className="btn" style={{marginTop:12}} href={`/devices/${device.id}/tanks`}>Cek Level Air</Link>
    <div className="farm-control-grid" style={{marginTop:12}}>{config.soils.map((s,i)=><article className="card" key={i} style={{padding:16}}><strong>{s.name}</strong><div>Kelembapan: {value(status?.soils[i]?.moisture)}</div><div>Suhu: {value(status?.soils[i]?.temperature)}</div></article>)}</div>
    </>}
    {message&&<p role="status">{message}</p>}
    {settingsOnly&&user?.role==='admin'&&<details style={{marginTop:16}} onToggle={async e=>{if(e.currentTarget.open){try{setEntities(await api.haStates(''));}catch{setMessage('Daftar entity belum tersedia. Coba buka pengaturan lagi.');}}}}><summary>Pengaturan pompa, tirai, tandon, dan sensor tanah</summary><div className="simple-mix-form" style={{marginTop:12}}>{config.plugs.map((p,i)=><div key={i}><h4>{i===0?'Pompa Air Utama · Smart Plug 1':'Pompa Sirkulasi · Smart Plug 2'}</h4>{fields(p,[['entity','Entity ON/OFF']],next=>setConfig({...config,plugs:config.plugs.map((v,j)=>j===i?next:v)}))}</div>)}<h4>Katup Air Tandon · Smart Valve</h4>{fields(config.valve,[['entity','Entity ON/OFF Smart Valve']],valve=>setConfig({...config,valve}))}<h4>Tirai GH · Relay ESP</h4>{fields(config.curtain || {name:'Tirai GH'},[['entity','Entity relay ESP untuk buka/tutup tirai']],curtain=>setConfig({...config,curtain}))}
      <p className="muted">Tirai: ON = buka, OFF = tutup. Pilih relay tirai terpisah dari relay pompa nutrisi.</p>
      <h4>Cek Level Air · Tiga Tandon</h4>
      {config.tanks!.map((tank,i)=>{
        const update = (patch: Partial<typeof tank>) => setConfig({...config,tanks:config.tanks!.map((v,j)=>j===i?{...v,...patch}:v)});
        return <div className="card" style={{padding:14}} key={tank.key}>
          <h4>{tankNames[tank.key]}</h4>
          <label className="field">Sensor level tandon<select disabled={busy} value={tank.entity} onChange={e=>update({entity:e.target.value})}><option value="">Belum dihubungkan</option>{tank.entity&&!entities.some(e=>e.entity_id===tank.entity)&&<option value={tank.entity}>{tank.entity}</option>}{entities.filter(e=>e.entity_id.startsWith('sensor.')).map(e=><option key={e.entity_id} value={e.entity_id}>{e.attributes.friendly_name||e.entity_id} · {e.entity_id}</option>)}</select></label>
          <label className="field">Jenis bacaan<select disabled={busy} value={tank.mode} onChange={e=>update({mode:e.target.value as typeof tank.mode})}><option value="percent">Persentase langsung (unit %)</option><option value="calibrated">Kalibrasi jarak / level sensor</option></select></label>
          {tank.mode==='calibrated'&&<><p className="hint">Gunakan satuan asli sensor. Untuk sensor jarak dari atas, nilai kosong bisa lebih besar daripada nilai penuh.</p>{(['emptyValue','fullValue'] as const).map(key=><label className="field" key={key}>{key==='emptyValue'?'Bacaan saat kosong (0%)':'Bacaan saat penuh (100%)'}<input disabled={busy} type="number" step="any" value={tank[key]??''} onChange={e=>update({[key]:e.target.value===''?undefined:Number(e.target.value)})}/></label>)}</>}
        </div>;
      })}
{config.soils.map((s,i)=><div key={i}>{fields(s,[['moisture','Kelembapan tanah'],['temperature','Suhu tanah']],next=>setConfig({...config,soils:config.soils.map((v,j)=>j===i?next:v)}))}{config.soils.length>1&&<button className="btn" disabled={busy} onClick={()=>setConfig({...config,soils:config.soils.filter((_,j)=>j!==i)})}>Hapus {s.name}</button>}</div>)}<button className="btn" disabled={busy||config.soils.length>=32} onClick={()=>setConfig({...config,soils:[...config.soils,{name:`Soil Sensor ${config.soils.length+1}`}]})}>+ Soil Sensor</button><button className="btn" disabled={busy} onClick={save}>Simpan pengaturan</button></div></details>}
  </section>;
}
