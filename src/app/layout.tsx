import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { PageTransition } from '@/components/common/page-transition';
import { FirebaseClientProvider } from '@/firebase';
import FluidCursor from '@/components/common/fluid-cursor';

export const metadata: Metadata = {
  title: 'Vexa AI | AI, Software, and Cloud Solutions',
  description: 'Vexa AI offers cutting-edge services in Generative AI, custom software development, and cloud infrastructure.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const faviconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff5722;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff8a65;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#grad)" />
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dy=".35em">V</text>
    </svg>
  `;
  const faviconDataUrl = `data:image/svg+xml;base64,${btoa(faviconSvg)}`;

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href={faviconDataUrl} type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
          <FirebaseClientProvider>
            <PageTransition>
              {children}
            </PageTransition>
            <Toaster />
            <FluidCursor />
          </FirebaseClientProvider>
      </body>
    </html>
  );
}
