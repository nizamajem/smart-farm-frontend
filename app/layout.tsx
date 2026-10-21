import type { Metadata } from 'next';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Farm',
  description: 'Monitoring & kontrol greenhouse',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
