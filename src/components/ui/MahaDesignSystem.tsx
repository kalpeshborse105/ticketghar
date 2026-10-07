'use client';

import React from 'react';
import { MahaTheatreLoader } from './MahaTheatreLoader';
import {
  Ticket,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';

/* =====================================================================
   1. MahaButton — Approved Primary & Secondary Actions
   ===================================================================== */
export interface MahaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warm';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const MahaButton: React.FC<MahaButtonProps> = ({
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
  const base =
    'inline-flex items-center justify-center font-bold transition-all duration-200 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    primary:
      'bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-sm focus:ring-[#EA580C]/40 active:bg-[#9A3412]',
    secondary:
      'bg-white hover:bg-[#FFF7ED] text-[#111827] border border-[#E5E7EB] hover:border-[#EA580C]/40 focus:ring-[#EA580C]/20 shadow-2xs',
    outline:
      'bg-transparent hover:bg-[#FFF7ED] text-[#EA580C] border-2 border-[#EA580C] focus:ring-[#EA580C]/30',
    ghost:
      'bg-transparent hover:bg-[#FFF7ED] text-[#64748B] hover:text-[#EA580C]',
    danger:
      'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm focus:ring-[#DC2626]/40',
    warm:
      'bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] border border-[#FDBA74]/50 focus:ring-[#EA580C]/30',
  }[variant];

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-base px-6 py-3 gap-2.5 min-h-[48px] text-[15px]',
  }[size];

  return (
    <button
      className={`${base} ${variants} ${sizes} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-80 mr-1.5" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

/* =====================================================================
   2. MahaCard — Clean White Card on Warm Canvas
   ===================================================================== */
export interface MahaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'flat' | 'warm' | 'outlined';
}

export const MahaCard: React.FC<MahaCardProps> = ({
  children,
  variant = 'elevated',
  className = '',
  ...props
}) => {
  const styles = {
    elevated: 'bg-white rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition-shadow duration-300',
    flat: 'bg-white rounded-2xl border border-[#E5E7EB]',
    warm: 'bg-[#FFF7ED] rounded-2xl border border-[#FED7AA]/60',
    outlined: 'bg-white rounded-2xl border-2 border-[#E5E7EB]',
  }[variant];

  return (
    <div className={`${styles} ${className}`} {...props}>
      {children}
    </div>
  );
};

/* =====================================================================
   3. MahaStatusBadge — Visual Indicators for Event Availability & Status
   ===================================================================== */
export type MahaBadgeType =
  | 'fast_filling' // लवकर भरत आहे (#F59E0B)
  | 'sold_out'     // सर्व जागा फुल्ल (#DC2626)
  | 'popular'      // लोकप्रिय (#EA580C)
  | 'new'          // नवीन (#2563EB)
  | 'today'        // आज (#16A34A)
  | 'tomorrow'     // उद्या (#059669)
  | 'verified'     // तपासलेले (#16A34A)
  | 'neutral';     // सामान्य (#64748B)

export interface MahaStatusBadgeProps {
  type?: MahaBadgeType;
  label?: string;
  className?: string;
  dot?: boolean;
}

export const MahaStatusBadge: React.FC<MahaStatusBadgeProps> = ({
  type = 'neutral',
  label,
  className = '',
  dot = true,
}) => {
  const config = {
    fast_filling: {
      defaultLabel: 'लवकर भरत आहे',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      dotColor: 'bg-[#F59E0B]',
    },
    sold_out: {
      defaultLabel: 'सर्व जागा फुल्ल',
      bg: 'bg-red-50 text-red-800 border-red-200',
      dotColor: 'bg-[#DC2626]',
    },
    popular: {
      defaultLabel: 'लोकप्रिय',
      bg: 'bg-orange-50 text-[#EA580C] border-orange-200',
      dotColor: 'bg-[#EA580C]',
    },
    new: {
      defaultLabel: 'नवीन',
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      dotColor: 'bg-[#2563EB]',
    },
    today: {
      defaultLabel: 'आज',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotColor: 'bg-[#16A34A]',
    },
    tomorrow: {
      defaultLabel: 'उद्या',
      bg: 'bg-teal-50 text-teal-800 border-teal-200',
      dotColor: 'bg-[#0D9488]',
    },
    verified: {
      defaultLabel: 'तपासलेले (Verified)',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotColor: 'bg-[#16A34A]',
    },
    neutral: {
      defaultLabel: '',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      dotColor: 'bg-slate-400',
    },
  }[type];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.bg} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotColor}`} />}
      <span>{label || config.defaultLabel}</span>
    </span>
  );
};

