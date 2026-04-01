import { createClient } from '@supabase/supabase-js';

const mode = process.argv[2] ?? 'status';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const shipmentIds = [
  '22222222-2222-2222-2222-222222222222',
  '44444444-4444-4444-4444-444444444444',
];

const workItemIds = [
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  '55555555-5555-5555-5555-555555555555',
];

async function showStatus() {
  const [{ data: shipments }, { data: items }] = await Promise.all([
    supabase.from('shipment_ref').select('id,canonical_key').in('id', shipmentIds),
    supabase.from('work_item').select('id,title,board_state').in('id', workItemIds),
  ]);

  console.log(JSON.stringify({ shipments: shipments ?? [], workItems: items ?? [] }, null, 2));
}

async function cleanup() {
  const { error: histError } = await supabase
    .from('work_item_status_history')
    .delete()
    .in('work_item_id', workItemIds);
  if (histError) throw histError;

  const { error: workError } = await supabase
    .from('work_item')
    .delete()
    .in('id', workItemIds);
  if (workError) throw workError;

  const { error: shipmentError } = await supabase
    .from('shipment_ref')
    .delete()
    .in('id', shipmentIds);
  if (shipmentError) throw shipmentError;

  console.log('manual seed rows removed');
}

if (mode === 'cleanup') {
  await cleanup();
} else {
  await showStatus();
}
