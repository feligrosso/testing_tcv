'use client';

import React from 'react';

interface V2ALogoProps {
  className?: string;
  isWhite?: boolean;
}

export default function V2ALogo({ className = "", isWhite = false }: V2ALogoProps) {
  const baseColor = isWhite ? "#FFFFFF" : "#003366";
  
  return (
    <div className={className}>
      <svg viewBox="0 0 300 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g>
          {/* Hexagon Logo */}
          <path d="M40 10 L70 25 L70 55 L40 70 L10 55 L10 25 Z" fill={baseColor} />
          <path d="M30 17.5 L60 32.5 L60 62.5 L30 77.5 L0 62.5 L0 32.5 Z" fill={isWhite ? "#FFFFFF" : "#0099ff"} opacity="0.8" />
          <path d="M20 25 L50 40 L50 70 L20 85 L-10 70 L-10 40 Z" fill={isWhite ? "#FFFFFF" : "#ff6b4a"} opacity="0.6" />
        </g>
        
        {/* V2A Text */}
        <text x="90" y="45" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="40" fill={baseColor}>
          V2A
        </text>
        
        {/* CONSULTING Text */}
        <text x="90" y="65" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="16" fill={baseColor}>
          CONSULTING
        </text>
      </svg>
    </div>
  );
} 