'use client';
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
import type {TankStatus} from '@/lib/types';

export default function TankLevelsPage() {
  const id=Number(useParams<{id:string}>().id);
  const [tanks,setTanks]=useState<TankStatus[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let mounted=true, pending=false;
    async function load() {
      if(pending)return; pending=true;
      try {const data=await api.accessoryStatus(id); if(mounted){setTanks(data.tanks||[]);setError('');}}
      catch {if(mounted){setTanks([]);setError('Level air belum bisa diperbarui.');}}
      finally {pending=false;if(mounted)setLoading(false);}
    }
    load();const timer=setInterval(load,10000);
    return()=>{mounted=false;clearInterval(timer);};
  },[id]);
  return <div><Link className="btn" href={`/devices/${id}`}>Kembali ke greenhouse</Link><h1>Level Air Tandon</h1><p className="muted">Persentase isi tandon: 0% kosong, 100% penuh.</p>{loading&&<p>Memuat level air…</p>}{error&&<p role="alert">{error}</p>}<div className="form-grid">{(['main','a','b'] as const).map(key=>{
    const tank=tanks.find(t=>t.key===key),percent=tank?.percent;
    return <article className="card" key={key} style={{padding:24}}><h2>{{main:'Tandon Utama',a:'Tandon Larutan A',b:'Tandon Larutan B'}[key]}</h2><strong style={{fontSize:32}}>{percent==null?'Tidak tersedia':`${percent.toLocaleString('id-ID',{maximumFractionDigits:1})}%`}</strong>{percent!=null&&<><progress aria-label={`Level ${tank?.name}`} value={percent} max={100} style={{width:'100%',height:24}}/><p>{percent===100?'Penuh':percent===0?'Kosong':'Terisi'}</p></>}{percent==null&&<p className="muted">Periksa pemetaan sensor dan kalibrasi di pengaturan greenhouse.</p>}</article>;
  })}</div></div>;
}
