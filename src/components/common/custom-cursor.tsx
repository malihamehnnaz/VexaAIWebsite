'use client';

import { useEffect, useRef } from 'react';
import useMousePosition from '@/hooks/use-mouse-position';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const { x, y } = useMousePosition();
  const trailRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    if (cursorRef.current && x !== null && y !== null) {
      cursorRef.current.style.top = y + 'px';
      cursorRef.current.style.left = x + 'px';
    }
  }, [x, y]);
  
  useEffect(() => {
    const createSmokeTrail = (eX: number, eY: number) => {
        if (!cursorRef.current) return;
        const span = document.createElement('span');
        cursorRef.current.appendChild(span);
        trailRef.current.push(span);

        const size = Math.random() * 50;
        span.style.width = 20 + size + 'px';
        span.style.height = 20 + size + 'px';
        span.style.top = eY + 'px';
        span.style.left = eX + 'px';
        
        setTimeout(() => {
            cursorRef.current?.removeChild(span);
            trailRef.current.shift();
        }, 1000);
    }
    
    const handleMouseMove = (e: MouseEvent) => {
        createSmokeTrail(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        trailRef.current.forEach(span => {
            if (cursorRef.current && cursorRef.current.contains(span)) {
                cursorRef.current.removeChild(span);
            }
        });
        trailRef.current = [];
    };
  }, []);

  return <div ref={cursorRef} className="cursor" />;
}