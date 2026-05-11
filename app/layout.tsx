import type { Metadata, Viewport } from 'next';
import { AuthGate } from '@/components/AuthGate';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Southstyle Suki Points',
  description: 'RFID and QR loyalty points for Southstyle printing customers',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#078b3e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body>
        <AuthGate>{children}</AuthGate>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2400,
            style: {
              borderRadius: '16px',
              background: '#064e2a',
              color: '#ffffff',
              fontWeight: '700',
            },
          }}
        />
      </body>
    </html>
  );
}


