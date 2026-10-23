'use client';

import { ArrowDown, ArrowRight, ArrowUp, Beaker, Check, ChevronDown, Droplets, FlaskConical, Gauge, Info, SlidersHorizontal, Thermometer, Waves, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { timeAgo } from '@/lib/format';
import type { Device, HaRelayStatus, RelayCommand, SensorReading } from '@/lib/types';

export const DOSING_CHANNELS = [
  { name: 'Larutan A', displayName: 'Pompa larutan A', purpose: 'Menambahkan nutrisi A', letter: 'A', color: 'green', Icon: FlaskConical },
  { name: 'Larutan B', displayName: 'Pompa larutan B', purpose: 'Menambahkan nutrisi B', letter: 'B', color: 'blue', Icon: FlaskConical },
  { name: 'pH Up', displayName: 'Pompa penaik pH', purpose: 'Menambahkan larutan pH Up', letter: '+', color: 'amber', Icon: ArrowUp },
  { name: 'pH Down', displayName: 'Pompa penurun pH', purpose: 'Menambahkan larutan pH Down', letter: '−', color: 'violet', Icon: ArrowDown },
] as const;

// Snapshot supplied by the user. Never saved as a live sensor reading.
const REFERENCE: Partial<SensorReading> = {
  ph: null, temperature: 26.4, orp: -1633, conductivity: 0, tds: 0,
  salinity: 0, specificGravity: 0.996, conductivityFactor: 0, humidity: 0,
};

const DETAILS = [
  { key: 'conductivity', label: 'Daya hantar listrik (EC)', unit: 'µS/cm', help: 'Kemampuan air menghantarkan listrik.', Icon: Zap },
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

export default function NutrientPanel({ device, commands, relayStates = [], onSettings, onControl }: {
  device: Device; commands: RelayCommand[]; relayStates?: HaRelayStatus[]; onSettings: () => void; onControl: () => void;
}) {
  const [example, setExample] = useState(false);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({ pumps: {} });
  const [storageError, setStorageError] = useState('');
  const storageKey = `smartfarm:nutrient-drafts:v1:${device.ownerId}:${device.id}`;
  useEffect(() => {
    try { setDrafts(readDrafts(storageKey)); }
    catch { setDrafts({ pumps: {} }); setStorageError('Catatan di browser ini tidak dapat dibaca. Angka dari alat tetap bisa dilihat.'); }
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
    <div className="nutrient-panel easy-nutrients">
      <div className="nutrient-intro">
        <div>
          <h2>Air dan nutrisi tanaman</h2>
          <p>Lihat kondisi air dan periksa keempat pompa larutan.</p>
        </div>
        <button className="btn" onClick={onSettings}>Pengaturan alat <ArrowRight size={20} /></button>
      </div>

      {example && <div className="alert info" role="status"><Info size={22} /><span><b>Anda sedang melihat contoh.</b> Angka ini bukan kondisi air saat ini.</span><button className="btn" onClick={() => setExample(false)}>Tutup contoh</button></div>}
      {!example && !measured && <div className="nutrient-connect"><div><b>Angka dari alat belum masuk</b><p>Minta pendamping memeriksa sambungan alat. Angka akan muncul setelah alat mengirim data.</p></div><button className="btn" onClick={onSettings}>Periksa sambungan <ArrowRight size={20} /></button></div>}
      {storageError && <div className="alert error" role="alert">{storageError}</div>}

      <div className="nutrient-layout">
        <section className="card water-module" aria-label="Kondisi air">
          <div className="nutrient-module-head">
            <div className="nutrient-module-title"><span className="nutrient-module-icon"><Waves size={26} /></span><h2>Kondisi air</h2></div>
            <span className={`pill ${example ? 'warn' : measured && device.online ? 'ok' : 'off'}`}>{example ? 'Contoh' : measured ? device.online ? 'Alat terhubung' : 'Alat tidak terhubung' : 'Menunggu alat'}</span>
          </div>
          <div className="ph-focus">
            <h3>Keasaman air (pH)</h3>
            <div className="ph-number">{value(ph)}<span>{phValid ? 'pH' : hasPh ? 'perlu diperiksa' : 'Belum terbaca'}</span></div>
            <div className="ph-scale" aria-label="Skala keasaman air 0 sampai 14">{phValid && <span className="ph-marker" style={{ left: `${ph / 14 * 100}%` }} />}</div>
            <div className="ph-scale-label"><span>Asam</span><span>Netral (7)</span><span>Basa</span></div>
            <p>{phValid ? 'Angka ini menunjukkan keasaman air. Patokan yang sesuai bergantung pada tanaman.' : hasPh ? 'Angka berada di luar skala pH. Minta pendamping memeriksa alat.' : 'Alat belum memberikan angka pH. Jangan menambah larutan pengubah pH berdasarkan angka kosong.'}</p>
          </div>
          <div className="water-key-metrics">
            <div><span className="water-metric-label"><Droplets size={22} />Kepekatan nutrisi (TDS)</span><strong>{value(reading?.tds)} <small>ppm</small></strong><span>Menunjukkan banyaknya zat terlarut dalam air.</span></div>
            <div><span className="water-metric-label"><Thermometer size={22} />Suhu air</span><strong>{value(reading?.temperature)} <small>°C</small></strong><span>Suhu yang dibaca oleh alat di dalam air.</span></div>
          </div>
          <p className="water-updated">{example ? 'Contoh data dari alat TDS02' : device.latestReading ? `Data terakhir diterima ${timeAgo(device.latestReading.createdAt)}` : 'Belum ada data dari alat'}</p>
          {!example && measured && !device.online && <p className="alert info">Ini adalah angka terakhir yang tersimpan. Angka belum diperbarui karena alat tidak terhubung.</p>}
          <details className="water-details">
            <summary>Lihat angka tambahan <ChevronDown size={22} /></summary>
            <div className="water-detail-grid">{DETAILS.map(({ key, label, unit, help, Icon }) => <div className="water-detail" key={key} title={help}><Icon size={22} /><div><span>{label}</span><strong>{value(reading?.[key], key === 'specificGravity' ? 3 : 2)} <small>{unit}</small></strong></div></div>)}</div>
          </details>
          <details className="water-details nutrient-help">
            <summary>Periksa ketepatan alat pH <ChevronDown size={22} /></summary>
            <p>Gunakan larutan pembanding pH 7 dan pH 4. Catat hasilnya agar mudah diperiksa bersama pendamping.</p>
            <button className="btn" disabled={example} onClick={() => setCalibration({ kind: 'ph' })}><SlidersHorizontal size={20} />Catat pemeriksaan pH</button>
          </details>
        </section>

        <section className="card dosing-module" aria-label="Empat pompa larutan">
          <div className="nutrient-module-title"><span className="nutrient-module-icon"><FlaskConical size={26} /></span><h2>Empat pompa larutan</h2></div>
          <p className="dosing-description">Setiap pompa mengalirkan satu jenis larutan.</p>
          {DOSING_CHANNELS.some((c, i) => device.relayLabels[i] !== c.name) && <p className="dosing-note">Nama pompa belum dicocokkan dengan alat. Minta pendamping memeriksa Pengaturan alat sebelum menjalankan pompa.</p>}
          <div className="dosing-channels">{DOSING_CHANNELS.map(({ name, displayName, purpose, color, letter }, i) => {
            const draft = drafts.pumps[i];
            const command = commands.find((c) => c.relay === i + 1);
            const entityId = device.haRelays?.[`relay${i + 1}` as keyof typeof device.haRelays];
            const state = relayStates.find((s) => s.relay === i + 1 && s.entityId === entityId);
            const status = example ? 'Mati · contoh' : entityId ? state?.state === 'on' ? 'Menyala' : state?.state === 'off' ? 'Mati' : 'Status belum terbaca' : 'Belum terhubung ke panel';
            return <article className={`dosing-channel ${color}`} key={name}>
              <div className="pump-heading"><span className="dosing-letter" aria-hidden="true">{letter}</span><div><h3>{displayName}</h3><p>{purpose}</p></div></div>
              <div className={`dosing-state ${!example && state?.state === 'on' ? 'pump-running' : ''}`}><span className="dot" />{status}</div>
              <details className="pump-measurement">
                <summary>Catatan takaran pompa <ChevronDown size={20} /></summary>
                <p>{draft ? `Hasil catatan: ${value(Number(draft.volume) / Number(draft.seconds))} ml setiap detik.` : 'Belum ada catatan jumlah larutan yang keluar.'}</p>
                <button className="btn" disabled={example} onClick={() => setCalibration({ kind: 'pump', index: i })}>{draft ? 'Lihat atau ubah catatan' : 'Catat hasil pengukuran'}</button>
                {draft && <p className="dosing-caption">Catatan hanya tersimpan di browser ini. Belum mengubah kerja pompa.</p>}
                {!example && command && <p>Perintah terakhir: {command.action === 'ON' ? 'nyalakan' : 'matikan'} — {{ pending: 'menunggu alat', sent: 'sedang dikirim', done: 'selesai', expired: 'tidak terkirim', failed: 'gagal' }[command.status]}.</p>}
              </details>
            </article>;
          })}</div>
          <button className="btn primary pump-control-link" disabled={example} onClick={onControl}>Buka kontrol pompa <ArrowRight size={22} /></button>
          <p className="pump-status-help">Status pompa berasal dari laporan alat, bukan pengukuran aliran larutan.</p>
        </section>
      </div>

      <details className="card nutrient-readiness">
        <summary>Persiapan pemeriksaan alat <ChevronDown size={22} /></summary>
        <p>Catatan pemeriksaan tersimpan di browser ini. Pengaturan alat belum berubah.</p>
        <div className="nutrient-checklist"><div><span className={measured && !example ? 'ready' : ''}>{measured && !example ? <Check size={20} /> : '1'}</span><p><b>Sambungkan alat</b><small>{measured && !example ? 'Angka dari alat sudah tersedia' : 'Menunggu angka dari alat'}</small></p></div><div><span className={drafts.ph ? 'ready' : ''}>{drafts.ph ? <Check size={20} /> : '2'}</span><p><b>Periksa angka pH</b><small>{drafts.ph ? 'Hasil pemeriksaan sudah dicatat' : 'Siapkan larutan pembanding pH 7 dan 4'}</small></p></div><div><span className={pumpCount === 4 ? 'ready' : ''}>{pumpCount === 4 ? <Check size={20} /> : '3'}</span><p><b>Ukur larutan yang keluar</b><small>{pumpCount} dari 4 pompa sudah dicatat</small></p></div></div>
      </details>
      <details className="nutrient-help-example"><summary>Ingin melihat contoh tampilan?</summary><p>Contoh hanya untuk mengenal tampilan. Angkanya tidak disimpan sebagai kondisi air.</p><button className="btn" onClick={() => setExample(!example)}><Beaker size={20} />{example ? 'Kembali ke angka alat' : 'Lihat contoh data'}</button></details>
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
  const title = isPh ? 'Periksa ketepatan alat pH' : `Catat takaran · ${DOSING_CHANNELS[index].displayName}`;
  const steps = ['Siapkan alat', 'Isi hasil ukur', 'Periksa dan simpan'];
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
      <div className="alert info"><Info size={17} /><span>Form ini hanya mencatat hasil uji. Mengisi form tidak menyalakan pompa atau mengubah pengaturan alat.</span></div>
      {step === 0 && <>
        <h3>{isPh ? 'Siapkan alat dan larutan pembanding' : 'Siapkan satu pompa dan gelas ukur'}</h3>
        <ol className="calibration-instructions">{(isPh ? ['Siapkan larutan pembanding pH 7,00 dan pH 4,00 dalam dua wadah terpisah.', 'Bilas ujung alat ukur dengan air bersih. Ikuti petunjuk pemeriksaan dari pembuat alat.', 'Celupkan alat ke setiap larutan pembanding secara bergantian. Tunggu angkanya berhenti berubah, lalu catat.'] : [`Minta pendamping memastikan pompa ${DOSING_CHANNELS[index].name} sudah tersambung dengan benar.`, 'Siapkan gelas ukur pada keluaran pompa dan pastikan selang sudah terisi.', 'Jalankan pompa dari alat selama 0,5–3 detik. Catat berapa detik pompa berjalan dan berapa ml larutan yang tertampung.']).map((s) => <li key={s}>{s}</li>)}</ol>
        <label className="calibration-agree"><input type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} />Saya sudah menyiapkan alat dan memahami langkahnya.</label>
      </>}
      {step === 1 && <>
        <h3>{isPh ? 'Catat angka dari dua larutan pembanding' : 'Masukkan hasil uji manual'}</h3>
        <p className="muted small">{isPh ? 'Tulis angka yang tampil pada alat, bukan angka pada label larutan pembanding.' : 'Tulis jumlah larutan yang benar-benar tertampung di gelas ukur.'}</p>
        <div className="form-grid">{isPh ? <>
          <label className="field">Angka alat pada larutan pH 7,00<input type="number" min="0" max="14" step="any" required value={neutral} onChange={(e) => setNeutral(e.target.value)} placeholder="Contoh: 6,85" autoFocus /><span className="hint">Tulis angka yang tampil pada alat</span></label>
          <label className="field">Angka alat pada larutan pH 4,00<input type="number" min="0" max="14" step="any" required value={acid} onChange={(e) => setAcid(e.target.value)} placeholder="Contoh: 4,12" /><span className="hint">Tulis angka yang tampil pada alat</span></label>
        </> : <>
          <label className="field">Lama pompa berjalan (detik)<input type="number" min="0.5" max="3" step="any" required value={seconds} onChange={(e) => setSeconds(e.target.value)} autoFocus /><span className="hint">Contoh: 3 berarti pompa berjalan 3 detik</span></label>
          <label className="field">Larutan yang terkumpul (ml)<input type="number" min="0.001" step="any" required value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="Contoh: 12" /><span className="hint">Baca angka pada gelas ukur setelah uji</span></label>
        </>}</div>
      </>}
      {step === 2 && <>
        <h3>Periksa sebelum menyimpan catatan</h3>
        {isPh ? <div className="calibration-results"><div><span>Larutan pembanding pH 7,00</span><strong>{value(Number(neutral))}</strong></div><div><span>Larutan pembanding pH 4,00</span><strong>{value(Number(acid))}</strong></div></div> : <div className="calibration-result"><span>Debit {DOSING_CHANNELS[index].name}</span><strong>{value(Number(volume) / Number(seconds))} <small>ml/detik</small></strong><p>{value(Number(volume))} ml ÷ {value(Number(seconds))} detik</p></div>}
        <p className="muted small">{isPh ? 'Catatan ini membantu pendamping memeriksa ketepatan alat. Penyetelan alat dilakukan sesuai petunjuk pembuatnya.' : 'Angka ini adalah jumlah larutan yang keluar setiap detik. Ulangi pengukuran untuk memastikan hasilnya tetap sama.'}</p>
        <div className="calibration-save-note">Catatan disimpan di browser ini. Kerja alat dan pompa belum berubah.</div>
      </>}
      {error && <div className="alert error" role="alert">{error}</div>}
      <div className="calibration-actions"><button type="button" className="btn" onClick={() => step > 0 ? setStep(step - 1) : onClose()}>{step > 0 ? 'Kembali' : 'Batal'}</button><button className="btn primary" disabled={step === 0 ? !ready : !valid}>{step === 2 ? 'Simpan catatan' : 'Lanjut'}{step < 2 && <ArrowRight size={15} />}</button></div>
    </form>
  </Modal>;
}
