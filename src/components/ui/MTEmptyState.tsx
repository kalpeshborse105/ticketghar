'use client';

import React from 'react';
import { MTButton } from './MTButton';

interface MTEmptyStateProps {
  type?: 'events' | 'tickets' | 'search' | 'offers' | 'general';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const MTEmptyState: React.FC<MTEmptyStateProps> = ({
  type = 'general',
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  const renderIllustration = () => {
    switch (type) {
      case 'events':
        return (
          <svg className="w-16 h-16 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        );
      case 'tickets':
        return (
          <svg className="w-16 h-16 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'search':
        return (
          <svg className="w-16 h-16 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'offers':
        return (
          <svg className="w-16 h-16 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        );
      default:
        return (
          <svg className="w-16 h-16 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-[#111827] rounded-xl border border-[#243044] ${className}`}>
      {renderIllustration()}
      <h3 className="text-base font-semibold text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <MTButton size="sm" variant="secondary" onClick={onAction}>
          {actionText}
        </MTButton>
      )}
    </div>
  );
};
