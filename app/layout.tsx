// app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import ClientOnly from '@/components/ClientOnly';
import Providers from '@/context/Providers';
import { GoogleAnalytics } from './GoogleAnalytics';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  themeColor: '#D4AF37',
};

export const metadata: Metadata = {
  // Global defaults; pages can override with their own metadata
  title: 'indcric - The Ultimate Cricket Quiz',
  description: 'Play live cricket quizzes and win ₹100 for every 100 seconds on indcric.',
  metadataBase: new URL('https://indcric.com'),
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/Indcric.png', type: 'image/png' },
    ],
    apple: [{ url: '/Indcric.png', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'indcric',
  },
  openGraph: {
    title: 'indcric - The Ultimate Cricket Quiz',
    description: 'Win rewards every 100 seconds while following live cricket.',
    url: 'https://indcric.com',
    siteName: 'indcric',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'indcric - The Ultimate Cricket Quiz',
    description: 'Win rewards while playing live cricket quizzes on indcric.',
  },
};

// Conditional bottom nav (same as before)
const ConditionalBottomNav = dynamic(
  () => import('@/components/ConditionalBottomNav'),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-background`}>
        {/* Google Analytics - loaded on every page */}
        <GoogleAnalytics />

        <Providers>
          <ClientOnly>
            <main>{children}</main>
            <ConditionalBottomNav />
          </ClientOnly>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
