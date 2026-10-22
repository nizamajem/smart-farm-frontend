'use client';

import { ArrowDownToLine, Download, Pause, Play, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { LogChannel, LogEntry, LogLevel, LogStats } from '@/lib/types';

const CHANNELS: { id: LogChannel; label: string; hint: string }[] = [
  { id: 'system', label: 'Umum', hint: 'Log server: start, peringatan, error & request yang gagal.' },
  { id: 'mqtt', label: 'MQTT', hint: 'Lalu lintas broker mentah: login, connect, payload masuk, perintah keluar.' },
  { id: 'ha', label: 'Home Assistant', hint: 'Request ke Home Assistant, nilai entity mentah & hasil sinkronisasi.' },
];

const LEVELS: { id: LogLevel; label: string }[] = [
  { id: 'debug', label: 'Semua' },
  { id: 'info', label: 'Info ke atas' },
  { id: 'warn', label: 'Peringatan & error' },
  { id: 'error', label: 'Hanya error' },
];
const RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_LINES = 2000;
const POLL_MS = 2000;

const time = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleTimeString('id-ID', { hour12: false })}.${String(d.getMilliseconds()).padStart(3, '0')}`;
};
const dataText = (data: unknown) => (data == null ? '' : typeof data === 'string' ? data : JSON.stringify(data, null, 2));

/** Admin: log mentah seperti terminal — umum, MQTT, Home Assistant — diperbarui live. */
export default function LogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [channel, setChannel] = useState<LogChannel>('system');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [live, setLive] = useState(true);
  const [follow, setFollow] = useState(true);
  const [minLevel, setMinLevel] = useState<LogLevel>('debug');
  const [query, setQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const lastId = useRef(0);
  const activeChannel = useRef(channel);
  const screen = useRef<HTMLDivElement>(null);

  /** Tambahkan baris baru tanpa duplikat (polling & muat ulang bisa tumpang-tindih). */
  const append = useCallback((forChannel: LogChannel, items: LogEntry[]) => {
    if (forChannel !== activeChannel.current || !items.length) return; // respons kanal lama
    setEntries((prev) => {
      const maxPrev = prev.at(-1)?.id ?? 0;
      const fresh = items.filter((e) => e.id > maxPrev);
      return fresh.length ? [...prev, ...fresh].slice(-MAX_LINES) : prev;
    });
    lastId.current = Math.max(lastId.current, items.at(-1)!.id);
  }, []);

  // Ganti kanal: muat ulang dari awal
  const reload = useCallback(async () => {
    activeChannel.current = channel;
    lastId.current = 0;
    setEntries([]);
    append(channel, await api.logs(channel));
  }, [channel, append]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/dashboard');
      return;
    }
    reload().catch((e) => toast(e.message, 'error'));
  }, [isAdmin, router, reload, toast]);

  // Ambil baris baru secara berkala (tail -f)
  useEffect(() => {
    if (!isAdmin || !live) return;
    const tick = async () => {
      try {
        const [items, s] = await Promise.all([api.logs(channel, lastId.current), api.logStats()]);
        setStats(s);
        append(channel, items);
      } catch {
        /* sementara gagal (mis. server restart) — coba lagi di tick berikutnya */
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, [isAdmin, live, channel, append]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        RANK[e.level] >= RANK[minLevel] &&
        (!q || `${e.context} ${e.message} ${dataText(e.data)}`.toLowerCase().includes(q)),
    );
  }, [entries, minLevel, query]);

  // Ikuti baris terbaru
  useEffect(() => {
    if (follow && screen.current) screen.current.scrollTop = screen.current.scrollHeight;
  }, [visible, follow]);

  function onScroll() {
    const el = screen.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom !== follow) setFollow(atBottom);
  }

  function download() {
    const text = visible
      .map((e) => `${e.ts} ${e.level.toUpperCase().padEnd(5)} [${e.context}] ${e.message}${e.data != null ? `\n    ${dataText(e.data).replace(/\n/g, '\n    ')}` : ''}`)
      .join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartfarm-${channel}-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function clear() {
    try {
      await api.clearLogs(channel);
      lastId.current = 0;
      setEntries([]);
      toast('Log dibersihkan');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setConfirmClear(false);
    }
  }

  if (!isAdmin) return null;
  const current = CHANNELS.find((c) => c.id === channel)!;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Logs</h1>
          <p className="muted">{current.hint}</p>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {CHANNELS.map((c) => {
          const errors = stats?.[c.id]?.errors ?? 0;
          return (
            <button key={c.id} role="tab" aria-selected={channel === c.id} className={channel === c.id ? 'active' : ''} onClick={() => setChannel(c.id)}>
              {c.label}
              {errors > 0 && <span className="tab-badge">{errors}</span>}
            </button>
          );
        })}
      </div>

      <div className="log-toolbar">
        <button className={`btn sm ${live ? 'primary' : ''}`} onClick={() => setLive((l) => !l)} title={live ? 'Jeda pembaruan' : 'Lanjutkan live'}>
          {live ? <Pause size={15} /> : <Play size={15} />}
          {live ? 'Live' : 'Dijeda'}
        </button>
        <select value={minLevel} onChange={(e) => setMinLevel(e.target.value as LogLevel)} aria-label="Filter level" className="sm-select">
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <div className="log-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari (topik, device, error…)" />
        </div>
        <span className="muted small" style={{ marginLeft: 'auto' }}>
          {visible.length.toLocaleString('id-ID')} baris
        </span>
        <button className="icon-btn" onClick={download} title="Unduh .log" aria-label="Unduh log">
          <Download size={17} />
        </button>
        <button className="icon-btn" onClick={() => setConfirmClear(true)} title="Bersihkan" aria-label="Bersihkan log">
          <Trash2 size={17} />
        </button>
      </div>

      <div className="terminal-wrap">
        <div className="terminal" ref={screen} onScroll={onScroll} role="log" aria-live="off">
          {visible.length === 0 ? (
            <div className="term-empty">
              {entries.length ? 'Tidak ada baris yang cocok dengan filter.' : '$ menunggu log…'}
            </div>
          ) : (
            visible.map((e) => (
              <div key={e.id} className={`term-line lv-${e.level}`}>
                <span className="t-time">{time(e.ts)}</span>
                <span className="t-level">{e.level.toUpperCase()}</span>
                <span className="t-ctx">[{e.context}]</span>
                <span className="t-msg">{e.message}</span>
                {e.data != null && <pre className="t-data">{dataText(e.data)}</pre>}
              </div>
            ))
          )}
        </div>
        {!follow && (
          <button className="btn sm term-follow" onClick={() => setFollow(true)}>
            <ArrowDownToLine size={15} />
            Ke baris terbaru
          </button>
        )}
      </div>
      <p className="muted small">
        Log disimpan di memori server (2.000 baris terakhir per tab) dan kosong lagi setelah server restart.
      </p>

      {confirmClear && (
        <ConfirmDialog
          title={`Bersihkan log ${current.label}?`}
          message="Baris log di tab ini dihapus dari server. Log yang baru tetap tercatat."
          confirmLabel="Bersihkan"
          onConfirm={clear}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </>
  );
}
