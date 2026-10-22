'use client';

import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/Toast';

/** Baris "label: nilai" dengan tombol salin (dan tampilkan/sembunyikan untuk rahasia). */
export default function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const toast = useToast();
  const [show, setShow] = useState(!secret);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('Gagal menyalin, salin manual', 'error');
    }
  }

  return (
    <div className="copy-field">
      <span className="copy-label">{label}</span>
      <div className="key-box" style={{ marginTop: 0 }}>
        <code>{show ? value : '•'.repeat(Math.min(value.length, 24))}</code>
        {secret && (
          <button className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan' : 'Tampilkan'}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        <button className="icon-btn" onClick={copy} aria-label={`Salin ${label}`}>
          {copied ? <Check size={16} color="var(--primary)" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
