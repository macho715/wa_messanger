import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { findShipmentLink } from './find-shipment';

function mockSupabase(
  resolver: (table: string, col: string, key: string) => { id: string } | null,
): SupabaseClient {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq(col: string, key: string) {
              return {
                maybeSingle: async () => {
                  const row = resolver(table, col, key);
                  return { data: row, error: null };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe('findShipmentLink', () => {
  it('returns null when no row matches', async () => {
    const client = mockSupabase(() => null);
    expect(await findShipmentLink(client, ['ABC', 'DEF'])).toBeNull();
  });

  it('returns first column hit in SHIPMENT_MATCH_COLS order for first matching key', async () => {
    const client = mockSupabase((_t, col, key) => {
      if (key === 'K1' && col === 'canonical_key') return { id: 'uuid-canonical' };
      if (key === 'K1' && col === 'hvdc_ref') return { id: 'uuid-hvdc' };
      return null;
    });
    expect(await findShipmentLink(client, ['K1'])).toBe('uuid-canonical');
  });

  it('tries next candidate key when first yields no match', async () => {
    const client = mockSupabase((_t, col, key) => {
      if (key === 'K2' && col === 'hvdc_ref') return { id: 'uuid-2' };
      return null;
    });
    expect(await findShipmentLink(client, ['K0', 'K2'])).toBe('uuid-2');
  });
});
