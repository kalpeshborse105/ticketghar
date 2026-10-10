'use client';

import React from 'react';

interface TheatreMaskLogoProps {
  className?: string;
  size?: number | string;
  animate?: boolean;
}

export const TheatreMaskLogo: React.FC<TheatreMaskLogoProps> = ({
  className = 'w-10 h-10',
  animate = true,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <img
        src="/logo.png"
        alt="MahaTicket Logo"
        className={`w-full h-full object-contain ${animate ? 'hover:scale-105 transition-transform' : ''}`}
      />
    </div>
  );
};
