'use client';

import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function VisualizationIcon() {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animation = anime({
      targets: elementRef.current?.querySelectorAll('.bar'),
      height: (el: Element) => [0, el.getAttribute('data-height')],
      opacity: [0, 1],
      delay: anime.stagger(100),
      duration: 1000,
      easing: 'easeOutCubic',
      loop: true,
      direction: 'alternate',
      autoplay: true
    });

    return () => animation.pause();
  }, []);

  return (
    <div ref={elementRef} className="w-16 h-16">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Bar chart animation */}
        <rect className="bar" x="8" y="44" width="8" height="12" data-height="12" fill="#003366" />
        <rect className="bar" x="20" y="32" width="8" height="24" data-height="24" fill="#0066cc" />
        <rect className="bar" x="32" y="20" width="8" height="36" data-height="36" fill="#003366" />
        <rect className="bar" x="44" y="8" width="8" height="48" data-height="48" fill="#0066cc" />
      </svg>
    </div>
  );
} 