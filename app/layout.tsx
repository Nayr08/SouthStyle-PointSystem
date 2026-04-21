import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Poppins } from 'next/font/google';
import { AuthGate } from '@/components/AuthGate';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
    <html lang="en" className={`${poppins.variable} ${geistMono.variable} h-full`}>
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}


