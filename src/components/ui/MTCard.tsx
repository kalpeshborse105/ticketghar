'use client';

import React from 'react';

interface MTCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  bordered?: boolean;
  interactive?: boolean;
}

export const MTCard: React.FC<MTCardProps> = ({
  children,
  elevated = false,
  bordered = true,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-xl transition-all ${
        elevated ? 'bg-[#1a2333] shadow-md' : 'bg-[#111827]'
      } ${bordered ? 'border border-[#243044]' : ''} ${
        interactive ? 'hover:border-[#ea580c] hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
