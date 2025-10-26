
'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const mousePosition = useRef({ x: 0, y: 0 });
  const trailPosition = useRef({ x: 0, y: 0 });
  const speed = 0.15; // Animation speed, adjust as needed

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      const { x: mouseX, y: mouseY } = mousePosition.current;
      const { x: trailX, y: trailY } = trailPosition.current;

      const dx = mouseX - trailX;
      const dy = mouseY - trailY;

      trailPosition.current = {
        x: trailX + dx * speed,
        y: trailY + dy * speed,
      };

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${trailPosition.current.x}px, ${trailPosition.current.y}px, 0)`;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="cursor" />
      <div ref={trailRef} className="trail" />
    </>
  );
}
