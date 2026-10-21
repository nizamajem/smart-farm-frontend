'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ title, onClose, children, footer }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Dialog konfirmasi untuk aksi berisiko (hapus, dll.). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Batal
          </button>
          <button className="btn danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Memproses…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted" style={{ margin: 0 }}>
        {message}
      </p>
    </Modal>
  );
}
