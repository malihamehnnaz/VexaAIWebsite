'use client';

import { useEffect, useRef, useState } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  tint: 0 | 1 | 2;
};

const palette: Array<[number, number, number]> = [
  [125, 172, 255],
  [102, 226, 255],
  [189, 204, 255],
];

export default function SmokeyCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, hasValue: false });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer:fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(isFinePointer && !prefersReducedMotion);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (event: MouseEvent) => {
      const prev = mouseRef.current;
      const dx = prev.hasValue ? event.clientX - prev.x : 0;
      const dy = prev.hasValue ? event.clientY - prev.y : 0;
      const speed = Math.hypot(dx, dy);
      const spawnCount = Math.min(11, Math.max(4, Math.floor(speed / 1.6)));

      mouseRef.current = { x: event.clientX, y: event.clientY, hasValue: true };

      for (let i = 0; i < spawnCount; i++) {
        const angle = (Math.random() - 0.5) * Math.PI * 0.55;
        const velocity = Math.random() * 0.55 + 0.2;
        const spread = Math.random() * 10 - 5;

        particlesRef.current.push({
          x: event.clientX + spread,
          y: event.clientY + spread * 0.2,
          vx: Math.sin(angle) * velocity + dx * 0.012,
          vy: -Math.cos(angle) * velocity + dy * 0.01,
          life: 95,
          maxLife: 95,
          size: Math.random() * 11 + 10,
          tint: (Math.floor(Math.random() * palette.length) as 0 | 1 | 2),
        });
      }
    };

    const onLeave = () => {
      mouseRef.current = { x: -1000, y: -1000, hasValue: false };
    };

    const render = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 6, 15, 0.065)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.filter = 'blur(5px)';
      ctx.globalCompositeOperation = 'lighter';

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];

        p.x += p.vx;
        p.y += p.vy;

        p.vx += (Math.random() - 0.5) * 0.06;
        p.vy -= 0.012;
        p.vx *= 0.962;
        p.vy *= 0.968;
        p.size *= 1.011;

        p.life--;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
  const alpha = lifeRatio * 0.33;
  const [r, g, b] = palette[p.tint];

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.55})`);
  gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`);
  gradient.addColorStop(0.58, `rgba(${r}, ${g}, ${b}, ${alpha * 0.42})`);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.filter = 'none';

      if (particlesRef.current.length > 320) {
        particlesRef.current = particlesRef.current.slice(-320);
      }

      frameRef.current = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    document.body.addEventListener('mouseleave', onLeave);
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      document.body.removeEventListener('mouseleave', onLeave);
      window.cancelAnimationFrame(frameRef.current);
      particlesRef.current = [];
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[100]"
      style={{ mixBlendMode: 'screen', opacity: 0.95 }}
    />
  );
}
