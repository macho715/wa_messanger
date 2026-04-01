import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { fetchWorkItemContext } from '@/lib/db/work-item-context';

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/db/work-item-context', () => ({
  fetchWorkItemContext: vi.fn(),
}));

describe('GET /api/work-items/[id]/context', () => {
  function makeRequest(url: string) {
    return new Request(url, {
      headers: {
        'x-requested-with': 'work-board-detail-panel',
        'sec-fetch-site': 'same-origin',
      },
    });
  }

  function enableRoute() {
    process.env.ENABLE_WORK_ITEM_CONTEXT_ROUTE = '1';
  }

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ENABLE_WORK_ITEM_CONTEXT_ROUTE;
  });

  it('rejects requests when the route is not enabled', async () => {
    const response = await GET(makeRequest('http://localhost/api/work-items/wi-1/context'), {
      params: Promise.resolve({ id: 'wi-1' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'context_route_disabled',
    });
  });

  it('rejects an empty id', async () => {
    enableRoute();

    const response = await GET(makeRequest('http://localhost/api/work-items//context'), {
      params: Promise.resolve({ id: '' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'invalid_work_item_id',
    });
  });

  it('returns 404 when the work item does not exist', async () => {
    enableRoute();

    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
    vi.mocked(fetchWorkItemContext).mockResolvedValue(null);

    const response = await GET(makeRequest('http://localhost/api/work-items/wi-1/context'), {
      params: Promise.resolve({ id: 'wi-1' }),
    });

    expect(getSupabaseAdmin).toHaveBeenCalledTimes(1);
    expect(fetchWorkItemContext).toHaveBeenCalledWith({}, 'wi-1');
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'work_item_not_found',
    });
  });

  it('returns the safe context payload', async () => {
    enableRoute();

    const context = {
      workItem: {
        id: 'wi-1',
        groupId: 'g@g.us',
        sourceMessageId: 'msg-source',
        replyToMessageId: null,
        title: 'Gate pass',
        boardState: 'NEW',
        eventStatus: 'REQUEST',
        ownerName: null,
        holdReason: null,
        lastMessageAt: '2026-04-01T00:00:00.000Z',
        shipmentRefId: null,
        meta: {},
      },
      evidence: {
        messages: [],
        missingMessageIds: [],
      },
    };

    vi.mocked(getSupabaseAdmin).mockReturnValue({} as never);
    vi.mocked(fetchWorkItemContext).mockResolvedValue(context);

    const response = await GET(makeRequest('http://localhost/api/work-items/wi-1/context'), {
      params: Promise.resolve({ id: 'wi-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, context });
  });

  it('rejects requests without the detail-panel client header', async () => {
    enableRoute();

    const response = await GET(new Request('http://localhost/api/work-items/wi-1/context'), {
      params: Promise.resolve({ id: 'wi-1' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'forbidden_client',
    });
  });

  it('rejects cross-site requests', async () => {
    enableRoute();

    const response = await GET(
      new Request('http://localhost/api/work-items/wi-1/context', {
        headers: {
          'x-requested-with': 'work-board-detail-panel',
          'sec-fetch-site': 'cross-site',
        },
      }),
      {
        params: Promise.resolve({ id: 'wi-1' }),
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'forbidden_cross_site',
    });
  });
});
