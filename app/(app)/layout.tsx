'use client';

import { LayoutDashboard, LogOut, Menu, Smartphone, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ThemeSwitch from '@/components/ThemeSwitch';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';

/** Kerangka halaman yang butuh login: sidebar (burger di layar kecil) + konten. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Tutup menu setelah pindah halaman (layar kecil)
  useEffect(() => setOpen(false), [pathname]);

  if (loading || !user) return <div className="center muted">Memuat…</div>;

  const links = [
    { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, match: ['/dashboard', '/devices'] },
    ...(user.role === 'admin'
      ? [
          { href: '/users', label: 'Pengguna', Icon: Users, match: ['/users'] },
          { href: '/apps', label: 'Aplikasi', Icon: Smartphone, match: ['/apps'] },
        ]
      : []),
  ];

  const brand = (
    <Link href="/dashboard" className="brand">
      <img className="brand-logo" src="/icon.png" alt="" />
      Smart Farm
    </Link>
  );

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Menu utama">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {brand}
          {open && (
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Tutup menu">
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="nav">
          <div className="nav-label">Menu</div>
          {links.map(({ href, label, Icon, match }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${match.some((m) => pathname.startsWith(m)) ? 'active' : ''}`}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div>
            <div className="nav-label" style={{ paddingTop: 0 }}>
              Tampilan
            </div>
            <ThemeSwitch />
          </div>
          <div className="user-box">
            <div className="avatar">{initials(user.name)}</div>
            <div className="info">
              <div className="name">{user.name}</div>
              <span className={`pill ${user.role}`} style={{ padding: '1px 8px' }}>
                {user.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
            <button className="icon-btn" onClick={logout} title="Keluar" aria-label="Keluar">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className={`backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Menu size={22} />
          </button>
          {brand}
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
