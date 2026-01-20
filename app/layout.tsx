import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { OfflineSync } from '@/components/OfflineSync';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Sistema JC',
  description: 'Sistema de gestión de ventas para Sistema JC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans font-light text-slate-950 antialiased`}>
        <ThemeProvider>
          {children}
          <OfflineSync />
        </ThemeProvider>
      </body>
    </html>
  );
}
