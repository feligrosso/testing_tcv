'use client';

import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function InsightIcon() {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeline = anime.timeline({
      loop: true,
      direction: 'alternate',
      easing: 'easeInOutSine'
    });

    timeline
      .add({
        targets: elementRef.current?.querySelector('.bulb'),
        opacity: [0.4, 1],
        scale: [0.95, 1.05],
        duration: 1000
      })
      .add({
        targets: elementRef.current?.querySelectorAll('.ray'),
        strokeWidth: [0, 2],
        opacity: [0, 1],
        delay: anime.stagger(100),
        duration: 600
      }, '-=800');

    return () => timeline.pause();
  }, []);

  return (
    <div ref={elementRef} className="w-16 h-16">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Light rays */}
        <line className="ray" x1="32" y1="4" x2="32" y2="12" stroke="#0066cc" strokeWidth="2" />
        <line className="ray" x1="32" y1="52" x2="32" y2="60" stroke="#0066cc" strokeWidth="2" />
        <line className="ray" x1="12" y1="32" x2="4" y2="32" stroke="#0066cc" strokeWidth="2" />
        <line className="ray" x1="60" y1="32" x2="52" y2="32" stroke="#0066cc" strokeWidth="2" />
        <line className="ray" x1="16" y1="16" x2="10" y2="10" stroke="#0066cc" strokeWidth="2" />
        <line className="ray" x1="54" y1="54" x2="48" y2="48" stroke="#0066cc" strokeWidth="2" />
        <line className="ray" x1="48" y1="16" x2="54" y2="10" stroke="#0066cc" strokeWidth="2" />
        <line className="ray" x1="10" y1="54" x2="16" y2="48" stroke="#0066cc" strokeWidth="2" />
        
        {/* Lightbulb */}
        <path 
          className="bulb"
          d="M32 20C38.6274 20 44 25.3726 44 32C44 36.0444 41.8885 39.5772 38.6667 41.3333C38.6667 41.3333 38.6667 42.6667 38.6667 44C38.6667 45.3333 37.3333 46.6667 36 46.6667H28C26.6667 46.6667 25.3333 45.3333 25.3333 44C25.3333 42.6667 25.3333 41.3333 25.3333 41.3333C22.1115 39.5772 20 36.0444 20 32C20 25.3726 25.3726 20 32 20Z"
          fill="#003366"
        />
      </svg>
    </div>
  );
} 