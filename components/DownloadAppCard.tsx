'use client';

import { Download, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import type { AppRelease } from '@/lib/types';

/** Tombol unduh APK terbaru. Tidak tampil apa pun bila admin belum mengunggah. */
export default function DownloadAppCard() {
  const [release, setRelease] = useState<AppRelease | null>(null);

  useEffect(() => {
    api
      .latestRelease()
      .then((r) => setRelease(r.release))
      .catch(() => setRelease(null));
  }, []);

  if (!release) return null;

  return (
    <a className="download-app" href={api.releaseDownloadUrl()} download>
      <span className="brand-logo">
        <Smartphone size={20} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b>Unduh aplikasi Android</b>
        <span className="muted small" style={{ display: 'block' }}>
          Versi {release.version} · {formatBytes(release.size)}
        </span>
      </span>
      <Download size={20} />
    </a>
  );
}
