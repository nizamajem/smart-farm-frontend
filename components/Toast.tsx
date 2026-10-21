'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState } from 'react';

type Kind = 'success' | 'error';
interface Toast {
  id: number;
  kind: Kind;
  message: string;
}

const ToastContext = createContext<((message: string, kind?: Kind) => void) | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (message: string, kind: Kind = 'success') => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === 'success' ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => dismiss(t.id)} aria-label="Tutup">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx;
}
