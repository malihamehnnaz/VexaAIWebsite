import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import ClientOverlays from '@/components/common/client-overlays';
import { patchBrokenServerStorage } from '@/lib/storage-polyfill';
import { cn } from '@/lib/utils';
import SiteShell from '@/components/common/site-shell';
import { ThemeProvider } from '@/components/common/theme-provider';

patchBrokenServerStorage();

const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fontPoppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins',
});

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
          <stop offset="0%" style="stop-color:hsl(262.1, 83.3%, 57.8%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(222.1, 83.3%, 57.8%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="20" fill="url(#grad)" />
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dy=".35em">V</text>
    </svg>
  `;
  const faviconDataUrl = `data:image/svg+xml;base64,${btoa(faviconSvg)}`;

  return (
    <html lang="en" className={cn(fontInter.variable, fontPoppins.variable, 'dark')} suppressHydrationWarning>
      <head>
        <link rel="icon" href={faviconDataUrl} type="image/svg+xml" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SiteShell>
            {children}
          </SiteShell>
          <ClientOverlays />
        </ThemeProvider>
      </body>
    </html>
  );
}
