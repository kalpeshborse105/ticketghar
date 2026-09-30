'use client';

import React from 'react';

interface MTButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const MTButton: React.FC<MTButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: 'bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-sm focus:ring-[#6366f1]/50',
    accent: 'bg-[#f59e0b] hover:bg-[#d97706] text-white shadow-sm focus:ring-[#f59e0b]/50',
    secondary: 'bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#111827] border border-[#e5e7eb] focus:ring-[#6366f1]/30',
    outline: 'bg-transparent hover:bg-[#f5f5f5] text-[#111827] border border-[#e5e7eb] hover:border-[#6366f1] focus:ring-[#6366f1]/30',
    ghost: 'bg-transparent hover:bg-[#f5f5f5] text-[#6b7280] hover:text-[#111827]',
    danger: 'bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-sm focus:ring-[#ef4444]/50',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2 gap-2 h-10',
    lg: 'text-base px-5 py-2.5 gap-2.5 h-12 font-semibold',
  }[size];

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
