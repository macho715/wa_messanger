import crypto from 'crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import { extractWahaSignature, verifyWahaSignature } from './verify-signature';

describe('verifyWahaSignature', () => {
  beforeEach(() => {
    process.env.WAHA_WEBHOOK_SECRET = 'test-secret';
    delete process.env.WA_WEBHOOK_SECRET;
  });

  it('rejects when header missing', () => {
    expect(verifyWahaSignature('{}', null)).toBe(false);
  });

  it('accepts matching hex HMAC sha256', () => {
    const raw = '{"a":1}';
    const sig = crypto.createHmac('sha256', 'test-secret').update(raw, 'utf8').digest('hex');
    expect(verifyWahaSignature(raw, sig)).toBe(true);
  });

  it('rejects wrong signature', () => {
    expect(verifyWahaSignature('{}', 'deadbeef')).toBe(false);
  });

  it('accepts sha256= prefixed header digest', () => {
    const raw = '{"a":1}';
    const sig = crypto.createHmac('sha256', 'test-secret').update(raw, 'utf8').digest('hex');
    const h = new Headers();
    h.set('x-waha-signature', `sha256=${sig}`);
    expect(extractWahaSignature(h)).toBe(sig);
    expect(verifyWahaSignature(raw, extractWahaSignature(h))).toBe(true);
  });
});
