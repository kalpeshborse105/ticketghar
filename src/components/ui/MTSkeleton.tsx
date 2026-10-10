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
  <div className={`flex flex-col items-center justify-center py-6 px-4 text-center space-y-2.5 ${className}`}>
    <div className="relative flex items-center justify-center">
      <img
        src="/logo.png"
        alt="MahaTicket"
        className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-md animate-pulse"
      />
    </div>
    <div className="space-y-0.5">
      <p className="text-xs sm:text-sm font-black text-slate-800">{message}</p>
      {submessage && (
        <p className="text-[10px] font-bold text-slate-500">
          <span className="text-[#EA580C]">महा</span>
          <span className="text-slate-800">टिकिट</span> महाराष्ट्र
        </p>
      )}
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
        className={`bg-slate-50/90 rounded-2xl flex items-center justify-center relative overflow-hidden ${className}`}
        style={{
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          height: height ? (typeof height === 'number' ? `${height}px` : height) : '240px',
        }}
      >
        <img src="/logo.png" alt="" className="w-10 h-10 object-contain opacity-40 animate-pulse" />
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

// Compact Ticketalay/BookMyShow Event Card Skeleton (Portrait 2:3 aspect)
export const MTEventCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
    {/* Poster area matching portrait aspect ratio */}
    <MTSkeleton variant="ticket" className="w-full aspect-[2/3]" height="auto" />
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
