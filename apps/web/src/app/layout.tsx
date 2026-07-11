import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/features/auth/auth-context';

import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MixoraOne',
    template: '%s | MixoraOne',
  },
  description:
    'MixoraOne is an AI-powered software commerce platform for discovering, evaluating, purchasing, and managing software.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-slate-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
