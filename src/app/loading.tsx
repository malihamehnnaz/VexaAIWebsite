'use client';

import { motion } from 'framer-motion';
import Logo from '@/components/common/logo';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-background/90 backdrop-blur-xl">
      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          className="absolute h-44 w-44 rounded-full bg-primary/20 blur-3xl"
          animate={{ scale: [0.92, 1.12, 0.92], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
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
          Preparing Vexa AI
        </p>
      </div>
    </div>
  );
}