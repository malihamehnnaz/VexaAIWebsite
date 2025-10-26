
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
    trailRefs.current = trailRefs.current.slice(0, colors.length);

    const animateTrail = () => {
      const p1 = trailRefs.current[0];
      
      if(p1) {
        p1.style.left = coords.current.x + 'px';
        p1.style.top = coords.current.y + 'px';
      }

      trailRefs.current.forEach((dot, index, arr) => {
        const nextDot = arr[index + 1] || arr[0];

        if(dot && nextDot && nextDot.style.left && nextDot.style.top) {
            // Check to avoid setting position from an un-initialized element
            if(index !== 0) { 
                dot.style.left = nextDot.style.left;
                dot.style.top = nextDot.style.top;
            }
        }
      });

      animationFrameId.current = requestAnimationFrame(animateTrail);
    };
    
    // Start animation only when refs are populated
    if (trailRefs.current.length > 0) {
        animationFrameId.current = requestAnimationFrame(animateTrail);
    }
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [colors.length]);


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
