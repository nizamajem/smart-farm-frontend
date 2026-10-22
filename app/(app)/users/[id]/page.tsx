'use client';

import {
  Activity,
  ArrowLeft,
  Cpu,
  House,
  LogIn,
  Monitor,
  MousePointerClick,
  Package,
  Power,
  PowerOff,
  ShieldAlert,
  Smartphone,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { initials, timeAgo } from '@/lib/format';
import type { ActivityLog, ActivitySummary } from '@/lib/types';

const TABS = [
  { id: '', label: 'Semua' },
  { id: 'app_open', label: 'Penggunaan aplikasi' },
  { id: 'login', label: 'Login' },
  { id: 'action', label: 'Aksi' },
] as const;

/** Ikon & warna per jenis log, agar mudah dipindai. */
function logStyle(l: ActivityLog): { Icon: typeof Activity; color: string; bg: string } {
  if (l.type === 'login') return { Icon: LogIn, color: 'var(--primary)', bg: 'var(--primary-soft)' };
  if (l.type === 'login_failed') return { Icon: ShieldAlert, color: 'var(--danger)', bg: 'var(--danger-soft)' };
  if (l.type === 'app_open')
    return l.platform === 'web'
      ? { Icon: Monitor, color: 'var(--info)', bg: 'var(--info-soft)' }
      : { Icon: Smartphone, color: 'var(--info)', bg: 'var(--info-soft)' };
  const warn = { color: 'var(--warning)', bg: 'var(--warning-soft)' };
  const map: Record<string, typeof Activity> = {
    'relay.on': Power,
    'relay.off': PowerOff,
    'device.create': Cpu,
    'device.delete': Cpu,
    'ha.mapping': House,
    'ha.sync': House,
    'user.create': Users,
    'user.delete': Users,
    'release.upload': Package,
    'release.delete': Package,
  };
  return { Icon: map[l.action ?? ''] ?? MousePointerClick, ...warn };
}

const platformLabel = (p: string | null) => (p === 'android' ? 'Android' : p === 'ios' ? 'iOS' : p === 'web' ? 'Web' : null);

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hari ini';
  if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const fullDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function UserActivityPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { user: me } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [tab, setTab] = useState<string>('');
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const isAdmin = me?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard');
      return;
    }
    api
      .activitySummary(id)
      .then(setSummary)
      .catch((e) => toast(e.message, 'error'));
  }, [id, isAdmin, router, toast]);

  const loadLogs = useCallback(
    async (before?: number) => {
      const page = await api.activity(id, tab || undefined, before);
      setLogs((prev) => (before && prev ? [...prev, ...page.items] : page.items));
      setNextBefore(page.nextBefore);
    },
    [id, tab],
  );

  useEffect(() => {
    if (!isAdmin) return;
    setLogs(null);
    loadLogs().catch((e) => toast(e.message, 'error'));
  }, [isAdmin, loadLogs, toast]);

  async function loadMore() {
    if (!nextBefore) return;
    setLoadingMore(true);
    try {
      await loadLogs(nextBefore);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoadingMore(false);
    }
  }

  if (!isAdmin) return null;
  if (!summary) return <div className="muted">Memuat…</div>;

  const u = summary.user;
  const maxDay = Math.max(1, ...summary.daily.map((d) => d.web + d.app));
  const stats = [
    { label: 'Login terakhir', value: timeAgo(u.lastLoginAt) ?? 'Belum pernah', hint: u.lastLoginAt ? fullDate(u.lastLoginAt) : '' },
    { label: 'Terakhir aktif', value: timeAgo(u.lastSeenAt) ?? '—', hint: u.lastSeenAt ? fullDate(u.lastSeenAt) : '' },
    { label: 'Buka aplikasi', value: String(summary.totals.appOpens30d), hint: '30 hari terakhir' },
    { label: 'Aksi', value: String(summary.totals.actions30d), hint: '30 hari terakhir' },
  ];

  // Kelompokkan log per hari
  const groups: { day: string; items: ActivityLog[] }[] = [];
  for (const l of logs ?? []) {
    const day = dayLabel(l.createdAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(l);
    else groups.push({ day, items: [l] });
  }

  return (
    <>
      <Link href="/users" className="back-link">
        <ArrowLeft size={16} />
        Kembali ke Pengguna
      </Link>

      <div className="page-head" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div className="avatar" style={{ width: 52, height: 52, fontSize: '1.05rem' }}>
            {initials(u.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1>{u.name}</h1>
              <span className={`pill ${u.role}`}>{u.role === 'admin' ? 'Admin' : 'User'}</span>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              {u.email} · akun dibuat {timeAgo(u.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {summary.totals.failedLogins30d > 0 && (
        <div className="alert error" style={{ marginBottom: 16 }}>
          <ShieldAlert size={16} />
          <span>
            {summary.totals.failedLogins30d}× percobaan login gagal (password salah) dalam 30 hari terakhir. Lihat tab
            <b> Login</b>.
          </span>
        </div>
      )}

      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="card stat" style={{ display: 'block' }}>
            <div className="muted small">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            {s.hint && <div className="muted small">{s.hint}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Penggunaan 14 hari terakhir</h2>
            <p className="muted small">Berapa kali aplikasi atau website dibuka per hari.</p>
          </div>
        </div>
        <div className="usage-bars" role="img" aria-label="Grafik penggunaan harian">
          {summary.daily.map((d) => {
            const date = new Date(`${d.date}T12:00:00`);
            const total = d.web + d.app;
            return (
              <div key={d.date} className="usage-day" title={`${date.toLocaleDateString('id-ID')}: ${d.app}× aplikasi, ${d.web}× web`}>
                <span className="usage-count">{total || ''}</span>
                <div className="usage-bar">
                  <div style={{ height: `${(d.web / maxDay) * 100}%`, background: 'var(--info)' }} />
                  <div style={{ height: `${(d.app / maxDay) * 100}%`, background: 'var(--primary)' }} />
                </div>
                <span className="usage-label">{date.toLocaleDateString('id-ID', { weekday: 'short' }).slice(0, 3)}</span>
                <span className="usage-label">{date.getDate()}</span>
              </div>
            );
          })}
        </div>
        <div className="legend">
          <span>
            <i style={{ background: 'var(--primary)' }} />
            Aplikasi
          </span>
          <span>
            <i style={{ background: 'var(--info)' }} />
            Website
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Log aktivitas</h2>
        </div>
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {logs === null ? (
          <p className="muted">Memuat…</p>
        ) : logs.length === 0 ? (
          <div className="empty" style={{ padding: '24px 16px' }}>
            <div className="empty-icon">
              <Activity size={24} />
            </div>
            <p className="muted">Belum ada aktivitas tercatat.</p>
          </div>
        ) : (
          <div className="timeline">
            {groups.map((g) => (
              <div key={g.day}>
                <div className="timeline-day">{g.day}</div>
                {g.items.map((l) => {
                  const { Icon, color, bg } = logStyle(l);
                  const meta = [platformLabel(l.platform), l.appVersion && `v${l.appVersion}`, l.ip].filter(Boolean).join(' · ');
                  return (
                    <div key={l.id} className="timeline-row">
                      <span className="timeline-time">{time(l.createdAt)}</span>
                      <span className="timeline-icon" style={{ color, background: bg }}>
                        <Icon size={16} />
                      </span>
                      <div className="grow">
                        <div>{l.description}</div>
                        {meta && <div className="muted small">{meta}</div>}
                      </div>
                      {l.deviceId && (
                        <Link href={`/devices/${l.deviceId}`} className="muted small">
                          Perangkat
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {nextBefore && (
              <button className="btn block" onClick={loadMore} disabled={loadingMore} style={{ marginTop: 12 }}>
                {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
