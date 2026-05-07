'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '@/components/common/logo';

function Loader() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-background/85 backdrop-blur-xl">
      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          className="absolute h-40 w-40 rounded-full bg-primary/15 blur-3xl"
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative z-10 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Logo />
        </motion.div>
        <div className="relative z-10 flex items-center gap-3">
          <motion.span
            className="h-3 w-3 rounded-full bg-cyan-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="h-3 w-3 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="h-3 w-3 rounded-full bg-rose-400"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: 0.3 }}
          />
        </div>
        <p className="relative z-10 text-sm uppercase tracking-[0.28em] text-muted-foreground">
          Loading experience
        </p>
      </div>
    </div>
  );
}


export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 650);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <AnimatePresence mode="sync">
      {isTransitioning && <Loader />}
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
