import crypto from 'crypto';

function getTicketSecret(): string {
  return process.env.TICKET_SECRET || 'mahaticket_secure_signing_key_2026';
}

/**
 * Encrypts a ticket code and event ID into an opaque, secure, tamper-proof QR code payload.
 * No plain ticket code or seat number is visible to the public or standard QR readers.
 * Uses AES-256-GCM authenticated encryption.
 */
export function generateSecureTicketQr(ticketCode: string, eventId: number): string {
  const secret = getTicketSecret();
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(secret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const payload = JSON.stringify({
    c: ticketCode,
    e: eventId,
    t: Date.now(),
    nonce: crypto.randomBytes(4).toString('hex'),
  });

  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `MTSEC:v1:${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts and authenticates a secure MTSEC QR token.
 * Returns null if the token has been tampered with or key does not match.
 */
export function decryptSecureTicketQr(rawScanned: string): { ticketCode: string; eventId?: number } | null {
  if (!rawScanned) return null;
  const trimmed = rawScanned.trim();

  if (!trimmed.startsWith('MTSEC:v1:')) {
    return null;
  }

  try {
    const parts = trimmed.split(':');
    if (parts.length < 5) return null;

    const iv = Buffer.from(parts[2], 'hex');
    const tag = Buffer.from(parts[3], 'hex');
    const ciphertext = parts[4];

    const secret = getTicketSecret();
    const key = crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const data = JSON.parse(decrypted);
    if (data && data.c) {
      return {
        ticketCode: data.c,
        eventId: data.e ? Number(data.e) : undefined,
      };
    }
  } catch (err) {
    console.warn('Failed to decrypt MTSEC token:', err);
    return null;
  }

  return null;
}