/* =====================================================================
   4. MahaCategoryChip & MahaShowChip
   ===================================================================== */
export interface MahaCategoryChipProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  count?: number;
}

export const MahaCategoryChip: React.FC<MahaCategoryChipProps> = ({
  label,
  icon,
  active = false,
  onClick,
  count,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all select-none shrink-0 border ${
        active
          ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-xs'
          : 'bg-white hover:bg-[#FFF7ED] text-[#111827] border-[#E5E7EB] hover:border-[#EA580C]/40'
      }`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
            active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};

/* =====================================================================
   5. MahaEmptyState — Warm Marathi-First Empty Screen Presentation
   ===================================================================== */
export interface MahaEmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  isCityEmpty?: boolean;
  className?: string;
}

export const MahaEmptyState: React.FC<MahaEmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  isCityEmpty = false,
  className = '',
}) => {
  const displayTitle = isCityEmpty
    ? title || 'या शहरात सध्या कार्यक्रम उपलब्ध नाहीत.'
    : title || 'कार्यक्रम सापडले नाहीत';

  const displayDesc = isCityEmpty
    ? description || 'लवकरच नवीन नाटके व सांस्कृतिक कार्यक्रम सुरू होतील. आपण संपूर्ण महाराष्ट्रातील कार्यक्रम पाहू शकता.'
    : description || 'कृपया शोध किंवा फिल्टर बदलून पुन्हा प्रयत्न करा.';

  const displayAction = isCityEmpty
    ? actionText || 'संपूर्ण महाराष्ट्रातील कार्यक्रम पहा'
    : actionText;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs max-w-lg mx-auto ${className}`}
    >
      <MahaTheatreLoader
        size="md"
        message={displayTitle}
        submessage={displayDesc}
      />

      {displayAction && onAction && (
        <div className="mt-5">
          <MahaButton variant="primary" size="md" onClick={onAction}>
            {displayAction}
          </MahaButton>
        </div>
      )}
    </div>
  );
};

/* =====================================================================
   6. MahaErrorState — Visual Human-Friendly Error Presentation
   ===================================================================== */
export interface MahaErrorStateProps {
  title?: string;
  message?: string;
  retryText?: string;
  onRetry?: () => void;
  className?: string;
}

export const MahaErrorState: React.FC<MahaErrorStateProps> = ({
  title = 'अरेरे! काहीतरी अडचण आली.',
  message = 'कृपया पुन्हा प्रयत्न करा.',
  retryText = 'पुन्हा प्रयत्न करा',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-10 text-center bg-white rounded-2xl border border-red-100 shadow-2xs max-w-md mx-auto ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#DC2626] mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>

      <h3 className="text-base sm:text-lg font-black text-[#111827] mb-1 font-serif">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[#64748B] mb-5">{message}</p>

      {onRetry && (
        <MahaButton
          variant="warm"
          size="md"
          leftIcon={<RotateCcw className="w-4 h-4" />}
          onClick={onRetry}
        >
          {retryText}
        </MahaButton>
      )}
    </div>
  );
};

/* =====================================================================
   7. MahaStepper — Multi-Step Flow Indicator for Event Creation & Checkout
   ===================================================================== */
export interface MahaStepperProps {
  steps: { id: number | string; label: string; labelMr?: string }[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const MahaStepper: React.FC<MahaStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = '',
}) => {
  return (
    <div className={`w-full overflow-x-auto py-2 scrollbar-none ${className}`}>
      <div className="flex items-center min-w-max gap-2 sm:gap-3 px-1">
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div
                  className={`h-0.5 w-4 sm:w-8 transition-colors ${
                    isDone ? 'bg-[#EA580C]' : 'bg-[#E5E7EB]'
                  }`}
                />
              )}
              <button
                type="button"
                disabled={!onStepClick || (!isDone && !isCurrent)}
                onClick={() => onStepClick && onStepClick(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all select-none ${
                  isCurrent
                    ? 'bg-[#EA580C] text-white shadow-xs'
                    : isDone
                    ? 'bg-orange-50 text-[#C2410C] hover:bg-orange-100'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isCurrent
                      ? 'bg-white text-[#EA580C]'
                      : isDone
                      ? 'bg-[#EA580C] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </span>
                <span>{step.labelMr || step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export { MahaTheatreLoader };
