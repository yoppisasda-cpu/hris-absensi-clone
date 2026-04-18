import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

import { LanguageProvider } from '@/lib/LanguageContext';
import { FeatureProvider } from '@/lib/FeatureContext';
import { UpgradeModal } from '@/components/dashboard/UpgradeModal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aivola.id HR Admin Panel - AI Powered HR',
  description: 'Portal Web Admin untuk mengelola Dashboard Multi-Tenant Aivola.id',
  icons: {
    icon: '/favicon.ico?v=2',
    apple: '/favicon.ico?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <LanguageProvider>
          <FeatureProvider>
            <Toaster position="top-right" />
            {children}
            <UpgradeModal />
          </FeatureProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

