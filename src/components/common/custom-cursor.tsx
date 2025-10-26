'use client';

import { motion } from 'framer-motion';
import useMousePosition from '@/hooks/use-mouse-position';

export default function CustomCursor() {
  const { x, y } = useMousePosition();

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[9999] h-8 w-8 rounded-full border-2 border-primary"
      animate={{
        x: x ? x - 16 : -16,
        y: y ? y - 16 : -16,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        restDelta: 0.001,
      }}
    />
  );
}
