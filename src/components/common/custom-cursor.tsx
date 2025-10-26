'use client';

import { useEffect, useRef } from 'react';
import useMousePosition from '@/hooks/use-mouse-position';

const colors = [
  '#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff',
  '#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff',
  '#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082'
];

export default function CustomCursor() {
  const { x, y } = useMousePosition();
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const coords = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    coords.current = { x: x || 0, y: y || 0 };
  }, [x, y]);

  useEffect(() => {
    const animateTrail = () => {
      const p1 = trailRefs.current[0];
      const p2 = trailRefs.current[1];
      
      if(p1) {
        p1.style.top = coords.current.y + 'px';
        p1.style.left = coords.current.x + 'px';
      }

      trailRefs.current.forEach((dot, index,_arr) => {
        const nextDot = _arr[index + 1] || _arr[0];
        
        dot.style.top = nextDot.style.top;
        dot.style.left = nextDot.style.left;
      });

      animationFrameId.current = requestAnimationFrame(animateTrail);
    };

    if (trailRefs.current.length > 0) {
      animationFrameId.current = requestAnimationFrame(animateTrail);
    }
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [trailRefs.current.length]);


  return (
    <div className="cursor">
      {colors.map((color, index) => (
        <div
          key={index}
          ref={(el) => {
            if (el) trailRefs.current[index] = el;
          }}
          className="trail"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}