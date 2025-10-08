import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { PageTransition } from '@/components/common/page-transition';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'Vexa AI | AI, Software, and Cloud Solutions',
  description: 'Vexa AI offers cutting-edge services in Generative AI, custom software development, and cloud infrastructure.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
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
          </FirebaseClientProvider>
      </body>
    </html>
  );
}
