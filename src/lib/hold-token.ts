import crypto from 'crypto';

/** Prefix for server-issued hold tokens stored in seat_inventory.held_by_user_id */
export const HOLD_TOKEN_PREFIX = 'hold_';

export function generateSecureHoldToken(): string {
  return `${HOLD_TOKEN_PREFIX}${crypto.randomBytes(32).toString('hex')}`;
}

export function isValidHoldTokenFormat(token: string): boolean {
  return (
    typeof token === 'string' &&
    token.startsWith(HOLD_TOKEN_PREFIX) &&
    token.length === HOLD_TOKEN_PREFIX.length + 64 &&
    /^hold_[0-9a-f]{64}$/.test(token)
  );
}
