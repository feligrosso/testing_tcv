'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface V2ALogoProps {
  className?: string;
  isWhite?: boolean;
}

export default function V2ALogo({ className = "", isWhite = false }: V2ALogoProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} />;
  }

  return (
    <div className={className}>
      <Image
        src="/images/v2a-logo-full.png"
        alt="V2A Consulting Logo"
        width={300}
        height={75}
        className={`w-full h-full object-contain ${isWhite ? 'brightness-0 invert' : ''}`}
        priority
      />
    </div>
  );
} 