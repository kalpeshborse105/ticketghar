'use client';

import React from 'react';
import { MTButton } from './MTButton';
import { MahaTheatreLoader } from './MahaTheatreLoader';

interface MTEmptyStateProps {
  type?: 'events' | 'tickets' | 'search' | 'offers' | 'general' | 'theatre';
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
  if (type === 'events' || type === 'theatre' || type === 'general') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-[#e5e7eb] shadow-2xs max-w-lg mx-auto ${className}`}>
        <MahaTheatreLoader
          size="md"
          message={title}
          submessage={description}
        />
        {actionText && onAction && (
          <div className="mt-5">
            <MTButton size="md" variant="primary" onClick={onAction}>
              {actionText}
            </MTButton>
          </div>
        )}
      </div>
    );
  }

  const renderIllustration = () => {
    const iconClass = 'w-16 h-16 text-[#ea580c]/60 mb-3';

    switch (type) {
      case 'tickets':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'search':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'offers':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-[#e5e7eb] ${className}`}>
      {renderIllustration()}
      <h3 className="text-base font-bold text-[#111827] mb-1">{title}</h3>
      <p className="text-sm text-[#64748B] max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <MTButton size="sm" variant="secondary" onClick={onAction}>
          {actionText}
        </MTButton>
      )}
    </div>
  );
};
