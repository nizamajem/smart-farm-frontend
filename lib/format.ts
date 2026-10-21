/** "baru saja", "5 menit lalu", "2 jam lalu", lalu tanggal. */
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return 'baru saja';
  if (diff < 3600) return `${Math.round(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.round(diff / 3600)} jam lalu`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatValue(v: number | null | undefined, unit: string) {
  if (v == null) return null;
  return unit === 'lx' ? Math.round(v).toLocaleString('id-ID') : v.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
