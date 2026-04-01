import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fetchWorkItemContext } from '@/lib/db/work-item-context';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DETAIL_CONTEXT_CLIENT = 'work-board-detail-panel';

function authorizeContextRequest(
  request: Request,
): { ok: true } | { ok: false; status: number; error: string } {
  const routeEnabled = process.env.ENABLE_WORK_ITEM_CONTEXT_ROUTE === '1';

  if (!routeEnabled) {
    return { ok: false, status: 403, error: 'context_route_disabled' };
  }

  const requestedWith = request.headers.get('x-requested-with');
  if (requestedWith !== DETAIL_CONTEXT_CLIENT) {
    return { ok: false, status: 403, error: 'forbidden_client' };
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    return { ok: false, status: 403, error: 'forbidden_cross_site' };
  }

  return { ok: true };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id?: string }> | { id?: string } },
) {
  const auth = authorizeContextRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const params = await context.params;
  const workItemId = typeof params.id === 'string' ? params.id.trim() : '';

  if (!workItemId) {
    return NextResponse.json({ ok: false, error: 'invalid_work_item_id' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const contextRow = await fetchWorkItemContext(supabase, workItemId);

    if (!contextRow) {
      return NextResponse.json({ ok: false, error: 'work_item_not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, context: contextRow });
  } catch (error) {
    console.error('work_item_context_lookup_failed', error);
    return NextResponse.json({ ok: false, error: 'context_lookup_failed' }, { status: 500 });
  }
}
