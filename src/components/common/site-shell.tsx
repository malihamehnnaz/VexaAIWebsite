import { ReactNode } from 'react';

import Footer from '@/components/common/footer';
import Header from '@/components/common/header';
import { PageTransition } from '@/components/common/page-transition';

type SiteShellProps = {
  children: ReactNode;
};

export default function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(102,126,234,0.18),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(56,189,248,0.14),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.16),_transparent_28%)]" />
      <Header />
      <main>
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </div>
  );
}