import crypto from 'crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import { extractWahaSignature, verifyWahaSignature } from './verify-signature';

describe('verifyWahaSignature', () => {
  beforeEach(() => {
    process.env.WAHA_WEBHOOK_SECRET = 'test-secret';
    delete process.env.WA_WEBHOOK_SECRET;
    delete process.env.WAHA_HMAC_ALGO;
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
    const envelope = extractWahaSignature(h);
    expect(envelope).toEqual({ signature: sig, algorithm: 'sha256' });
    expect(verifyWahaSignature(raw, envelope.signature, envelope.algorithm)).toBe(true);
  });

  it('accepts official WAHA x-webhook-hmac sha512 headers', () => {
    const raw = '{"a":1}';
    const sig = crypto.createHmac('sha512', 'test-secret').update(raw, 'utf8').digest('hex');
    const h = new Headers();
    h.set('x-webhook-hmac', sig);
    h.set('x-webhook-hmac-algorithm', 'sha512');
    const envelope = extractWahaSignature(h);
    expect(envelope).toEqual({ signature: sig, algorithm: 'sha512' });
    expect(verifyWahaSignature(raw, envelope.signature, envelope.algorithm)).toBe(true);
  });
});
