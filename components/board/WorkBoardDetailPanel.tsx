import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import type { WorkItemCard } from '@/components/board/WorkBoardTable';
import {
  loadSourceMessageContext,
  type SourceMessageContextView,
} from '@/components/board/sourceMessageContext';
import { formatBoardTimestamp } from '@/components/board/formatBoardTimestamp';

type Props = {
  row: WorkItemCard | null;
  onClose?: () => void;
  title?: string;
};

const panelStyle: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: '22px',
  padding: '1rem',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248, 245, 238, 0.94) 100%)',
  minHeight: '300px',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.07)',
};

const dtStyle: CSSProperties = {
  fontWeight: 700,
  color: '#475569',
  padding: '0.35rem 0.75rem 0.35rem 0',
  verticalAlign: 'top',
  width: '40%',
  fontSize: '0.76rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const ddStyle: CSSProperties = {
  padding: '0.35rem 0',
  margin: 0,
  wordBreak: 'break-word',
  color: '#0f172a',
};

const panelSectionStyle: CSSProperties = {
  marginTop: '0.95rem',
  padding: '0.9rem',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.8)',
};

const panelSectionTitleStyle: CSSProperties = {
  margin: '0 0 0.4rem',
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#0f172a',
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: '#6b7280',
  fontSize: '0.9rem',
};

const errorTextStyle: CSSProperties = {
  margin: 0,
  color: '#b91c1c',
  fontSize: '0.9rem',
};

const contextBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  marginBottom: '0.5rem',
  padding: '0.16rem 0.52rem',
  borderRadius: '999px',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'rgba(255,255,255,0.92)',
  color: '#475569',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

function boardStateTone(value: string) {
  switch (value) {
    case 'DONE':
      return { color: '#166534', background: 'rgba(34, 197, 94, 0.12)', borderColor: 'rgba(34, 197, 94, 0.22)' };
    case 'HOLD':
      return { color: '#9a3412', background: 'rgba(249, 115, 22, 0.12)', borderColor: 'rgba(249, 115, 22, 0.26)' };
    case 'IN_PROGRESS':
      return { color: '#0f766e', background: 'rgba(20, 184, 166, 0.11)', borderColor: 'rgba(20, 184, 166, 0.22)' };
    case 'ASSIGNED':
      return { color: '#1d4ed8', background: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.22)' };
    default:
      return { color: '#475569', background: 'rgba(148, 163, 184, 0.12)', borderColor: 'rgba(148, 163, 184, 0.22)' };
  }
}

function eventStatusTone(value: string) {
  if (value.includes('DONE') || value.includes('COMPLETE') || value.includes('RELEASE')) {
    return { color: '#166534', background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.22)' };
  }
  if (value.includes('HOLD') || value.includes('WAIT') || value.includes('BLOCK')) {
    return { color: '#9a3412', background: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.24)' };
  }
  if (value.includes('PROGRESS') || value.includes('ONGOING') || value.includes('PROCESS')) {
    return { color: '#0f766e', background: 'rgba(20, 184, 166, 0.1)', borderColor: 'rgba(20, 184, 166, 0.22)' };
  }
  return { color: '#334155', background: 'rgba(226, 232, 240, 0.88)', borderColor: 'rgba(148, 163, 184, 0.22)' };
}

function statusPill(value: string, tone: { color: string; background: string; borderColor: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.24rem 0.58rem',
        borderRadius: '999px',
        border: `1px solid ${tone.borderColor}`,
        background: tone.background,
        color: tone.color,
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  );
}

function tokenList(values: string[], tone: { color: string; background: string; borderColor: string }) {
  if (values.length === 0) return <span style={{ color: '#64748b' }}>—</span>;
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {values.map((value) => (
        <span
          key={value}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.16rem 0.5rem',
            borderRadius: '999px',
            border: `1px solid ${tone.borderColor}`,
            background: tone.background,
            color: tone.color,
            fontSize: '0.74rem',
            fontWeight: 600,
          }}
        >
          {value}
        </span>
      ))}
    </span>
  );
}

function createIdleContextState(
  status: SourceMessageContextView['status'] = 'idle',
  sourceMessageId: string | null = null,
): SourceMessageContextView {
  return {
    status,
    sourceMessageId,
    endpoint: null,
    summary: null,
    details: [],
    note: null,
    error: null,
  };
}

