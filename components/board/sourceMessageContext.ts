type ContextDetail = {
  label: string;
  value: string;
};

export type SourceMessageContextView = {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'unavailable' | 'error';
  sourceMessageId: string | null;
  endpoint: string | null;
  summary: string | null;
  details: ContextDetail[];
  note: string | null;
  error: string | null;
};

function buildContextEndpoint(workItemId: string): string {
  return `/api/work-items/${encodeURIComponent(workItemId)}/context`;
}

const SUMMARY_KEYS = [
  'summary',
  'headline',
  'title',
  'snippet',
  'excerpt',
  'message',
  'body',
  'text',
  'normalized_text',
  'raw_text',
];

const DETAIL_KEYS = [
  'source_message_id',
  'reply_to_message_id',
  'linkage_status',
  'source_event',
  'group_id',
  'thread_id',
  'owner_name',
  'shipment_ref_id',
  'shipment_label',
  'board_state',
  'event_status',
  'last_message_at',
];

const WRAPPER_KEYS = new Set(['ok', 'status', 'endpoint', 'source_message_id', 'message_id', 'id']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMeaningfulPrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string'
      ? value.trim().length > 0
      : typeof value === 'number' || typeof value === 'boolean'
  );
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 320 ? `${trimmed.slice(0, 317)}…` : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const primitiveItems = value.filter(isMeaningfulPrimitive);
    if (primitiveItems.length === value.length && primitiveItems.length > 0) {
      return primitiveItems.map((item) => formatValue(item)).join(', ');
    }
    const preview = value.slice(0, 3).map((item) => formatValue(item));
    return `[${preview.join(', ')}${value.length > 3 ? ', …' : ''}]`;
  }
  if (isPlainObject(value)) {
    try {
      const json = JSON.stringify(value, null, 2);
      return json.length > 320 ? `${json.slice(0, 317)}…` : json;
    } catch {
      return '[unserializable object]';
    }
  }
  return String(value);
}

function collectSummary(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!isPlainObject(value)) return null;
  for (const key of SUMMARY_KEYS) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function addDetail(details: ContextDetail[], label: string, value: unknown) {
  if (!isMeaningfulPrimitive(value) && !Array.isArray(value) && !isPlainObject(value)) return;
  const formatted = formatValue(value);
  if (formatted === '—') return;
  details.push({ label, value: formatted });
}

function collectDetails(value: unknown, prefix = '', depth = 0): ContextDetail[] {
  if (!isPlainObject(value) || depth > 1) return [];
  const details: ContextDetail[] = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    if (WRAPPER_KEYS.has(key)) continue;
    const label = prefix ? `${prefix}.${key}` : key;

    if (SUMMARY_KEYS.includes(key)) continue;
    if (DETAIL_KEYS.includes(key)) {
      addDetail(details, label, nestedValue);
      continue;
    }

    if (isMeaningfulPrimitive(nestedValue)) {
      addDetail(details, label, nestedValue);
      continue;
    }

    if (Array.isArray(nestedValue)) {
      if (nestedValue.length === 0) continue;
      if (nestedValue.every(isMeaningfulPrimitive)) {
        addDetail(details, label, nestedValue);
        continue;
      }
      nestedValue.slice(0, 2).forEach((item, index) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          details.push(...collectDetails(item, `${label}[${index + 1}]`, depth + 1));
        } else {
          addDetail(details, `${label}[${index + 1}]`, item);
        }
      });
      continue;
    }

    if (isPlainObject(nestedValue)) {
      details.push(...collectDetails(nestedValue, label, depth + 1));
    }
  }

  return details.slice(0, 8);
}

function hasExtraContext(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (!isPlainObject(value)) return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (WRAPPER_KEYS.has(key)) continue;
    if (SUMMARY_KEYS.includes(key)) return true;
    if (DETAIL_KEYS.includes(key) && isMeaningfulPrimitive(nestedValue)) return true;
    if (isMeaningfulPrimitive(nestedValue)) return true;
    if (Array.isArray(nestedValue) && nestedValue.length > 0) return true;
    if (isPlainObject(nestedValue) && hasExtraContext(nestedValue)) return true;
  }

  return false;
}

function unwrapPayload(payload: unknown): unknown {
  if (!isPlainObject(payload)) return payload;

  for (const key of ['data', 'context', 'result', 'payload']) {
    const nested = payload[key];
    if (nested != null) return nested;
  }

  return payload;
}

function makeState(
  status: SourceMessageContextView['status'],
  overrides: Partial<Omit<SourceMessageContextView, 'status'>> = {},
): SourceMessageContextView {
  return {
    status,
    sourceMessageId: null,
    endpoint: null,
    summary: null,
    details: [],
    note: null,
    error: null,
    ...overrides,
  };
}

function parsePayload(
  payload: unknown,
  endpoint: string,
  sourceMessageId: string,
): SourceMessageContextView {
  const unwrapped = unwrapPayload(payload);
  const summary = collectSummary(unwrapped);
  const details = collectDetails(unwrapped);
  const hasContext =
    isMeaningfulPrimitive(unwrapped) ||
    hasExtraContext(unwrapped) ||
    summary !== null ||
    details.length > 0;

  if (!hasContext && !summary && details.length === 0) {
    return makeState('empty', {
      sourceMessageId,
      endpoint,
      note: 'Context endpoint responded, but it did not return additional evidence beyond the row snapshot.',
    });
  }

  return makeState('ready', {
    sourceMessageId,
    endpoint,
    summary,
    details,
    note: hasContext ? null : 'Context endpoint returned only a minimal payload.',
  });
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function loadSourceMessageContext(
  workItemId: string,
  sourceMessageId: string,
  signal?: AbortSignal,
): Promise<SourceMessageContextView> {
  if (!workItemId.trim() || !sourceMessageId.trim()) {
    return makeState('unavailable', {
      sourceMessageId: sourceMessageId.trim() || null,
      note: 'No source-message context endpoint responded for this row.',
    });
  }

  let lastError: string | null = null;

  const endpoint = buildContextEndpoint(workItemId);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal,
      headers: {
        Accept: 'application/json',
        'x-requested-with': 'work-board-detail-panel',
      },
      credentials: 'same-origin',
    });

    if (response.status === 404 || response.status === 204) {
      return makeState('unavailable', {
        sourceMessageId,
        note: 'No source-message context endpoint responded for this row.',
      });
    }

    if (!response.ok) {
      lastError = `${endpoint} returned ${response.status}`;
    } else {
      const payload = await readJsonResponse(response);
      const parsed = parsePayload(payload, endpoint, sourceMessageId);
      if (parsed.status === 'empty') {
        return parsed;
      }
      return parsed;
    }
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    lastError = error instanceof Error ? error.message : 'Failed to load source message context';
  }

  if (lastError) {
    return makeState('error', {
      sourceMessageId,
      error: lastError,
      note: 'The row metadata snapshot is still shown below.',
    });
  }

  return makeState('unavailable', {
    sourceMessageId,
    note: 'No source-message context endpoint responded for this row.',
  });
}
