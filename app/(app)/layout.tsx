'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

/** Layout untuk halaman yang butuh login. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return <div className="center muted">Memuat…</div>;

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    ...(user.role === 'admin' ? [{ href: '/users', label: 'Pengguna' }] : []),
  ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/dashboard" className="brand">
            🌱 Smart Farm
          </Link>
          <nav className="nav">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={pathname.startsWith(l.href) ? 'active' : ''}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="topbar-right">
          <span className="muted small">{user.name}</span>
          <span className={`role ${user.role}`}>{user.role}</span>
          <button className="btn ghost" onClick={logout}>
            Keluar
          </button>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
