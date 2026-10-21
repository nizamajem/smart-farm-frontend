'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Role, User } from '@/lib/types';

const EMPTY = { name: '', email: '', password: '', role: 'user' as Role };

/** Kelola akun — hanya admin. */
export default function UsersPage() {
  const { user: me } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdmin = me?.role === 'admin';

  const load = useCallback(() => {
    api
      .users()
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!isAdmin) router.replace('/dashboard');
    else load();
  }, [isAdmin, router, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const u = await api.createUser(form);
      setNotice(`Akun ${u.role} "${u.email}" berhasil dibuat.`);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(u: User) {
    if (!confirm(`Hapus akun ${u.email}? Semua perangkat miliknya ikut terhapus.`)) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!isAdmin) return null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pengguna</h1>
          <p className="muted">{users ? `${users.length} akun` : 'Memuat…'}</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <section className="card">
        <h2>Buat akun baru</h2>
        <form className="user-form" onSubmit={create}>
          <label>
            Nama
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Menyimpan…' : 'Buat akun'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Daftar akun</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Dibuat</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`role ${u.role}`}>{u.role}</span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                <td className="right">
                  {u.id === me?.id ? (
                    <span className="muted small">Anda</span>
                  ) : (
                    <button className="btn ghost small danger-text" onClick={() => remove(u)}>
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
