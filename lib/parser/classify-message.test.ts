import { describe, expect, it } from 'vitest';
import { classifyMessage } from './classify-message';

describe('classifyMessage', () => {
  it('classifies HOLD + WAITING_DOC for MSDS', () => {
    const p = classifyMessage('MSDS expired, waiting TPI clearance');
    expect(p.boardState).toBe('HOLD');
    expect(p.eventStatus).toBe('WAITING_DOC');
    expect(p.parserAction).toBe('UPDATE_ITEM');
  });

  it('does not mark DONE when pending remains', () => {
    const p = classifyMessage('done but balance qty still pending');
    expect(p.boardState).not.toBe('DONE');
  });

  it('marks NO_CHANGE for short noted', () => {
    const p = classifyMessage('well noted');
    expect(p.parserAction).toBe('NO_CHANGE');
  });

  it('IGNORE empty body', () => {
    const p = classifyMessage('   ');
    expect(p.parserAction).toBe('IGNORE');
  });

  it('never implies shipment link in output (no shipment fields)', () => {
    const p = classifyMessage('Shipment HVDC-ADOPT-SCT-0001 pending BOE');
    expect('shipmentRef' in p).toBe(false);
    expect(p.boardState).toBe('HOLD');
  });

  it('captures parser evidence for parse-ledger persistence', () => {
    const p = classifyMessage('HVDC-ADOPT-SCT-0001 BOE pending at customs owner: Jay');
    expect(p.keywordsHit).toEqual(
      expect.arrayContaining(['owner: Jay', 'BOE pending', 'BOE', 'customs']),
    );
    expect(p.shipmentKeyCandidates).toContain('HVDC-ADOPT-SCT-0001');
    expect(p.summary).toContain('BOE pending');
    expect(p.normalizedText).toContain('owner: Jay');
  });
});
