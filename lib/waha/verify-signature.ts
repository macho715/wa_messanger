import crypto from 'crypto';

/**
 * Prefer env `WAHA_SIGNATURE_HEADER`, then common WAHA / proxy header names.
 * Strips leading `sha256=` when present (GitHub-style prefixes).
 */
export function extractWahaSignature(headers: Headers): string | null {
  const primary = process.env.WAHA_SIGNATURE_HEADER ?? 'x-waha-signature';
  const candidates = [
    headers.get(primary),
    headers.get('x-waha-signature'),
    headers.get('x-signature-256'),
  ].filter((v): v is string => Boolean(v));
  if (candidates.length === 0) return null;
  let v = candidates[0].trim();
  const lower = v.toLowerCase();
  if (lower.startsWith('sha256=')) v = v.slice(7).trim();
  return v || null;
}

/**
 * WAHA webhook HMAC (v5). Header default `x-waha-signature`, hex digest.
 * Set WAHA_WEBHOOK_SECRET or legacy WA_WEBHOOK_SECRET.
 */
export function verifyWahaSignature(rawBody: string, headerSignature: string | null): boolean {
  const secret =
    process.env.WAHA_WEBHOOK_SECRET ?? process.env.WA_WEBHOOK_SECRET ?? '';

  if (!secret) {
    throw new Error('WAHA_WEBHOOK_SECRET (or WA_WEBHOOK_SECRET) is missing');
  }

  if (!headerSignature) return false;

  const algo = process.env.WAHA_HMAC_ALGO || 'sha256';
  const computed = crypto.createHmac(algo, secret).update(rawBody, 'utf8').digest('hex');

  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(headerSignature.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
