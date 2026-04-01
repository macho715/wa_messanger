import crypto from 'crypto';

export type WahaSignatureEnvelope = {
  signature: string | null;
  algorithm: string;
};

function normalizeAlgorithm(input: string | null | undefined): string {
  const cleaned = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return cleaned || 'sha256';
}

/**
 * Prefer env `WAHA_SIGNATURE_HEADER`, then common WAHA / proxy header names.
 * Supports WAHA official HMAC headers and legacy proxy headers.
 * Strips leading `<algo>=` when present.
 */
export function extractWahaSignature(headers: Headers): WahaSignatureEnvelope {
  const primary = process.env.WAHA_SIGNATURE_HEADER ?? 'x-waha-signature';
  const defaultAlgorithm = normalizeAlgorithm(process.env.WAHA_HMAC_ALGO);
  const candidates: Array<{ value: string | null; algorithm: string }> = [
    { value: headers.get(primary), algorithm: defaultAlgorithm },
    { value: headers.get('x-waha-signature'), algorithm: defaultAlgorithm },
    { value: headers.get('x-signature-256'), algorithm: 'sha256' },
    {
      value: headers.get('x-webhook-hmac'),
      algorithm: normalizeAlgorithm(headers.get('x-webhook-hmac-algorithm') ?? 'sha512'),
    },
  ];
  const candidate = candidates.find((item) => Boolean(item.value?.trim()));
  if (!candidate) {
    return { signature: null, algorithm: defaultAlgorithm };
  }

  let value = candidate.value!.trim();
  const prefixed = value.match(/^([a-z0-9-]+)=(.+)$/i);
  if (prefixed) {
    value = prefixed[2].trim();
    return {
      signature: value || null,
      algorithm: normalizeAlgorithm(prefixed[1]),
    };
  }

  return {
    signature: value || null,
    algorithm: candidate.algorithm,
  };
}

/**
 * WAHA webhook HMAC (v5). Header default `x-waha-signature`, hex digest.
 * Set WAHA_WEBHOOK_SECRET or legacy WA_WEBHOOK_SECRET.
 */
export function verifyWahaSignature(
  rawBody: string,
  headerSignature: string | null,
  algorithm?: string,
): boolean {
  const secret =
    process.env.WAHA_WEBHOOK_SECRET ?? process.env.WA_WEBHOOK_SECRET ?? '';

  if (!secret) {
    throw new Error('WAHA_WEBHOOK_SECRET (or WA_WEBHOOK_SECRET) is missing');
  }

  if (!headerSignature) return false;

  const algo = normalizeAlgorithm(algorithm ?? process.env.WAHA_HMAC_ALGO);
  const computed = crypto.createHmac(algo, secret).update(rawBody, 'utf8').digest('hex');

  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(headerSignature.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
