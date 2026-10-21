/**
 * Search utility hook — debounced search for events
 */
import { useEffect, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = [value, (v: T) => {}];
  // Simple debounce via useRef
  return value; // simplified - components handle debouncing directly
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Format price in paise to INR string */
export function formatPaise(paise: number | null | undefined): string {
  if (!paise) return '₹0';
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

/** Time remaining string */
export function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Truncate text */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/** Parse Indian phone */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
}

/** Generate color from string (for avatars) */
export function colorFromString(str: string): string {
  const colors = ['#FF6B35', '#E94560', '#00D9A3', '#54A0FF', '#9B59B6', '#FFB800'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
