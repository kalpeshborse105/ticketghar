'use client';

import React from 'react';

interface MahaTheatreLoaderProps {
  message?: string;
  submessage?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  className?: string;
}

export const MahaTheatreLoader: React.FC<MahaTheatreLoaderProps> = ({
  message = 'लोड होत आहे...',
  submessage = 'महाराष्ट्राचे हक्काचे तिकीट व्यासपीठ',
  size = 'md',
  className = '',
}) => {
  const iconDimensions = {
    sm: { width: 56, height: 44 },
    md: { width: 96, height: 74 },
    lg: { width: 140, height: 108 },
    fullscreen: { width: 160, height: 124 },
  }[size];

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      {/* Theatre Masks Container */}
      <div className="relative mb-3.5 group">
        {/* Soft Ambient Glow */}
        <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 via-amber-500/25 to-orange-600/20 rounded-full blur-xl animate-pulse pointer-events-none" />

        <svg
          width={iconDimensions.width}
          height={iconDimensions.height}
          viewBox="0 0 200 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative drop-shadow-md transition-transform duration-700 ease-in-out hover:scale-105"
        >
          <defs>
            {/* Saffron & Ochre Royal Gradients */}
            <linearGradient id="sadMaskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="50%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#9A3412" />
            </linearGradient>

            <linearGradient id="happyMaskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDBA74" />
              <stop offset="45%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>

            <linearGradient id="goldAcc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            <filter id="theatreShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#7C2D12" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* LEFT MASK — Thoughtful / Serious / Tragic Natya Expression */}
          <g className="animate-[bounce_3s_ease-in-out_infinite] origin-bottom-left" style={{ animationDelay: '0ms' }} filter="url(#theatreShadow)">
            {/* Mask Face Contour */}
            <path
              d="M78 28 C42 26 22 52 24 88 C26 116 48 134 76 130 C90 128 98 116 100 102 C102 76 100 42 78 28 Z"
              fill="url(#sadMaskGrad)"
            />

            {/* Forehead Chandrakor / Tilak (Traditional Marathi Cultural Symbol) */}
            <path
              d="M62 40 C60 46 66 50 72 48 C68 47 64 43 62 40 Z"
              fill="url(#goldAcc)"
            />
            <circle cx="68" cy="44" r="2" fill="#FFFFFF" />

            {/* Arched Melancholic Brow */}
            <path
              d="M40 58 Q54 50 68 56"
              stroke="#FFF7ED"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />

            {/* Thoughtful Slanted Eye */}
            <path
              d="M44 66 C49 61 60 62 65 67 C59 71 50 70 44 66 Z"
              fill="#18181B"
            />
            <circle cx="56" cy="65" r="2" fill="#FFFFFF" />

            {/* Contemplative Mouth (Gentle Sad / Deep Theatrical Expression) */}
            <path
              d="M46 104 Q56 94 68 103"
              stroke="#18181B"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* Ear Ornament / Theatrical Kundal */}
            <circle cx="23" cy="80" r="5" fill="url(#goldAcc)" />
          </g>

          {/* RIGHT MASK — Joyful / Celebrating / Hasya Natya Expression */}
          <g className="animate-[bounce_3s_ease-in-out_infinite] origin-bottom-right" style={{ animationDelay: '350ms' }} filter="url(#theatreShadow)">
            {/* Mask Face Contour */}
            <path
              d="M122 22 C158 20 178 46 176 82 C174 110 152 136 124 134 C108 132 100 118 98 104 C96 74 98 38 122 22 Z"
              fill="url(#happyMaskGrad)"
            />

            {/* Forehead Auspicious Chandrakor / Bindi */}
            <path
              d="M138 34 C140 40 134 44 128 42 C132 41 136 37 138 34 Z"
              fill="url(#goldAcc)"
            />
            <circle cx="132" cy="38" r="2" fill="#FFFFFF" />

            {/* Joyful Arched Eyebrow */}
            <path
              d="M132 50 Q146 44 160 52"
              stroke="#FFF7ED"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.9"
            />

            {/* Smiling Crescent Eye */}
            <path
              d="M134 62 Q146 54 158 64"
              stroke="#18181B"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Happy Radiant Theatrical Smile */}
            <path
              d="M128 92 Q144 116 162 94 Q146 104 128 92 Z"
              fill="#18181B"
            />

            {/* Cheerful Ear Kundal */}
            <circle cx="177" cy="74" r="5" fill="url(#goldAcc)" />
          </g>

          {/* Golden Theatre Curtain Ribbon Tie / Natya Sutra at Base */}
          <path
            d="M86 122 Q100 134 114 122 Q100 128 86 122 Z"
            fill="url(#goldAcc)"
          />
        </svg>
      </div>

      {/* Typography Hierarchy */}
      <div className="space-y-1 max-w-xs px-2">
        <p className="text-sm font-black text-slate-900 tracking-wide font-sans">
          {message}
        </p>
        {submessage && (
          <p className="text-xs text-slate-500 font-medium">
            {submessage}
          </p>
        )}
      </div>
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm p-4">
        {content}
      </div>
    );
  }

  return content;
};
