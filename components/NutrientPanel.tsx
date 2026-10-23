'use client';

import { ArrowDown, ArrowRight, ArrowUp, Beaker, Check, ChevronDown, Droplets, FlaskConical, Gauge, Info, SlidersHorizontal, Thermometer, Waves, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { timeAgo } from '@/lib/format';
import type { Device, RelayCommand, SensorReading } from '@/lib/types';

export const DOSING_CHANNELS = [
  { name: 'Larutan A', purpose: 'Nutrisi utama', letter: 'A', color: 'green', Icon: FlaskConical },
  { name: 'Larutan B', purpose: 'Nutrisi pelengkap', letter: 'B', color: 'blue', Icon: FlaskConical },
  { name: 'pH Up', purpose: 'Menaikkan pH air', letter: '+', color: 'amber', Icon: ArrowUp },
  { name: 'pH Down', purpose: 'Menurunkan pH air', letter: '−', color: 'violet', Icon: ArrowDown },
] as const;

// Snapshot supplied by the user. Never saved as a live sensor reading.
const REFERENCE: Partial<SensorReading> = {
  ph: null, temperature: 26.4, orp: -1633, conductivity: 0, tds: 0,
  salinity: 0, specificGravity: 0.996, conductivityFactor: 0, humidity: 0,
};

const DETAILS = [
  { key: 'temperature', label: 'Suhu air', unit: '°C', help: 'Suhu yang terbaca pada modul sensor.', Icon: Thermometer },
  { key: 'orp', label: 'Potensial redoks · ORP', unit: 'mV', help: 'Potensial oksidasi dan reduksi air.', Icon: Zap },
  { key: 'salinity', label: 'Salinitas', unit: 'ppm', help: 'Konsentrasi garam terlarut.', Icon: Waves },
  { key: 'specificGravity', label: 'Berat jenis', unit: '', help: 'Perbandingan kerapatan larutan terhadap air.', Icon: Droplets },
  { key: 'conductivityFactor', label: 'Faktor konduktivitas', unit: '', help: 'Faktor yang dilaporkan perangkat; bukan hasil kalibrasi panel.', Icon: Gauge },
  { key: 'humidity', label: 'Kelembapan modul', unit: '%', help: 'Nilai humidity yang dilaporkan modul sensor.', Icon: Droplets },
] as const;

type PumpDraft = { seconds: string; volume: string; savedAt: string };
type PhDraft = { neutral: string; acid: string; savedAt: string };
type Drafts = { ph?: PhDraft; pumps: Partial<Record<number, PumpDraft>> };
type Calibration = { kind: 'ph' } | { kind: 'pump'; index: number };

function value(n: number | null | undefined, digits = 2) {
  return n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('id-ID', { maximumFractionDigits: digits });
}

function readDrafts(key: string): Drafts {
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  const pumps: Drafts['pumps'] = {};
  for (let i = 0; i < 4; i++) {
    const p = data?.pumps?.[i];
    if (p && typeof p.seconds === 'string' && typeof p.volume === 'string' && typeof p.savedAt === 'string' &&
      Number(p.seconds) >= 0.5 && Number(p.seconds) <= 3 && Number(p.volume) > 0 && Number.isFinite(Number(p.volume))) pumps[i] = p;
  }
  const p = data?.ph;
  const ph = p && typeof p.neutral === 'string' && typeof p.acid === 'string' && typeof p.savedAt === 'string' &&
    p.neutral.trim() && p.acid.trim() && Number.isFinite(Number(p.neutral)) && Number.isFinite(Number(p.acid)) &&
    Number(p.neutral) >= 0 && Number(p.neutral) <= 14 && Number(p.acid) >= 0 && Number(p.acid) <= 14 ? p as PhDraft : undefined;
  return { ph, pumps };
}

export default function NutrientPanel({ device, commands, onSettings }: {
  device: Device; commands: RelayCommand[]; onSettings: () => void;
}) {
  const [example, setExample] = useState(false);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({ pumps: {} });
  const [storageError, setStorageError] = useState('');
  const storageKey = `smartfarm:nutrient-drafts:v1:${device.ownerId}:${device.id}`;
  useEffect(() => {
    try { setDrafts(readDrafts(storageKey)); }
    catch { setDrafts({ pumps: {} }); setStorageError('Catatan lokal tidak dapat dibaca. Anda tetap bisa melihat panel.'); }
  }, [storageKey]);

  const reading = example ? REFERENCE : device.latestReading;
  const ph = reading?.ph;
  const hasPh = ph != null && Number.isFinite(ph);
  const phValid = hasPh && ph >= 0 && ph <= 14;
  const measured = [reading?.ph, reading?.conductivity, reading?.tds].some((n) => n != null);
  const pumpCount = Object.keys(drafts.pumps).length;

  function save(next: Drafts) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setDrafts(next);
      setStorageError('');
      setCalibration(null);
    } catch { setStorageError('Catatan belum tersimpan. Penyimpanan browser tidak tersedia; coba lagi setelah mengaktifkannya.'); }
  }

  return (
    <div className="nutrient-panel">
      <div className="nutrient-intro">
        <div>
          <span className="nutrient-eyebrow">PANEL NUTRISI</span>
          <h2>Satu tempat untuk air & nutrisi.</h2>
          <p className="muted">Pantau kualitas air, kenali kanal dosing, lalu siapkan kalibrasi.</p>
        </div>
        <button className={`btn sm ${example ? 'primary' : ''}`} aria-pressed={example} onClick={() => setExample(!example)}>
          <Beaker size={16} />{example ? 'Kembali ke data aktual' : 'Lihat contoh data'}
        </button>
      </div>

      {example && <div className="alert info" role="status"><Info size={18} /><span><b>Contoh dari referensi Anda.</b> Angka ini bukan pembacaan langsung. pH pada referensi belum tersedia.</span></div>}
      {!example && !measured && <div className="nutrient-connect"><div><b>Sensor kualitas air belum mengirim data</b><p>Hubungkan sensor pH/EC/TDS untuk menampilkan pembacaan aktual di panel ini.</p></div><button className="btn sm" onClick={onSettings}>Hubungkan sensor <ArrowRight size={15} /></button></div>}
      {storageError && <div className="alert error" role="alert">{storageError}</div>}

      <div className="nutrient-layout">
        <section className="card water-module" aria-label="Modul sensor kualitas air">
          <div className="nutrient-module-head">
            <div className="nutrient-module-title"><span className="nutrient-module-icon"><Waves size={22} /></span><div><h2>Kualitas air</h2><p className="muted small">1 modul sensor · pH, EC & TDS</p></div></div>
            <span className={`pill ${example ? 'warn' : measured && device.online ? 'ok' : 'off'}`}>{example ? 'Contoh' : measured ? device.online ? 'Data aktual' : 'Data terakhir' : 'Menunggu data'}</span>
          </div>

          <div className="ph-focus">
            <div className="nutrient-row"><span className="nutrient-eyebrow">TINGKAT KEASAMAN</span><span className="muted small">pH</span></div>
            <div className="ph-number">{value(ph)}<span>{phValid ? 'terbaca' : hasPh ? 'di luar skala' : 'belum terbaca'}</span></div>
            <div className="ph-scale" aria-label="Skala pH 0 sampai 14">
              {phValid && <span className="ph-marker" style={{ left: `${ph / 14 * 100}%` }} />}
            </div>
            <div className="ph-scale-label"><span>0 · Asam</span><span>7 · Netral</span><span>14 · Basa</span></div>
            <p className="muted small">{phValid ? 'Sesuaikan penilaian pH dengan kebutuhan tanaman Anda.' : hasPh ? 'Periksa pembacaan dan kalibrasi sensor.' : 'Nilai pH yang belum tersedia ditampilkan sebagai tanda —.'}</p>
          </div>

          <div className="water-key-metrics">
            <div><span className="water-metric-label"><Zap size={15} />Konduktivitas · EC</span><strong>{value(reading?.conductivity)} <small>µS/cm</small></strong><span className="muted small">Kemampuan air menghantar listrik</span></div>
            <div><span className="water-metric-label"><Droplets size={15} />Padatan terlarut · TDS</span><strong>{value(reading?.tds)} <small>ppm</small></strong><span className="muted small">Jumlah zat terlarut dalam air</span></div>
          </div>

          <details className="water-details" open>
            <summary>Detail sensor <ChevronDown size={16} /></summary>
            <div className="water-detail-grid">{DETAILS.map(({ key, label, unit, help, Icon }) => <div className="water-detail" key={key} title={help}><Icon size={17} /><div><span className="muted small">{label}</span><strong>{value(reading?.[key], key === 'specificGravity' ? 3 : 2)} <small>{unit}</small></strong></div></div>)}</div>
          </details>

          <div className="nutrient-module-foot"><span className="muted small">{example ? 'Referensi: TDS02' : device.latestReading ? `Data terakhir ${timeAgo(device.latestReading.createdAt)}` : 'Belum ada pembacaan tersimpan'}</span><button className="btn sm" disabled={example} onClick={() => setCalibration({ kind: 'ph' })}><SlidersHorizontal size={14} />Siapkan kalibrasi pH</button></div>
        </section>

        <section className="card dosing-module" aria-label="Modul dosing empat relay">
          <div className="nutrient-module-head">
            <div className="nutrient-module-title"><span className="nutrient-module-icon"><FlaskConical size={22} /></span><div><h2>Dosing nutrisi</h2><p className="muted small">1 modul relay · 4 kanal larutan</p></div></div>
            <span className="pill off">Manual</span>
          </div>
          <p className="muted small dosing-description">Setiap kanal memiliki catatan debit sendiri agar volume dosing nantinya dapat dihitung dengan tepat.</p>
          {DOSING_CHANNELS.some((c, i) => device.relayLabels[i] !== c.name) && <p className="dosing-note">Rancangan penamaan kanal di bawah belum diterapkan. Label tersimpan perangkat: {device.relayLabels.join(', ')}.</p>}

          <div className="dosing-channels">{DOSING_CHANNELS.map(({ name, purpose, color, letter, Icon }, i) => {
            const draft = drafts.pumps[i];
            const command = commands.find((c) => c.relay === i + 1);
            return <article className={`dosing-channel ${color}`} key={name}>
              <div className="nutrient-row"><span className="dosing-letter">{letter}</span><span className="muted small">Relay {i + 1}</span></div>
              <div className="dosing-name"><h3>{name}</h3><Icon size={18} /></div>
              <p className="muted small">{purpose}</p>
              <div className="dosing-state"><span className={`dot ${example ? 'example' : ''}`} />{example ? 'Mati · contoh' : 'Status fisik belum tersedia'}</div>
              <div className="dosing-rate"><span className="muted small">Debit hasil catatan</span><strong>{draft ? value(Number(draft.volume) / Number(draft.seconds)) : '—'} <small>ml/detik</small></strong></div>
              <button className="btn sm" disabled={example} onClick={() => setCalibration({ kind: 'pump', index: i })}><SlidersHorizontal size={14} />{draft ? 'Lihat catatan uji' : 'Siapkan kalibrasi'}</button>
              <span className={`dosing-caption ${draft ? 'has-draft' : ''}`}>{draft ? 'Catatan lokal · belum diterapkan' : 'Belum ada catatan kalibrasi'}</span>
              {!example && command && <span className="muted small">Perintah terakhir: {command.action} · {{ pending: 'menunggu', sent: 'terkirim', done: 'dikonfirmasi', expired: 'kedaluwarsa' }[command.status]}</span>}
            </article>;
          })}</div>
          <div className="dosing-note"><Info size={16} /><span>Penamaan kanal adalah rancangan panel. Cocokkan kabel dan pemetaan perangkat sebelum digunakan. Status perintah tidak dianggap sebagai status fisik relay.</span></div>
        </section>
      </div>

      <section className="card nutrient-readiness">
        <div><span className="nutrient-eyebrow">PERSIAPAN KALIBRASI</span><h2>Dari pembacaan ke dosing yang terukur</h2><p className="muted small">Catatan tersimpan di browser ini untuk panel ini. Belum disinkronkan atau diterapkan ke perangkat.</p></div>
        <div className="nutrient-checklist"><div><span className={measured && !example ? 'ready' : ''}>{measured && !example ? <Check size={15} /> : '1'}</span><p><b>Hubungkan sensor</b><small>{measured && !example ? 'Data kualitas air tersedia' : 'Menunggu data kualitas air'}</small></p></div><div><span className={drafts.ph ? 'ready' : ''}>{drafts.ph ? <Check size={15} /> : '2'}</span><p><b>Catat uji pH</b><small>{drafts.ph ? 'Catatan buffer tersimpan' : 'Siapkan buffer pH 7 dan 4'}</small></p></div><div><span className={pumpCount === 4 ? 'ready' : ''}>{pumpCount === 4 ? <Check size={15} /> : '3'}</span><p><b>Ukur debit pompa</b><small>{pumpCount} dari 4 kanal dicatat</small></p></div></div>
      </section>

      {calibration && <CalibrationDialog key={calibration.kind === 'ph' ? 'ph' : calibration.index} calibration={calibration} drafts={drafts} onClose={() => { setCalibration(null); setStorageError(''); }} onSave={save} error={storageError} />}
    </div>
  );
}

