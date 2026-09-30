'use client';

import React from 'react';

interface MTSkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text' | 'theater';
  width?: string | number;
  height?: string | number;
}

// Theater mask SVG shapes for cultural/theater app loading
const TheaterMaskShimmer = () => (
  <div className="relative flex items-center justify-center w-full h-full">
    <div className="flex items-end gap-1">
      {/* Happy Mask */}
      <div className="animate-pulse">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill="#f97316" opacity="0.15"/>
          <circle cx="24" cy="24" r="22" stroke="#ea580c" strokeWidth="2" opacity="0.3"/>
          <circle cx="17" cy="20" r="3" fill="#ea580c" opacity="0.3"/>
          <circle cx="31" cy="20" r="3" fill="#ea580c" opacity="0.3"/>
          <path d="M15 30 Q24 38 33 30" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.3"/>
        </svg>
      </div>
      {/* Sad Mask */}
      <div className="animate-pulse" style={{ animationDelay: '200ms' }}>
        <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="22" fill="#1e293b" opacity="0.08"/>
          <circle cx="24" cy="24" r="22" stroke="#475569" strokeWidth="2" opacity="0.2"/>
          <circle cx="17" cy="20" r="3" fill="#475569" opacity="0.2"/>
          <circle cx="31" cy="20" r="3" fill="#475569" opacity="0.2"/>
          <path d="M15 34 Q24 26 33 34" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.2"/>
        </svg>
      </div>
    </div>
  </div>
);

export const MTSkeleton: React.FC<MTSkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  if (variant === 'theater') {
    return (
      <div
        className={`bg-gradient-to-br from-orange-50 to-slate-50 border border-orange-100 rounded-xl flex items-center justify-center ${className}`}
        style={{
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : '160px',
        }}
      >
        <TheaterMaskShimmer />
      </div>
    );
  }

  const variantStyles = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4 my-1',
    theater: 'rounded-xl',
  }[variant];

  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] ${variantStyles} ${className}`}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        animation: 'pulse 1.5s ease-in-out infinite, shimmer 2s linear infinite',
      }}
    />
  );
};

// Theater Event Card Skeleton — what shows while events are loading
export const MTEventCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
    {/* Poster area with theater mask */}
    <MTSkeleton variant="theater" className="w-full" height="200px" />
    <div className="p-3 space-y-2">
      <MTSkeleton variant="text" width="75%" />
      <MTSkeleton variant="text" width="50%" />
      <div className="flex gap-2 pt-1">
        <MTSkeleton variant="rectangular" width="60px" height="22px" className="rounded-full" />
        <MTSkeleton variant="rectangular" width="80px" height="22px" className="rounded-full" />
      </div>
    </div>
  </div>
);
