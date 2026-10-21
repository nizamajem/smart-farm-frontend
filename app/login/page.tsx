'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await login(email, password);
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
        <h1>Masuk</h1>
        <p className="muted">Pantau dan kendalikan greenhouse Anda.</p>

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
            autoComplete="current-password"
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Memproses…' : 'Masuk'}
        </button>

        <p className="muted small">Belum punya akun? Minta admin untuk membuatkan.</p>
        {isLocal && (
          <p className="muted small">
            Demo admin: admin@smartfarm.local / admin123
            <br />
            Demo user: user@smartfarm.local / user123
          </p>
        )}
      </form>
    </main>
  );
}
