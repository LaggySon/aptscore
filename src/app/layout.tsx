import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'aptscore — location scoring',
  description: 'Score a location by how close it is to the things that matter to you.',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
  </html>
);

export default RootLayout;
