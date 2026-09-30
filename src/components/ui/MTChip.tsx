'use client';

import React from 'react';

interface MTChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const MTChip: React.FC<MTChipProps> = ({
  children,
  active = false,
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const sizeStyles = size === 'sm' ? 'px-2.5 py-1 text-xs gap-1 h-7' : 'px-3.5 py-1.5 text-sm gap-1.5 h-9';
  const stateStyles = active
    ? 'bg-[#ea580c] text-white border-[#ea580c] font-medium shadow-sm'
    : 'bg-[#111827] text-slate-300 border-[#243044] hover:bg-[#1a2333] hover:text-white';

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-full border whitespace-nowrap transition-all focus:outline-none shrink-0 ${sizeStyles} ${stateStyles} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};
