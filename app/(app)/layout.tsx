'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

/** Layout untuk halaman yang butuh login. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return <div className="center muted">Memuat…</div>;

  return (
    <>
      <header className="topbar">
        <Link href="/dashboard" className="brand">
          🌱 Smart Farm
        </Link>
        <div className="topbar-right">
          <span className="muted small">
            {user.name} · {user.role}
          </span>
          <button className="btn ghost" onClick={logout}>
            Keluar
          </button>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
