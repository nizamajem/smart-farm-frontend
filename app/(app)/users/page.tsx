'use client';

import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Modal, { ConfirmDialog } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { initials, timeAgo } from '@/lib/format';
import type { Role, User } from '@/lib/types';

/** Kelola akun — hanya admin. */
export default function UsersPage() {
  const { user: me } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<User[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = me?.role === 'admin';

  const load = useCallback(() => {
    api
      .users()
      .then(setUsers)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) router.replace('/dashboard');
    else load();
  }, [isAdmin, router, load]);

  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api.deleteUser(toDelete.id);
      toast(`Akun ${toDelete.email} dihapus`);
      setToDelete(null);
      load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pengguna</h1>
          <p className="muted">Kelola siapa saja yang bisa masuk ke Smart Farm.</p>
        </div>
        <button className="btn primary" onClick={() => setAdding(true)}>
          <Plus size={18} />
          Tambah pengguna
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Daftar akun</h2>
            <p className="muted small">
              <b>Admin</b> melihat semua perangkat dan mengelola akun. <b>User</b> hanya melihat perangkat miliknya.
            </p>
          </div>
        </div>
        {!users ? (
          <p className="muted">Memuat…</p>
        ) : (
          <div className="list">
            {users.map((u) => (
              <div key={u.id} className="list-row">
                <div className="avatar">{initials(u.name)}</div>
                <div className="grow">
                  <div className="title">
                    {u.name} {u.id === me?.id && <span className="muted small">(Anda)</span>}
                  </div>
                  <div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.email} · dibuat {timeAgo(u.createdAt)}
                  </div>
                </div>
                <span className={`pill ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'User'}</span>
                {u.id !== me?.id && (
                  <button className="icon-btn" onClick={() => setToDelete(u)} aria-label={`Hapus ${u.email}`} title="Hapus akun">
                    <Trash2 size={17} color="var(--danger)" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {adding && (
        <AddUserModal
          onClose={() => setAdding(false)}
          onCreated={(u) => {
            setAdding(false);
            toast(`Akun ${u.role} ${u.email} berhasil dibuat`);
            load();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Hapus akun?"
          message={
            <>
              Akun <b>{toDelete.email}</b> akan dihapus, termasuk semua perangkat miliknya.
            </>
          }
          confirmLabel="Ya, hapus"
          busy={busy}
          onConfirm={remove}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: User) => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' as Role });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onCreated(await api.createUser({ ...form, name: form.name.trim(), email: form.email.trim() }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Tambah pengguna" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label className="field">
          Nama lengkap
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} autoFocus />
        </label>
        <label className="field">
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label className="field">
          Password <span className="hint">Minimal 6 karakter</span>
          <div className="input-wrap">
            <input
              type={show ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ paddingRight: 44 }}
            />
            <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label="Tampilkan password">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <div className="field">
          Peran
          <div className="theme-switch" style={{ gridTemplateColumns: '1fr 1fr' }} role="radiogroup">
            {(['user', 'admin'] as Role[]).map((r) => (
              <button
                type="button"
                key={r}
                role="radio"
                aria-checked={form.role === r}
                className={form.role === r ? 'active' : ''}
                onClick={() => setForm({ ...form, role: r })}
              >
                {r === 'admin' ? 'Admin' : 'User'}
              </button>
            ))}
          </div>
          <span className="hint">
            {form.role === 'admin' ? 'Bisa melihat semua perangkat & mengelola akun.' : 'Hanya melihat perangkat miliknya.'}
          </span>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Buat akun'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
