import { describe, expect, it } from 'vitest';
import { classifyMessage } from '@/lib/parser/classify-message';

/**
 * Contract: parser must not assert shipment truth (AGENTS.md).
 * Webhook may attach shipment_ref_id only when a pre-existing public.shipment_ref row matches text keys (read-only link).
 */
describe('pipeline contract', () => {
  it('mentions of HVDC refs stay as text only; card uses hold/doc semantics', () => {
    const p = classifyMessage('HVDC-ADOPT-SCT-0001 BOE pending at customs');
    expect(p.boardState).toBe('HOLD');
    expect(p.eventStatus).toBe('WAITING_DOC');
  });
});
