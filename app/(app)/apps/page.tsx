'use client';

import { Download, Package, Smartphone, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatBytes, timeAgo } from '@/lib/format';
import type { AppRelease } from '@/lib/types';

/** Admin: unggah APK aplikasi mobile. Rilis terbaru muncul sebagai tombol unduh di halaman login. */
export default function AppsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [releases, setReleases] = useState<AppRelease[] | null>(null);
  const [toDelete, setToDelete] = useState<AppRelease | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = user?.role === 'admin';

  const load = useCallback(() => {
    api
      .releases()
      .then(setReleases)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) router.replace('/dashboard');
    else load();
  }, [isAdmin, router, load]);

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteRelease(toDelete.id);
      toast(`Versi ${toDelete.version} dihapus`);
      setToDelete(null);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  if (!isAdmin) return null;
  const latestId = releases?.[0]?.id;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Aplikasi Android</h1>
          <p className="muted">Unggah APK terbaru. Pengguna bisa mengunduhnya langsung dari halaman login.</p>
        </div>
      </div>

      <UploadCard
        suggestedVersion={releases?.[0] ? bumpPatch(releases[0].version) : '1.0.0'}
        onUploaded={(r) => {
          toast(`Versi ${r.version} berhasil diunggah dan siap diunduh`);
          load();
        }}
      />

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Riwayat versi</h2>
            <p className="muted small">Versi teratas adalah yang ditawarkan di halaman login.</p>
          </div>
        </div>
        {!releases ? (
          <p className="muted">Memuat…</p>
        ) : releases.length === 0 ? (
          <div className="empty" style={{ padding: '24px 16px' }}>
            <div className="empty-icon">
              <Package size={24} />
            </div>
            <p className="muted">Belum ada APK. Unggah versi pertama di atas.</p>
          </div>
        ) : (
          <div className="list">
            {releases.map((r) => (
              <div key={r.id} className="list-row">
                <div className="avatar" style={{ borderRadius: 10 }}>
                  <Smartphone size={18} />
                </div>
                <div className="grow">
                  <div className="title">
                    Versi {r.version}{' '}
                    {r.id === latestId && (
                      <span className="pill ok" style={{ marginLeft: 6 }}>
                        Terbaru
                      </span>
                    )}
                  </div>
                  <div className="muted small">
                    {formatBytes(r.size)} · diunggah {timeAgo(r.createdAt)} · {r.downloads ?? 0}× diunduh
                  </div>
                  {r.notes && <div className="small" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{r.notes}</div>}
                </div>
                <a className="icon-btn" href={api.releaseDownloadUrl(r.id)} title="Unduh" aria-label={`Unduh versi ${r.version}`}>
                  <Download size={17} />
                </a>
                <button className="icon-btn" onClick={() => setToDelete(r)} title="Hapus" aria-label={`Hapus versi ${r.version}`}>
                  <Trash2 size={17} color="var(--danger)" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Hapus versi ini?"
          message={
            <>
              APK versi <b>{toDelete.version}</b> akan dihapus dari server.
              {toDelete.id === latestId && ' Halaman login akan menawarkan versi sebelumnya (jika ada).'}
            </>
          }
          confirmLabel="Ya, hapus"
          busy={deleting}
          onConfirm={remove}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}

function bumpPatch(version: string) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : '';
}

function UploadCard({ suggestedVersion, onUploaded }: { suggestedVersion: string; onUploaded: (r: AppRelease) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | undefined) {
    setError('');
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.apk')) {
      setError('Pilih berkas berekstensi .apk');
      return;
    }
    setFile(f);
    if (!version) setVersion(suggestedVersion);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError('Pilih berkas APK terlebih dulu');
    setError('');
    setProgress(0);
    try {
      const r = await api.uploadRelease({ file, version: version.trim(), notes: notes.trim() }, setProgress);
      setFile(null);
      setVersion('');
      setNotes('');
      if (inputRef.current) inputRef.current.value = '';
      onUploaded(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
    }
  }

  const uploading = progress !== null;

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head">
        <div>
          <h2>Unggah versi baru</h2>
          <p className="muted small">Berkas .apk, maksimal 100 MB.</p>
        </div>
      </div>

      <label
        className={`dropzone ${dragging ? 'over' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          onChange={(e) => pick(e.target.files?.[0])}
          disabled={uploading}
          hidden
        />
        <Upload size={26} />
        {file ? (
          <>
            <b>{file.name}</b>
            <span className="muted small">{formatBytes(file.size)} · klik untuk mengganti</span>
          </>
        ) : (
          <>
            <b>Klik atau seret berkas APK ke sini</b>
            <span className="muted small">Hasil build: flutter build apk --release</span>
          </>
        )}
      </label>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <label className="field">
          Versi
          <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="mis. 1.0.0" required disabled={uploading} />
        </label>
        <label className="field">
          Catatan rilis <span className="hint">Opsional — apa yang baru?</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="mis. Perbaikan tampilan" maxLength={1000} disabled={uploading} />
        </label>
      </div>

      {uploading && (
        <div className="progress" aria-label={`Mengunggah ${progress}%`}>
          <div style={{ width: `${progress}%` }} />
          <span>{progress < 100 ? `Mengunggah… ${progress}%` : 'Memproses di server…'}</span>
        </div>
      )}
      {error && (
        <div className="alert error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div className="actions-row">
        <button className="btn primary" disabled={uploading || !file}>
          <Upload size={16} />
          {uploading ? 'Mengunggah…' : 'Unggah APK'}
        </button>
      </div>
    </form>
  );
}
