import type { SupabaseClient } from '@supabase/supabase-js';

const SHIPMENT_MATCH_COLS = ['canonical_key', 'hvdc_ref', 'sct_ship_no', 'bl_ref', 'ci_ref'] as const;

/**
 * Read-only link to existing SSOT row; never creates shipments from chat text.
 */
export async function findShipmentLink(
  supabase: SupabaseClient,
  candidates: string[],
): Promise<string | null> {
  for (const key of candidates) {
    const results = await Promise.all(
      SHIPMENT_MATCH_COLS.map((col) =>
        supabase.from('shipment_ref').select('id').eq(col, key).maybeSingle(),
      ),
    );
    for (let i = 0; i < SHIPMENT_MATCH_COLS.length; i += 1) {
      const { data, error } = results[i];
      if (!error && data?.id) return data.id as string;
    }
  }
  return null;
}
