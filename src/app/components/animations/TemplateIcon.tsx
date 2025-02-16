'use client';

import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function TemplateIcon() {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animation = anime({
      targets: elementRef.current?.querySelectorAll('rect'),
      translateY: [10, 0],
      opacity: [0, 1],
      delay: anime.stagger(100),
      duration: 800,
      easing: 'easeOutElastic(1, .5)',
      loop: true,
      direction: 'alternate',
      autoplay: true
    });

    return () => animation.pause();
  }, []);

  return (
    <div ref={elementRef} className="w-16 h-16">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Template layout animation */}
        <rect x="8" y="8" width="48" height="12" rx="2" fill="#003366" />
        <rect x="8" y="24" width="48" height="16" rx="2" fill="#0066cc" opacity="0.8" />
        <rect x="8" y="44" width="48" height="12" rx="2" fill="#003366" opacity="0.6" />
      </svg>
    </div>
  );
} 