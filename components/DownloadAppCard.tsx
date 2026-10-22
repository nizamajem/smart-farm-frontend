'use client';

import { ChevronDown, Download, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import type { AppRelease } from '@/lib/types';

const ANDROID_PACKAGE = 'com.smartfarm.smart_farm';

/**
 * Tombol unduh APK terbaru (tidak tampil bila admin belum mengunggah).
 * Di Android ada juga "Buka aplikasi": bila sudah terpasang, aplikasi terbuka lalu menawarkan pembaruan sendiri;
 * bila belum, browser jatuh ke unduhan APK.
 */
export default function DownloadAppCard() {
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    setIsAndroid(/android/i.test(navigator.userAgent));
    api
      .latestRelease()
      .then((r) => setRelease(r.release))
      .catch(() => setRelease(null));
  }, []);

  if (!release) return null;

  const downloadUrl = api.releaseDownloadUrl();
  const absoluteDownload = new URL(downloadUrl, window.location.href).href;
  const openAppUrl =
    `intent://open#Intent;scheme=smartfarm;package=${ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(absoluteDownload)};end`;

  return (
    <div className="download-box">
      <a className="download-app" href={downloadUrl} download>
        <img src="/icon.png" alt="" width={40} height={40} style={{ borderRadius: 10 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <b>Unduh aplikasi Android</b>
          <span className="muted small" style={{ display: 'block' }}>
            Versi {release.version} · {formatBytes(release.size)}
          </span>
        </span>
        <Download size={20} />
      </a>

      {isAndroid && (
        <a className="btn ghost sm block" href={openAppUrl}>
          <ExternalLink size={15} />
          Sudah terpasang? Buka aplikasi
        </a>
      )}

      <details className="install-guide">
        <summary>
          Cara memasang <ChevronDown size={15} />
        </summary>
        <ol>
          <li>Tekan <b>Unduh aplikasi Android</b>, lalu buka berkas <code>SmartFarm-{release.version}.apk</code> dari notifikasi atau folder Unduhan.</li>
          <li>
            Bila diminta, izinkan browser untuk <b>menginstal aplikasi tidak dikenal</b>, lalu tekan <b>Instal</b>.
          </li>
          <li>
            Muncul peringatan Play Protect? Pilih <b>Detail lainnya → Tetap instal</b>.
          </li>
          <li>
            Muncul <b>&quot;Aplikasi tidak diinstal&quot;</b>? Biasanya karena di HP sudah ada Smart Farm versi lama dari sumber
            lain. Hapus dulu lewat <b>Pengaturan → Aplikasi → Smart Farm → Uninstal</b>, lalu instal lagi.
          </li>
          <li>Sudah terpasang? Cukup buka aplikasinya — pembaruan akan ditawarkan otomatis.</li>
        </ol>
      </details>
    </div>
  );
}
