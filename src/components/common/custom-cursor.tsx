
'use client';

import { useEffect } from 'react';

export default function CustomCursor() {
  useEffect(() => {
    const cursor = document.querySelector('.cursor') as HTMLElement;
    if (!cursor) return;

    const onMouseMove = (e: MouseEvent) => {
      // Use clientX/Y for viewport-relative coordinates
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';

      const span = document.createElement('span');
      span.classList.add('trail');
      // Position trail relative to the viewport, not the page
      span.style.left = (e.clientX - 10) + 'px'; // Adjust for half of trail width
      span.style.top = (e.clientY - 10) + 'px'; // Adjust for half of trail height

      const size = Math.random() * 10;
      span.style.width = (20 + size) + 'px';
      span.style.height = (20 + size) + 'px';

      document.body.appendChild(span);

      setTimeout(() => {
        document.body.removeChild(span);
      }, 500); // Corresponds to animation duration
    };

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return <div className="cursor" />;
}
