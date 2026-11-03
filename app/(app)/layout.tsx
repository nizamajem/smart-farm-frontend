'use client';
import { History, LayoutDashboard, LogOut, PlusCircle, Radio, Smartphone, SquareTerminal, Users, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profile = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [user, loading, router]);
  useEffect(() => setProfileOpen(false), [pathname]);
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!profile.current?.contains(e.target as Node)) setProfileOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOpen(false); };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    if (!user) return;
    const key = `smartfarm_opened_${user.id}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch {}
    api.appOpen().catch(() => undefined);
  }, [user]);
  if (loading || !user) return <div className="center farm-loading"><img src="/mascot/owl-icon.png" alt="" width={76} height={76} /><span>Menyiapkan kebunmu...</span></div>;
  const links = [
    { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, active: pathname === '/dashboard' || pathname.startsWith('/devices') },
    { href: '/history', label: 'Riwayat', Icon: History, active: pathname === '/history' },
    { href: '/dashboard?add=1', label: 'Tambah Perangkat', Icon: PlusCircle, active: false },
  ];
  const adminLinks = [
    { href: '/users', label: 'Pengguna', Icon: Users },
    { href: '/integrations', label: 'Integrasi', Icon: Radio },
    { href: '/logs', label: 'Logs', Icon: SquareTerminal },
    { href: '/apps', label: 'Aplikasi', Icon: Smartphone },
  ];
  return <div className="farm-shell">
    <header className="farm-header"><div className="farm-header-inner">
      <Link href="/dashboard" className="farm-brand"><img src="/mascot/owl-icon.png" alt="" width={48} height={48} /><span>Smart Farm</span></Link>
      <nav className="farm-header-nav" aria-label="Menu utama">{links.map(({ href, label, Icon, active }) => <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''}><Icon size={18} />{label}</Link>)}</nav>
      <div className="farm-profile" ref={profile}>
        <button className="farm-profile-button" aria-label="Profil" aria-expanded={profileOpen} aria-controls="profile-menu" onClick={() => setProfileOpen(!profileOpen)}><span className="avatar">{initials(user.name)}</span><ChevronDown size={16} /></button>
        {profileOpen && <div className="farm-profile-menu" id="profile-menu"><div className="farm-profile-name"><strong>{user.name}</strong><span>{user.email}</span></div>
          {user.role === 'admin' && <><span className="farm-menu-label">Kelola kebun</span>{adminLinks.map(({ href, label, Icon }) => <Link key={href} href={href} onClick={() => setProfileOpen(false)}><Icon size={18} />{label}</Link>)}</>}
          <button onClick={logout}><LogOut size={18} />Keluar</button>
        </div>}
      </div>
    </div></header>
    <main className="farm-content">{children}</main>
    <nav className="farm-bottom-nav" aria-label="Navigasi bawah">{links.map(({ href, label, Icon, active }) => <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''}><span><Icon size={23} /></span>{label}</Link>)}</nav>
  </div>;
}
