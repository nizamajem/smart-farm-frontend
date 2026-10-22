'use client';

import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DownloadAppCard from '@/components/DownloadAppCard';
import ThemeSwitch from '@/components/ThemeSwitch';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Akun demo hanya ada di lingkungan development (SEED_DEMO), jangan tampilkan di server produksi
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    setIsLocal(['localhost', '127.0.0.1'].includes(window.location.hostname));
  }, []);

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-theme">
        <ThemeSwitch />
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand">
          <img className="brand-logo" src="/icon.png" alt="" />
          Smart Farm
        </div>
        <div>
          <h1>Selamat datang</h1>
          <p className="muted">Masuk untuk memantau dan mengendalikan greenhouse Anda.</p>
        </div>

        <label className="field">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@contoh.com"
            required
            autoComplete="email"
            autoFocus
          />
        </label>
        <label className="field">
          Password
          <div className="input-wrap">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && (
          <div className="alert error">
            <CircleAlert size={16} />
            {error}
          </div>
        )}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Memproses…' : 'Masuk'}
        </button>

        <p className="muted small" style={{ textAlign: 'center' }}>
          Belum punya akun? Hubungi admin untuk dibuatkan.
        </p>
        <DownloadAppCard />
        {isLocal && (
          <div className="alert info small">
            <span>
              Akun demo — admin: <b>admin@smartfarm.local</b> / admin123 · user: <b>user@smartfarm.local</b> / user123
            </span>
          </div>
        )}
      </form>
    </main>
  );
}
