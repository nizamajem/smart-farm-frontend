'use client';
import { History, LayoutDashboard, LogOut, PlusCircle, Radio, Smartphone, SquareTerminal, Users, ChevronDown, Menu, X } from 'lucide-react';
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
  const menuDialog = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { const dialog = menuDialog.current; if (menuOpen) dialog?.showModal(); else dialog?.close(); }, [menuOpen]);
  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [user, loading, router]);
  useEffect(() => { setProfileOpen(false); setMenuOpen(false); }, [pathname]);
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
  const navigation = (mobile = false) => <>
    <div className="farm-sidebar-brand"><Link href="/dashboard" className="farm-brand" onClick={() => setMenuOpen(false)}><img src="/mascot/owl-icon.png" alt="" width={46} height={46} /><span>Smart Farm</span></Link>{mobile && <button className="icon-btn" aria-label="Tutup menu" onClick={() => setMenuOpen(false)}><X size={20} /></button>}</div>
    <nav className="farm-sidebar-nav" aria-label={mobile ? 'Menu website' : 'Sidebar utama'}>
      <span className="farm-menu-label">Kebun</span>
      {links.map(({href,label,Icon,active}) => <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''} onClick={() => setMenuOpen(false)}><Icon size={19} />{label}</Link>)}
      {user.role === 'admin' && <><span className="farm-menu-label">Pengelolaan</span>{adminLinks.map(({href,label,Icon}) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? 'page' : undefined} className={pathname.startsWith(href) ? 'active' : ''} onClick={() => setMenuOpen(false)}><Icon size={19} />{label}</Link>)}</>}
    </nav>
    <div className="farm-sidebar-footer"><img src="/mascot/welcome.png" alt="" width={170} height={125} /><span>Kebun terawat, setiap hari.</span></div>
  </>;
  return <div className="farm-shell farm-with-sidebar">
    <aside className="farm-sidebar">{navigation()}</aside>
    <dialog className="farm-mobile-drawer" ref={menuDialog} aria-label="Menu navigasi" onCancel={() => setMenuOpen(false)} onClick={e => {if(e.target === e.currentTarget) setMenuOpen(false);}}><div className="farm-drawer-inner">{navigation(true)}</div></dialog>
    <div className="farm-workspace">
    <header className="farm-header"><div className="farm-header-inner">
      <button className="icon-btn farm-menu-toggle" aria-label="Buka menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
      <span className="farm-header-title">{pathname.startsWith('/history') ? 'Riwayat' : pathname.startsWith('/devices') ? 'Panel kebun' : links.find(link => link.active)?.label ?? adminLinks.find(link => pathname.startsWith(link.href))?.label ?? 'Smart Farm'}</span>
      <div className="farm-profile" ref={profile}>
        <button className="farm-profile-button" aria-label="Profil" aria-expanded={profileOpen} aria-controls="profile-menu" onClick={() => setProfileOpen(!profileOpen)}><span className="avatar">{initials(user.name)}</span><ChevronDown size={16} /></button>
        {profileOpen && <div className="farm-profile-menu" id="profile-menu"><div className="farm-profile-name"><strong>{user.name}</strong><span>{user.email}</span></div><button onClick={logout}><LogOut size={18} />Keluar</button></div>}
      </div>
    </div></header>
    <main className="farm-content">{children}</main>
    </div>
  </div>;
}
