'use client';

import React from 'react';
import { Ticket } from 'lucide-react';

interface MTSkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text' | 'ticket';
  width?: string | number;
  height?: string | number;
}

// Unified Ticket Loader Animation — used across the entire platform
export const MTTicketLoader: React.FC<{
  message?: string;
  submessage?: string;
  className?: string;
}> = ({
  message = 'लोड होत आहे...',
  submessage = 'महाटिकिट महाराष्ट्र',
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center p-8 text-center space-y-3 ${className}`}>
    <div className="relative">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
        <Ticket className="w-7 h-7 -rotate-12 animate-pulse" />
      </div>
      <div className="absolute -inset-1 rounded-2xl border-2 border-orange-500/30 animate-ping pointer-events-none" />
    </div>
    <div className="space-y-0.5">
      <p className="text-xs font-extrabold text-slate-800">{message}</p>
      {submessage && <p className="text-[10px] text-slate-400 font-medium">{submessage}</p>}
    </div>
  </div>
);

export const MTSkeleton: React.FC<MTSkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  if (variant === 'ticket') {
    return (
      <div
        className={`bg-gradient-to-br from-orange-50 to-slate-50 border border-orange-100 rounded-2xl flex items-center justify-center ${className}`}
        style={{
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : '240px',
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-orange-100/70 text-orange-500 flex items-center justify-center animate-pulse">
          <Ticket className="w-5 h-5 -rotate-12" />
        </div>
      </div>
    );
  }

  const variantStyles = {
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded h-3.5 my-1',
    ticket: 'rounded-2xl',
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

// Compact Ticketalay/BookMyShow Event Card Skeleton (Portrait 3:4 aspect)
export const MTEventCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
    {/* Poster area matching portrait aspect ratio */}
    <MTSkeleton variant="ticket" className="w-full aspect-[3/4]" height="auto" />
    <div className="p-3 space-y-2">
      <MTSkeleton variant="text" width="85%" />
      <MTSkeleton variant="text" width="55%" />
      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
        <MTSkeleton variant="text" width="40px" />
        <MTSkeleton variant="rectangular" width="75px" height="26px" className="rounded-xl" />
      </div>
    </div>
  </div>
);
