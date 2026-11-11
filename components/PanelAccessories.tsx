'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AccessoryMapping, AccessoryStatus, AccessoryValue, Device, HaState, PanelAccessories as Config } from '@/lib/types';
import Switch from './Switch';

const defaults = (): Config => ({ plugs: [{name:'Smart Plug 1'}, {name:'Smart Plug 2'}], valve:{name:'Smart Valve'}, level:{name:'Level Air'}, soils:[{name:'Soil Sensor 1'}] });
const value = (v?:AccessoryValue) => v?.value != null ? `${v.value.toLocaleString('id-ID')} ${v.unit || ''}` : v?.state === 'on' ? 'Aktif' : v?.state === 'off' ? 'Tidak aktif' : v?.state || (v?.entityId ? 'Tidak tersedia' : 'Belum dihubungkan');

export default function PanelAccessories({device}:{device:Device}) {
  const {user} = useAuth();
  const [config,setConfig] = useState<Config>(device.accessories || defaults());
  const [status,setStatus] = useState<AccessoryStatus|null>(null);
  const [entities,setEntities] = useState<HaState[]>([]);
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('');
  const generation = useRef(0), pending = useRef(false);
  useEffect(() => {
    setConfig(device.accessories || defaults()); setStatus(null);setMessage('');
    async function load() {
      if (pending.current) return;
      const version = ++generation.current;
      try { const s = await api.accessoryStatus(device.id); if (version === generation.current) setStatus(s); }
      catch { if (version === generation.current) setStatus(null); }
    }
    load(); const timer=setInterval(load,10000);
    return () => {clearInterval(timer); ++generation.current;};
  },[device.id]);
  async function command(key:string,on:boolean) {
    if(pending.current) return;
    pending.current=true; const version=++generation.current; setBusy(true); setMessage('');
    try {const next=await api.commandAccessory(device.id,key,on?'ON':'OFF');if(version===generation.current)setStatus(next);}
    catch {if(version===generation.current){setStatus(null);setMessage('Status belum terkonfirmasi. Periksa perangkat, lalu perbarui.');}}
    finally {pending.current=false;setBusy(false);}
  }
  async function save() {
    pending.current=true; const version=++generation.current; setBusy(true);setMessage('');
    try {const saved=await api.saveAccessories(device.id,config);const next=await api.accessoryStatus(device.id);if(version===generation.current){setConfig(saved);setStatus(next);setMessage('Pengaturan tersimpan.');}}
    catch(e) {if(version===generation.current)setMessage((e as Error).message);}
    finally {pending.current=false;setBusy(false);}
  }
  function fields(p:AccessoryMapping,keys:[keyof AccessoryMapping,string][],update:(p:AccessoryMapping)=>void) {
    return <div className="card" style={{padding:14}}><label className="field">Nama<input maxLength={80} value={p.name} disabled={busy} onChange={e=>update({...p,name:e.target.value})}/></label>{keys.map(([key,label])=>{
      const options=entities.filter(e=>key==='entity'?e.entity_id.startsWith('switch.'):key==='status'?/^(sensor|binary_sensor)\./.test(e.entity_id):e.entity_id.startsWith('sensor.'));
      return <label className="field" key={key}>{label}<select value={p[key]||''} disabled={busy} onChange={e=>update({...p,[key]:e.target.value})}><option value="">Belum dihubungkan</option>{p[key]&&!options.some(e=>e.entity_id===p[key])&&<option value={p[key]}>{p[key]}</option>}{options.map(e=><option key={e.entity_id} value={e.entity_id}>{e.attributes.friendly_name||e.entity_id} · {e.entity_id}</option>)}</select></label>;
    })}</div>;
  }
  const controls = status ? [...status.plugs,status.valve] : [...config.plugs.map((p,i)=>({...p,key:`plug${i+1}`,state:null})),{...config.valve,key:'valve',state:null}];
  return <section aria-label="Perlengkapan panel" style={{marginTop:16}}><h3>Perlengkapan panel</h3><div className="farm-control-grid">{controls.map(p=><article className="card" key={p.key} style={{padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><strong>{p.name}</strong><div className="muted small">{p.state==='on'?'ON':p.state==='off'?'OFF':'Tidak tersedia'}</div></div><Switch label={p.name} checked={p.state==='on'} disabled={busy||!['on','off'].includes(p.state||'')} onChange={on=>command(p.key,on)}/></article>)}</div>
    <div className="card" style={{marginTop:12,padding:16}}><strong>{status?.level.name||config.level.name}</strong><div>Status: {value(status?.level.status)} · Kedalaman: {value(status?.level.depth)}</div></div>
    <div className="farm-control-grid" style={{marginTop:12}}>{config.soils.map((s,i)=><article className="card" key={i} style={{padding:16}}><strong>{s.name}</strong><div>Kelembapan: {value(status?.soils[i]?.moisture)}</div><div>Suhu: {value(status?.soils[i]?.temperature)}</div></article>)}</div>
    {message&&<p role="status">{message}</p>}
    {user?.role==='admin'&&<details style={{marginTop:16}} onToggle={async e=>{if(e.currentTarget.open){try{setEntities(await api.haStates(''));}catch{setMessage('Daftar entity belum tersedia. Coba buka pengaturan lagi.');}}}}><summary>Pengaturan perlengkapan</summary><div className="simple-mix-form" style={{marginTop:12}}>{config.plugs.map((p,i)=><div key={i}>{fields(p,[['entity','Entity Smart Plug']],next=>setConfig({...config,plugs:config.plugs.map((v,j)=>j===i?next:v)}))}</div>)}{fields(config.valve,[['entity','Entity Smart Valve']],valve=>setConfig({...config,valve}))}{fields(config.level,[['status','Status level air'],['depth','Kedalaman air']],level=>setConfig({...config,level}))}{config.soils.map((s,i)=><div key={i}>{fields(s,[['moisture','Kelembapan tanah'],['temperature','Suhu tanah']],next=>setConfig({...config,soils:config.soils.map((v,j)=>j===i?next:v)}))}{config.soils.length>1&&<button className="btn" disabled={busy} onClick={()=>setConfig({...config,soils:config.soils.filter((_,j)=>j!==i)})}>Hapus {s.name}</button>}</div>)}<button className="btn" disabled={busy||config.soils.length>=32} onClick={()=>setConfig({...config,soils:[...config.soils,{name:`Soil Sensor ${config.soils.length+1}`}]})}>+ Soil Sensor</button><button className="btn" disabled={busy} onClick={save}>Simpan pengaturan</button></div></details>}
  </section>;
}
