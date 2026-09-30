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
    ? 'bg-[#6366f1] text-white border-[#6366f1] font-medium shadow-sm'
    : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f5f5f5] hover:text-[#111827] hover:border-[#6366f1]';

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-full border whitespace-nowrap transition-all focus:outline-none shrink-0 active:scale-95 ${sizeStyles} ${stateStyles} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};
