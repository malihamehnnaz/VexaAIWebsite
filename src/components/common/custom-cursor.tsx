
'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const colorIndex = useRef(0);

  const colors = [
    '#ff0000', '#ff7f00', '#ffff00', '#00ff00', 
    '#0000ff', '#4b0082', '#9400d3'
  ];

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      if (cursorRef.current) {
        cursorRef.current.style.left = `${clientX}px`;
        cursorRef.current.style.top = `${clientY}px`;
      }

      const trail = document.createElement('span');
      trail.className = 'cursor-trail';
      document.body.appendChild(trail);

      trail.style.left = `${clientX}px`;
      trail.style.top = `${clientY}px`;
      
      trail.style.background = colors[colorIndex.current];
      colorIndex.current = (colorIndex.current + 1) % colors.length;

      setTimeout(() => {
        trail.remove();
      }, 1000);
    };

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [colors]);

  return <div ref={cursorRef} className="cursor" />;
}
