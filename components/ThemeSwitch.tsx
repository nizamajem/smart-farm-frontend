'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { ThemePref, useTheme } from '@/lib/theme';

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Terang', Icon: Sun },
  { value: 'dark', label: 'Gelap', Icon: Moon },
  { value: 'system', label: 'Sistem', Icon: Monitor },
];

export default function ThemeSwitch() {
  const { pref, setPref } = useTheme();
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Tema tampilan">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={pref === value}
          className={pref === value ? 'active' : ''}
          onClick={() => setPref(value)}
          title={`Mode ${label.toLowerCase()}`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
