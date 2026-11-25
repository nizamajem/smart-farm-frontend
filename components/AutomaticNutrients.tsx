'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import type {AutomaticConfig,AutomaticStatus} from '@/lib/types';
const defaults:AutomaticConfig={enabled:false,ppmEnabled:true,phEnabled:true,targetPpm:800,targetPh:6,ppmTolerance:20,phTolerance:0.1,abDoseLiters:1,phDoseMl:1,settleSeconds:300,maxCycles:5,stages:[]};
export default function AutomaticNutrients({deviceId}:{deviceId:number}) {
  const [draft,setDraft]=useState(defaults),[live,setLive]=useState<AutomaticStatus|null>(null);
  const [busy,setBusy]=useState(false),[ready,setReady]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{
    let active=true,pending=false,initialized=false;
    async function load(){if(pending)return;pending=true;try{const data=await api.automaticNutrients(deviceId);if(active){setLive(data);setReady(true);if(!initialized){setDraft(data.config||defaults);initialized=true;}}}catch{if(active)setMessage('Status otomatis belum tersedia.');}finally{pending=false;}}
    load();
    const timer=setInterval(load,10000);return()=>{active=false;clearInterval(timer);};
  },[deviceId]);
  async function save(enabled:boolean){setBusy(true);setMessage('');try{const data=await api.saveAutomaticNutrients(deviceId,{...(live?.config?.enabled?live.config:draft),enabled});setDraft(data.config||defaults);setLive(data);setMessage(enabled?'Otomatis aktif.':'Pengaturan tersimpan, otomatis nonaktif.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  const fields:[keyof AutomaticConfig,string][]=[['targetPpm','Target PPM dasar'],['targetPh','Target pH dasar'],['ppmTolerance','Toleransi PPM'],['phTolerance','Toleransi pH'],['abDoseLiters','Dosis A+B per siklus: setara liter pada resep'],['phDoseMl','Dosis pH per siklus (ml)'],['settleSeconds','Jeda pencampuran (detik, minimal 60)'],['maxCycles','Batas siklus sebelum jeda']];
  return <details className="card" style={{padding:16,marginBottom:16}}><summary>Otomatis PPM, pH & HST · {live?.config?.enabled?'Aktif':'Nonaktif'}</summary><p>PPM rendah: tambah A+B. pH rendah: pH UP; pH tinggi: pH DOWN. Setiap dosis diikuti jeda pencampuran dan pembacaan baru. PPM tinggi tidak diencerkan otomatis.</p><p role="status">{live?.state?.message} {live?.hst!=null?`HST ${live.hst}.`:''} {live?.targets?`Target saat ini ${live.targets.targetPpm} ppm / pH ${live.targets.targetPh}.`:''}</p>
    <fieldset disabled={busy||!ready||!!live?.config?.enabled}><legend>Pengaturan otomatis</legend>
    <label><input type="checkbox" checked={draft.ppmEnabled} onChange={e=>setDraft({...draft,ppmEnabled:e.target.checked})}/> Jaga PPM</label> <label><input type="checkbox" checked={draft.phEnabled} onChange={e=>setDraft({...draft,phEnabled:e.target.checked})}/> Jaga pH</label>
    <div className="form-grid">{fields.map(([key,label])=><label className="field" key={key}>{label}<input type="number" step="any" value={Number(draft[key])} onChange={e=>setDraft({...draft,[key]:Number(e.target.value)})}/></label>)}<label className="field">Tanggal tanam (HST 0)<input type="date" value={draft.plantedOn||''} onChange={e=>setDraft({...draft,plantedOn:e.target.value||undefined})}/></label></div>
    <h3>Target berdasarkan HST</h3><p className="muted">Isi target sesuai tanaman Anda. Jika tabel diisi, otomatis memakai tahap HST saat ini. HST tanpa tahap akan menjeda otomatis. Tanpa tabel, target dasar digunakan.</p>
    {(draft.stages||[]).map((stage,i)=><div className="form-grid" key={i}>{([['fromDay','HST mulai'],['toDay','HST sampai'],['targetPpm','Target PPM'],['targetPh','Target pH']] as const).map(([key,label])=><label className="field" key={key}>{label}<input type="number" step={key==='targetPh'?'0.01':'1'} value={stage[key]} onChange={e=>setDraft({...draft,stages:draft.stages!.map((s,j)=>i===j?{...s,[key]:Number(e.target.value)}:s)})}/></label>)}<button className="btn" onClick={()=>setDraft({...draft,stages:draft.stages!.filter((_,j)=>i!==j)})}>Hapus tahap</button></div>)}
    <button className="btn" onClick={()=>setDraft({...draft,stages:[...(draft.stages||[]),{fromDay:(draft.stages?.at(-1)?.toDay??-1)+1,toDay:(draft.stages?.at(-1)?.toDay??-1)+8,targetPpm:draft.targetPpm,targetPh:draft.targetPh}]})}>Tambah tahap HST</button>
    </fieldset>
    {message&&<p role="status">{message}</p>}<div className="actions-row">{live?.config?.enabled?<button className="btn" disabled={busy||!ready} onClick={()=>save(false)}>Matikan otomatis</button>:<><button className="btn" disabled={busy||!ready} onClick={()=>save(false)}>Simpan nonaktif</button><button className="btn primary" disabled={busy||!ready} onClick={()=>save(true)}>Simpan & Aktifkan Otomatis</button></>}</div><p className="muted small">Kalibrasi pompa terlebih dahulu. Dosis mengikuti resep dan hasil kalibrasi. Data sensor lebih dari 2 menit, kegagalan alat, batas siklus, dan restart server menjeda otomatis.</p>
  </details>;
}
