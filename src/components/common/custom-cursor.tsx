
'use client';

import { useEffect } from 'react';

export default function CustomCursor() {
  useEffect(() => {
    const cursor = document.querySelector('.cursor');
    if (!cursor) return;

    const onMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      if (cursor) {
        cursor.setAttribute('style', `top: ${clientY}px; left: ${clientX}px;`);
      }

      const smoke = document.createElement('span');
      smoke.setAttribute('style', `top: ${clientY - 15}px; left: ${clientX - 15}px;`);
      document.body.appendChild(smoke);

      setTimeout(() => {
        smoke.remove();
      }, 1000);
    };

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return <div className="cursor" />;
}
