'use client';

import React from 'react';

interface TheatreMaskLogoProps {
  className?: string;
  size?: number | string;
  animate?: boolean;
}

export const TheatreMaskLogo: React.FC<TheatreMaskLogoProps> = ({
  className = 'w-10 h-8',
  animate = true,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 400 320"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="tmMaskShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#7C2D12" floodOpacity="0.25" />
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.12" />
          </filter>

          <radialGradient id="tmFloorShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="tmComedyBody" x1="25%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="48%" stopColor="#FFF7ED" />
            <stop offset="100%" stopColor="#FED7AA" />
          </linearGradient>

          <linearGradient id="tmTragedyBody" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <linearGradient id="tmFeatureCut" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#991B1B" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>

        <style>{`
          @keyframes tmFloatComedy {
            0%, 100% { transform: translateY(0px) rotate(-5deg); }
            50% { transform: translateY(-6px) rotate(-2deg); }
          }
          @keyframes tmFloatTragedy {
            0%, 100% { transform: translateY(0px) rotate(6deg); }
            50% { transform: translateY(-7px) rotate(9deg); }
          }
          @keyframes tmPulseShadowLeft {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(0.88); opacity: 0.3; }
          }
          @keyframes tmPulseShadowRight {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(0.85); opacity: 0.28; }
          }
          ${
            animate
              ? `
            .tm-comedy-group {
              transform-origin: 150px 150px;
              animation: tmFloatComedy 3.2s ease-in-out infinite;
            }
            .tm-tragedy-group {
              transform-origin: 255px 135px;
              animation: tmFloatTragedy 3.6s ease-in-out infinite;
              animation-delay: -0.6s;
            }
            .tm-shadow-left {
              transform-origin: 150px 270px;
              animation: tmPulseShadowLeft 3.2s ease-in-out infinite;
            }
            .tm-shadow-right {
              transform-origin: 260px 270px;
              animation: tmPulseShadowRight 3.6s ease-in-out infinite;
              animation-delay: -0.6s;
            }
          `
              : ''
          }
        `}</style>

        {/* Ambient Floor Shadows */}
        <g id="tm-floor-shadows">
          <ellipse className="tm-shadow-left" cx="150" cy="272" rx="46" ry="9" fill="url(#tmFloorShadow)" />
          <ellipse className="tm-shadow-right" cx="260" cy="272" rx="42" ry="8" fill="url(#tmFloorShadow)" />
        </g>

        {/* TRAGEDY MASK (Back Right) */}
        <g className="tm-tragedy-group" filter="url(#tmMaskShadow)">
          <path
            d="M208,68 C238,82 278,82 308,68 C318,122 300,188 274,212 C252,230 242,228 226,206 C202,176 198,118 208,68 Z"
            fill="url(#tmTragedyBody)"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
          <path
            d="M208,68 C228,78 250,82 258,82 L250,218 C242,222 234,218 226,206 C202,176 198,118 208,68 Z"
            fill="#94A3B8"
            opacity="0.25"
          />
          {/* Eyes */}
          <path d="M225,124 C236,118 248,124 252,132 C244,136 230,136 225,124 Z" fill="url(#tmFeatureCut)" />
          <path d="M268,126 C274,120 286,120 294,128 C288,136 274,136 268,126 Z" fill="url(#tmFeatureCut)" />
          {/* Mouth */}
          <path d="M232,185 C244,166 268,166 282,184 C270,174 246,174 232,185 Z" fill="url(#tmFeatureCut)" />
          {/* Crown Notch */}
          <circle cx="258" cy="80" r="2.5" fill="#C2410C" opacity="0.4" />
        </g>

        {/* COMEDY MASK (Front Left) */}
        <g className="tm-comedy-group" filter="url(#tmMaskShadow)">
          <path
            d="M86,112 C124,128 174,124 212,94 C222,148 206,218 172,246 C144,268 132,260 114,236 C86,198 78,154 86,112 Z"
            fill="url(#tmComedyBody)"
            stroke="#EA580C"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
          <path
            d="M86,112 C114,124 140,126 152,126 L154,256 C140,258 128,252 114,236 C86,198 78,154 86,112 Z"
            fill="#EA580C"
            opacity="0.12"
          />
          {/* Eyes */}
          <path d="M112,162 C118,148 134,148 144,160 C136,168 120,168 112,162 Z" fill="url(#tmFeatureCut)" />
          <path d="M164,152 C172,138 188,140 196,154 C186,162 172,160 164,152 Z" fill="url(#tmFeatureCut)" />
          {/* Grin */}
          <path d="M128,198 C148,228 180,224 196,188 C178,210 148,212 128,198 Z" fill="url(#tmFeatureCut)" />
          <path d="M136,208 C152,224 176,220 188,196 C174,214 150,216 136,208 Z" fill="#FED7AA" opacity="0.6" />
          {/* Chandrakor Tilak touch */}
          <path d="M152,118 A5,5 0 0,1 159,124 A4,4 0 0,0 152,120 Z" fill="#EA580C" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
};