function CalibrationDialog({ calibration, drafts, onClose, onSave, error }: {
  calibration: Calibration; drafts: Drafts; onClose: () => void; onSave: (next: Drafts) => void; error: string;
}) {
  const isPh = calibration.kind === 'ph';
  const index = calibration.kind === 'pump' ? calibration.index : 0;
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(drafts.pumps[index]?.seconds || '3');
  const [volume, setVolume] = useState(drafts.pumps[index]?.volume || '');
  const [neutral, setNeutral] = useState(drafts.ph?.neutral || '');
  const [acid, setAcid] = useState(drafts.ph?.acid || '');
  const [ready, setReady] = useState(false);
  const valid = isPh ? neutral.trim() !== '' && acid.trim() !== '' && [neutral, acid].every((n) => Number.isFinite(Number(n)) && Number(n) >= 0 && Number(n) <= 14) : Number(seconds) >= 0.5 && Number(seconds) <= 3 && Number(volume) > 0 && Number.isFinite(Number(volume));
  const title = isPh ? 'Persiapan kalibrasi sensor pH' : `Kalibrasi debit · ${DOSING_CHANNELS[index].name}`;
  const steps = ['Persiapan', 'Catat pengukuran', 'Tinjau hasil'];
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 2) { setStep(step + 1); return; }
    if (!valid) return;
    const savedAt = new Date().toISOString();
    onSave(isPh ? { ...drafts, ph: { neutral, acid, savedAt } } : { ...drafts, pumps: { ...drafts.pumps, [index]: { seconds, volume, savedAt } } });
  }
  return <Modal title={title} onClose={onClose}>
    <form className="calibration-form" onSubmit={submit}>
      <ol className="calibration-steps" aria-label="Tahapan kalibrasi">{steps.map((label, i) => <li key={label} className={step === i ? 'current' : step > i ? 'complete' : ''} aria-current={step === i ? 'step' : undefined}><span>{step > i ? <Check size={13} /> : i + 1}</span>{label}</li>)}</ol>
      <div className="alert info"><Info size={17} /><span>Mode pencatatan. Panel ini tidak menjalankan pompa atau mengubah kalibrasi perangkat.</span></div>
      {step === 0 && <>
        <h3>{isPh ? 'Siapkan sensor dan larutan buffer' : 'Siapkan pengukuran satu kanal'}</h3>
        <ol className="calibration-instructions">{(isPh ? ['Siapkan buffer pH 7,00 dan pH 4,00 dalam wadah terpisah.', 'Bilas probe dengan air bersih, lalu ikuti prosedur kalibrasi dari produsen sensor.', 'Tunggu pembacaan stabil di setiap buffer dan catat angka yang tampil.'] : [`Pastikan Relay ${index + 1} benar terhubung ke pompa ${DOSING_CHANNELS[index].name}.`, 'Siapkan gelas ukur pada keluaran pompa dan pastikan selang sudah terisi.', 'Jalankan uji dari perangkat secara manual, catat durasi aktual dan volume yang keluar. Panel ini menerima catatan uji 0,5–3 detik.']).map((s) => <li key={s}>{s}</li>)}</ol>
        <label className="calibration-agree"><input type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} />Saya sudah menyiapkan alat dan memahami langkahnya.</label>
      </>}
      {step === 1 && <>
        <h3>{isPh ? 'Catat pembacaan di dua buffer' : 'Masukkan hasil uji manual'}</h3>
        <p className="muted small">{isPh ? 'Masukkan nilai yang benar-benar ditampilkan sensor, bukan nilai pada label buffer.' : 'Gunakan volume yang benar-benar tertampung di gelas ukur.'}</p>
        <div className="form-grid">{isPh ? <>
          <label className="field">Pembacaan pada buffer pH 7,00<input type="number" min="0" max="14" step="any" required value={neutral} onChange={(e) => setNeutral(e.target.value)} placeholder="Contoh: 6,85" autoFocus /><span className="hint">Nilai pH dari sensor</span></label>
          <label className="field">Pembacaan pada buffer pH 4,00<input type="number" min="0" max="14" step="any" required value={acid} onChange={(e) => setAcid(e.target.value)} placeholder="Contoh: 4,12" /><span className="hint">Nilai pH dari sensor</span></label>
        </> : <>
          <label className="field">Durasi uji (detik)<input type="number" min="0.5" max="3" step="any" required value={seconds} onChange={(e) => setSeconds(e.target.value)} autoFocus /><span className="hint">Durasi aktual saat pompa berjalan</span></label>
          <label className="field">Volume tertampung (ml)<input type="number" min="0.001" step="any" required value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="Contoh: 12" /><span className="hint">Bukan kapasitas wadah</span></label>
        </>}</div>
      </>}
      {step === 2 && <>
        <h3>Periksa sebelum menyimpan catatan</h3>
        {isPh ? <div className="calibration-results"><div><span>Buffer pH 7,00</span><strong>{value(Number(neutral))}</strong></div><div><span>Buffer pH 4,00</span><strong>{value(Number(acid))}</strong></div></div> : <div className="calibration-result"><span>Debit {DOSING_CHANNELS[index].name}</span><strong>{value(Number(volume) / Number(seconds))} <small>ml/detik</small></strong><p>{value(Number(volume))} ml ÷ {value(Number(seconds))} detik</p></div>}
        <p className="muted small">{isPh ? 'Ini adalah catatan pemeriksaan buffer, bukan koefisien kalibrasi. Kalibrasi alat tetap mengikuti prosedur produsen.' : 'Debit dihitung dari volume ÷ durasi. Ulangi pengukuran untuk memastikan hasil konsisten sebelum menerapkannya ke dosing.'}</p>
        <div className="calibration-save-note">Disimpan hanya di browser ini. Pengaturan perangkat dan dosing otomatis belum berubah.</div>
      </>}
      {error && <div className="alert error" role="alert">{error}</div>}
      <div className="calibration-actions"><button type="button" className="btn" onClick={() => step > 0 ? setStep(step - 1) : onClose()}>{step > 0 ? 'Kembali' : 'Batal'}</button><button className="btn primary" disabled={step === 0 ? !ready : !valid}>{step === 2 ? 'Simpan catatan lokal' : 'Lanjut'}{step < 2 && <ArrowRight size={15} />}</button></div>
    </form>
  </Modal>;
}
