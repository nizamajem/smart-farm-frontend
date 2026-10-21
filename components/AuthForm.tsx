'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand">🌱 Smart Farm</div>
        <h1>{isLogin ? 'Masuk' : 'Buat akun'}</h1>
        <p className="muted">{isLogin ? 'Pantau dan kendalikan greenhouse Anda.' : 'Daftar untuk mulai mengelola perangkat.'}</p>

        {!isLogin && (
          <label>
            Nama
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isLogin ? 1 : 6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Memproses…' : isLogin ? 'Masuk' : 'Daftar'}
        </button>

        <p className="muted small">
          {isLogin ? (
            <>
              Belum punya akun? <Link href="/register">Daftar</Link>
            </>
          ) : (
            <>
              Sudah punya akun? <Link href="/login">Masuk</Link>
            </>
          )}
        </p>
        {isLogin && <p className="muted small">Demo: admin@smartfarm.local / admin123</p>}
      </form>
    </main>
  );
}