export function WorkBoardDetailPanel({ row, onClose, title = 'Details' }: Props) {
  const [sourceContext, setSourceContext] = useState<SourceMessageContextView>(() =>
    createIdleContextState(),
  );

  useEffect(() => {
    if (!row?.source_message_id) {
      setSourceContext(createIdleContextState());
      return;
    }

    const controller = new AbortController();
    setSourceContext(createIdleContextState('loading', row.source_message_id));

    void loadSourceMessageContext(row.id, row.source_message_id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setSourceContext(result);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSourceContext({
          status: 'error',
          sourceMessageId: row.source_message_id,
          endpoint: null,
          summary: null,
          details: [],
          note: 'The row metadata snapshot is still shown below.',
          error: error instanceof Error ? error.message : 'Failed to load source message context',
        });
      });

    return () => {
      controller.abort();
    };
  }, [row?.source_message_id]);

  if (!row) {
    return (
      <aside style={panelStyle} aria-label={title}>
        <p style={emptyEyebrowStyle}>Details</p>
        <h2 style={emptyTitleStyle}>{title}</h2>
        <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>
          Select a row to inspect board state, shipment linkage, and evidence-backed context.
        </p>
        <div style={emptyGuideGridStyle}>
          <div style={emptyGuideCardStyle}>
            <span style={emptyGuideLabelStyle}>1. Queue</span>
            <strong style={emptyGuideValueStyle}>Scan state, event, and owner before drilling into evidence.</strong>
          </div>
          <div style={emptyGuideCardStyle}>
            <span style={emptyGuideLabelStyle}>2. Evidence</span>
            <strong style={emptyGuideValueStyle}>Open live source-message context to confirm why the card exists.</strong>
          </div>
          <div style={emptyGuideCardStyle}>
            <span style={emptyGuideLabelStyle}>3. Resolve</span>
            <strong style={emptyGuideValueStyle}>Treat HOLD reason and shipment linkage as the unblock frame.</strong>
          </div>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} style={{ ...closeBtn, marginTop: '0.9rem' }}>
            Close
          </button>
        ) : null}
      </aside>
    );
  }

  const holdVisible = row.board_state === 'HOLD' || Boolean(row.hold_reason?.trim());
  const evidenceSummary = row.meta.summary?.trim() || row.meta.normalized_text?.trim() || null;
  const evidenceKeywords = (row.meta.keywords_hit ?? []).filter(Boolean);
  const shipmentCandidates = (row.meta.shipment_key_candidates ?? []).filter(Boolean);
  const linkageStatus = row.meta.linkage_status ?? 'UNRESOLVED';
  const replyToMessageId = row.meta.reply_to_message_id ?? null;
  const boardTone = boardStateTone(row.board_state);
  const eventTone = eventStatusTone(row.event_status);
  const activeContext =
    sourceContext.sourceMessageId === row.source_message_id
      ? sourceContext
      : createIdleContextState('loading', row.source_message_id);
  const contextStateLabel =
    activeContext.status === 'ready'
      ? 'Live source-message context'
      : activeContext.status === 'loading'
        ? 'Loading source-message context'
        : activeContext.status === 'empty'
          ? 'No extra context'
          : activeContext.status === 'unavailable'
            ? 'Context endpoint unavailable'
            : activeContext.status === 'error'
              ? 'Context fetch error'
              : 'Context idle';

  return (
    <aside style={panelStyle} aria-label={`${title}: ${row.title}`}>
      <div style={headerWrapStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={detailEyebrowStyle}>{title}</p>
          <h2 style={detailTitleStyle}>{row.title}</h2>
          <div style={detailPillRowStyle}>
            {statusPill(row.board_state, boardTone)}
            {statusPill(row.event_status, eventTone)}
            {holdVisible ? statusPill('HOLD reason', boardStateTone('HOLD')) : null}
          </div>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} style={closeBtn} aria-label="Close details">
            Close
          </button>
        ) : null}
      </div>
      <div style={factGridStyle}>
        <div style={factCardStyle}>
          <span style={factLabelStyle}>Owner</span>
          <strong style={factValueStyle}>{row.owner_name ?? '—'}</strong>
        </div>
        <div style={factCardStyle}>
          <span style={factLabelStyle}>Shipment</span>
          <strong style={factValueStyle}>{row.shipment_label}</strong>
        </div>
        <div style={factCardStyle}>
          <span style={factLabelStyle}>Last message</span>
          <strong style={factValueStyle}>{formatBoardTimestamp(row.last_message_at)}</strong>
        </div>
        <div style={factCardStyle}>
          <span style={factLabelStyle}>Group</span>
          <strong style={{ ...factValueStyle, fontSize: '0.85rem' }}>{row.group_id}</strong>
        </div>
      </div>

      {holdVisible ? (
        <section style={holdBannerStyle} aria-label="Hold reason">
          <span style={holdBannerLabelStyle}>HOLD reason</span>
          <strong style={holdBannerValueStyle}>{row.hold_reason?.trim() || '—'}</strong>
        </section>
      ) : null}

      <section style={panelSectionStyle} aria-label="Source message context">
        <div style={contextBadgeStyle}>{contextStateLabel}</div>
        <h3 style={panelSectionTitleStyle}>Source message context</h3>
        {activeContext.status === 'loading' ? (
          <p style={mutedTextStyle}>
            Loading live context for message <code>{row.source_message_id}</code>…
          </p>
        ) : null}
        {activeContext.status === 'error' ? (
          <p style={errorTextStyle}>{activeContext.error ?? 'Failed to load source message context.'}</p>
        ) : null}
        {activeContext.status === 'empty' || activeContext.status === 'unavailable' ? (
          <p style={mutedTextStyle}>{activeContext.note ?? 'No extra context returned.'}</p>
        ) : null}
        {activeContext.status === 'ready' ? (
          <div style={{ display: 'grid', rowGap: '0.55rem' }}>
            {activeContext.summary ? (
              <p style={mutedTextStyle}>{activeContext.summary}</p>
            ) : null}
            {activeContext.note ? <p style={mutedTextStyle}>{activeContext.note}</p> : null}
            {activeContext.endpoint ? (
              <p style={{ ...mutedTextStyle, fontSize: '0.8rem' }}>Endpoint: {activeContext.endpoint}</p>
            ) : null}
            {activeContext.details.length > 0 ? (
              <dl style={{ margin: 0, display: 'grid', rowGap: '0.15rem' }}>
                {activeContext.details.map((detail) => (
                  <div key={`${detail.label}:${detail.value}`} style={{ display: 'contents' }}>
                    <dt style={dtStyle}>{detail.label}</dt>
                    <dd style={ddStyle}>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}
      </section>

      <section style={panelSectionStyle} aria-label="Row meta fallback">
        <h3 style={panelSectionTitleStyle}>Row meta fallback</h3>
        <p style={mutedTextStyle}>
          This snapshot remains visible when the source-message context endpoint is missing, empty,
          or returns no additional evidence.
        </p>
        <dl style={{ margin: '0.65rem 0 0', display: 'grid', rowGap: '0.15rem' }}>
          <div style={{ display: 'contents' }}>
            <dt style={dtStyle}>Evidence source</dt>
            <dd style={ddStyle}>
              <div>message_id: {row.source_message_id}</div>
              <div>linkage: {linkageStatus}</div>
              <div>event: {row.meta.source_event ?? '—'}</div>
              <div>reply_to: {replyToMessageId ?? '—'}</div>
            </dd>
          </div>
          <div style={{ display: 'contents' }}>
            <dt style={dtStyle}>Evidence snapshot</dt>
            <dd style={ddStyle}>{evidenceSummary ?? '—'}</dd>
          </div>
          <div style={{ display: 'contents' }}>
            <dt style={dtStyle}>Keywords</dt>
            <dd style={ddStyle}>{tokenList(evidenceKeywords, eventTone)}</dd>
          </div>
          <div style={{ display: 'contents' }}>
            <dt style={dtStyle}>Shipment candidates</dt>
            <dd style={ddStyle}>{tokenList(shipmentCandidates, boardTone)}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}

const closeBtn: CSSProperties = {
  padding: '0.42rem 0.8rem',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.88)',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#334155',
};

const emptyEyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#75623c',
};

const emptyTitleStyle: CSSProperties = {
  margin: '0.3rem 0 0.45rem',
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.45rem',
  letterSpacing: '-0.04em',
  color: '#0f172a',
};

const emptyGuideGridStyle: CSSProperties = {
  display: 'grid',
  gap: '0.6rem',
  marginTop: '0.95rem',
};

const emptyGuideCardStyle: CSSProperties = {
  display: 'grid',
  gap: '0.16rem',
  padding: '0.78rem 0.82rem',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.84)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
};

const emptyGuideLabelStyle: CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#75623c',
  fontWeight: 700,
};

const emptyGuideValueStyle: CSSProperties = {
  color: '#0f172a',
  fontSize: '0.92rem',
  lineHeight: 1.45,
};

const headerWrapStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'start',
  gap: '0.7rem',
};

const detailEyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#75623c',
};

const detailTitleStyle: CSSProperties = {
  margin: '0.28rem 0 0',
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.55rem',
  lineHeight: 1.02,
  letterSpacing: '-0.05em',
  color: '#0f172a',
};

const detailPillRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.4rem',
  marginTop: '0.7rem',
};

const factGridStyle: CSSProperties = {
  display: 'grid',
  gap: '0.65rem',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  marginTop: '0.9rem',
};

const factCardStyle: CSSProperties = {
  display: 'grid',
  gap: '0.18rem',
  padding: '0.78rem',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.84)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
};

const factLabelStyle: CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#64748b',
};

const factValueStyle: CSSProperties = {
  color: '#0f172a',
  fontSize: '0.94rem',
  lineHeight: 1.35,
};

const holdBannerStyle: CSSProperties = {
  marginTop: '0.95rem',
  display: 'grid',
  gap: '0.25rem',
  padding: '0.9rem',
  borderRadius: '16px',
  border: '1px solid rgba(249, 115, 22, 0.24)',
  background: 'rgba(255, 237, 213, 0.72)',
};

const holdBannerLabelStyle: CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#9a3412',
};

const holdBannerValueStyle: CSSProperties = {
  color: '#7c2d12',
  fontSize: '0.96rem',
  lineHeight: 1.45,
};
