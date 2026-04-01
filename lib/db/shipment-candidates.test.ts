import { describe, expect, it } from 'vitest';
import { extractShipmentKeyCandidates } from './shipment-candidates';

describe('extractShipmentKeyCandidates', () => {
  it('dedupes and uppercases, max 24', () => {
    const body = 'SCT 12 sct 12 HVDC-X J01-99 J01-99';
    const keys = extractShipmentKeyCandidates(body);
    expect(keys.length).toBeLessThanOrEqual(24);
    expect(keys).toContain('SCT12');
    expect(keys.filter((k) => k === 'SCT12').length).toBe(1);
  });

  it('skips very short tokens', () => {
    expect(extractShipmentKeyCandidates('AB  X 12')).not.toContain('AB');
  });
});
