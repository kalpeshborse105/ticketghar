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
        elevated ? 'bg-white shadow-md' : 'bg-white'
      } ${bordered ? 'border border-[#e5e7eb]' : ''} ${
        interactive ? 'hover:border-[#6366f1] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
