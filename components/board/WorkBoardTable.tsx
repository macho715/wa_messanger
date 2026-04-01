'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import type { BoardState } from '@/lib/types/work-item';
import { WorkBoardDetailPanel } from '@/components/board/WorkBoardDetailPanel';
import { formatBoardTimestamp } from '@/components/board/formatBoardTimestamp';
import type { PostgrestError } from '@supabase/supabase-js';

export type WorkItemCard = {
  id: string;
  title: string;
  type_code: string;
  board_state: BoardState;
  event_status: string;
  owner_name: string | null;
  hold_reason: string | null;
  last_message_at: string;
  group_id: string;
  source_message_id: string;
  shipment_ref_id: string | null;
  shipment_label: string;
  meta: WorkItemEvidenceMeta;
};

export type WorkItemEvidenceMeta = {
  linkage_status?: string | null;
  source_event?: string | null;
  source_message_id?: string | null;
  reply_to_message_id?: string | null;
  normalized_text?: string | null;
  summary?: string | null;
  owner_name?: string | null;
  hold_reason?: string | null;
  keywords_hit?: string[] | null;
  shipment_key_candidates?: string[] | null;
};

type ShipmentRefEmbed = {
  canonical_key: string | null;
  hvdc_ref: string | null;
  sct_ship_no: string | null;
} | null;

type PillTone = {
  color: string;
  background: string;
  borderColor: string;
};

function shipmentLabel(
  shipmentRefId: string | null,
  ref: ShipmentRefEmbed,
): string {
  if (!shipmentRefId && !ref) return '—';
  if (ref?.canonical_key) return ref.canonical_key;
  if (ref?.hvdc_ref) return ref.hvdc_ref;
  if (ref?.sct_ship_no) return ref.sct_ship_no;
  if (shipmentRefId) return `${shipmentRefId.slice(0, 8)}…`;
  return '—';
}

function boardStateTone(value: string): PillTone {
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

function eventStatusTone(value: string): PillTone {
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

function statePill(value: string, tone: PillTone): ReactNode {
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
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  );
}

function renderTokenList(values: string[], tone: PillTone): ReactNode {
  if (values.length === 0) {
    return <span style={{ color: '#64748b' }}>—</span>;
  }

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

function holdCellContent(row: WorkItemCard): ReactNode {
  const hasHold = row.board_state === 'HOLD' || Boolean(row.hold_reason?.trim());
  if (!hasHold) {
    return <span style={{ color: '#6b7280' }}>—</span>;
  }
  const tone = boardStateTone('HOLD');
  return (
    <div style={{ display: 'grid', gap: '0.35rem' }}>
      {statePill('HOLD', tone)}
      <span style={{ color: '#334155' }}>{row.hold_reason?.trim() || '—'}</span>
    </div>
  );
}

const MD_MIN = 768;
/** Estimated row height for virtual padding (multiline-safe default). */
const ROW_ESTIMATE_PX = 52;

function useViewportMinMd(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MD_MIN}px)`);
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return wide;
}

type Props = {
  filterBoardState?: BoardState;
  filterOwnerName?: string;
  title: string;
};

type BoardLoadErrorView = {
  headline: string;
  guidance: string;
};

function currentSupabaseHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function describeBoardLoadError(error: Error | PostgrestError | string): BoardLoadErrorView {
  const host = currentSupabaseHost();
  const fallback: BoardLoadErrorView = {
    headline: typeof error === 'string' ? error : error.message,
    guidance:
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for live data, or use dev with Supabase migrations applied.',
  };

  if (typeof error === 'string') {
    return fallback;
  }

  if ('code' in error && error.code === 'PGRST205') {
    const missingRelation =
      error.message.includes("public.work_item") || error.message.includes("public.shipment_ref");
    if (missingRelation) {
      return {
        headline: host
          ? `Connected Supabase project ${host} does not expose public.work_item to PostgREST.`
          : 'Connected Supabase project does not expose public.work_item to PostgREST.',
        guidance:
          'This usually means .env.local points to a different project, or migrations 0001–0004 have not been applied to the current project (or its schema cache is stale).',
      };
    }
  }

  return fallback;
}

const detailEnabled =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DETAIL_PANEL !== '0';

const columnHelper = createColumnHelper<WorkItemCard>();

const columns = [
  columnHelper.accessor('board_state', {
    header: 'Board',
    cell: (info) => statePill(info.getValue(), boardStateTone(info.getValue())),
  }),
  columnHelper.accessor('event_status', {
    header: 'Event',
    cell: (info) => statePill(info.getValue(), eventStatusTone(info.getValue())),
  }),
  columnHelper.accessor('title', {
    header: 'Title',
    cell: (info) => (
      <div style={{ display: 'grid', gap: '0.28rem' }}>
        <strong style={{ fontSize: '0.97rem', lineHeight: 1.25, color: '#0f172a' }}>{info.getValue()}</strong>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          msg {info.row.original.source_message_id.slice(0, 12)}…
        </span>
      </div>
    ),
  }),
  columnHelper.accessor('type_code', {
    header: 'Type',
    cell: (info) => (
      <span style={{ whiteSpace: 'nowrap', color: '#334155', fontWeight: 600 }}>{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('owner_name', {
    header: 'Owner',
    cell: (info) => (
      <span style={{ color: info.getValue() ? '#0f172a' : '#64748b', fontWeight: 600 }}>
        {info.getValue() ?? '—'}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'hold',
    header: 'Hold',
    cell: (info) => holdCellContent(info.row.original),
  }),
  columnHelper.accessor('shipment_label', {
    header: 'Shipment',
    cell: (info) => (
      <span
        style={{ fontSize: '0.83rem', color: '#334155', fontWeight: 600 }}
        title={info.row.original.shipment_ref_id ?? ''}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('last_message_at', {
    header: 'Updated',
    cell: (info) => (
      <span style={{ whiteSpace: 'nowrap' }}>{formatBoardTimestamp(info.getValue())}</span>
    ),
  }),
];

export function WorkBoardTable({ filterBoardState, filterOwnerName, title }: Props) {
  const [rows, setRows] = useState<WorkItemCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(() => new Set());
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const ownerFilter = filterOwnerName?.trim() ?? '';
  const wide = useViewportMinMd();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<Map<string, string>>(new Map());
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const prefersReducedMotionRef = useRef(false);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const colCount = table.getAllLeafColumns().length;

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 12,
    getItemKey: (index) => tableRows[index]?.original.id ?? String(index),
  });

  useEffect(() => {
    prefersReducedMotionRef.current = prefersReducedMotion;
  }, [prefersReducedMotion]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setPrefersReducedMotion(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    if (wide && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [wide]);

  const selectedRow = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;

  useEffect(() => {
    if (selectedId && !rows.some((r) => r.id === selectedId)) {
      setSelectedId(null);
    }
  }, [rows, selectedId]);

  useEffect(() => {
    let cancelled = false;
    let supabase: ReturnType<typeof createBrowserSupabase> | null = null;
    try {
      supabase = createBrowserSupabase();
    } catch (e) {
      const view = describeBoardLoadError(e instanceof Error ? e : 'Supabase env missing');
      setError(`${view.headline}\n${view.guidance}`);
      setReady(true);
      return;
    }

    const load = async () => {
      let q = supabase!
        .from('work_item')
        .select(
          `
          id,
          title,
          type_code,
          board_state,
          event_status,
          owner_name,
          hold_reason,
          last_message_at,
          group_id,
          source_message_id,
          shipment_ref_id,
          meta,
          shipment_ref ( canonical_key, hvdc_ref, sct_ship_no )
        `,
        )
        .order('last_message_at', { ascending: false })
        .limit(200);
      if (filterBoardState) {
        q = q.eq('board_state', filterBoardState);
      }
      if (ownerFilter) {
        q = q.ilike('owner_name', `%${ownerFilter}%`);
      }
      const { data, error: err } = await q;
      if (cancelled) return;
      if (err) {
        const view = describeBoardLoadError(err);
        setError(`${view.headline}\n${view.guidance}`);
      }
      else {
        const normalized = (data ?? []).map((raw: Record<string, unknown>) => {
          const sid = (raw.shipment_ref_id as string | null) ?? null;
          const emb = (raw.shipment_ref ?? null) as ShipmentRefEmbed;
          return {
            id: raw.id as string,
            title: raw.title as string,
            type_code: raw.type_code as string,
            board_state: raw.board_state as BoardState,
            event_status: raw.event_status as string,
            owner_name: raw.owner_name as string | null,
            hold_reason: raw.hold_reason as string | null,
            last_message_at: raw.last_message_at as string,
            group_id: raw.group_id as string,
            source_message_id: raw.source_message_id as string,
            shipment_ref_id: sid,
            shipment_label: shipmentLabel(sid, emb),
            meta: ((raw.meta as Record<string, unknown> | null) ?? {}) as WorkItemEvidenceMeta,
          };
        });

        const nextMap = new Map(normalized.map((r) => [r.id, r.last_message_at]));
        const prev = snapshotRef.current;
        const changed = new Set<string>();
        if (prev.size > 0) {
          for (const [id, ts] of nextMap) {
            if (prev.get(id) !== ts) changed.add(id);
          }
        }
        snapshotRef.current = nextMap;

        if (changed.size > 0 && !prefersReducedMotionRef.current) {
          setFlashIds(changed);
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          flashTimerRef.current = setTimeout(() => setFlashIds(new Set()), 1400);
        } else if (changed.size > 0) {
          setSyncHint(`Updated ${changed.size} row(s)`);
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          flashTimerRef.current = setTimeout(() => setSyncHint(null), 3000);
        }

        setRows(normalized);
      }
      setReady(true);
    };

    void load();

    const channel = supabase
      .channel('work_item_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_item' },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      void supabase?.removeChannel(channel);
    };
  }, [filterBoardState, ownerFilter]);

  const virtualItems = rows.length > 0 ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  const padCellStyle: CSSProperties = {
    height: 0,
    padding: 0,
    border: 'none',
    lineHeight: 0,
    fontSize: 0,
  };

  function openMobileDialog() {
    dialogRef.current?.showModal();
  }

  function closeMobileDialog() {
    dialogRef.current?.close();
  }

  if (!ready && !error) {
    return (
      <div style={loadingCardStyle}>
        <p style={loadingEyebrowStyle}>Live queue</p>
        <h2 style={loadingTitleStyle}>{title}</h2>
        <p style={loadingBodyStyle}>Loading the board surface…</p>
      </div>
    );
  }

  if (error) {
    const [headline, guidance] = error.split('\n', 2);
    return (
      <div style={errorCardStyle}>
        <p style={errorEyebrowStyle}>Live queue blocked</p>
        <h2 style={errorTitleStyle}>{title}</h2>
        <p style={errorHeadlineStyle}>{headline}</p>
        {guidance ? <p style={errorGuidanceStyle}>{guidance}</p> : null}
      </div>
    );
  }

  const tableId = `work-board-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const holdCount = rows.filter((row) => row.board_state === 'HOLD' || Boolean(row.hold_reason?.trim())).length;
  const ownerCount = new Set(rows.map((row) => row.owner_name?.trim()).filter(Boolean)).size;
  const activeFilterPills = [
    filterBoardState ? `Board: ${filterBoardState}` : null,
    ownerFilter ? `Owner contains: ${ownerFilter}` : null,
  ].filter(Boolean) as string[];

  const tableBlock = (
    <div style={{ minWidth: 0, flex: 1, display: 'grid', gap: '0.9rem' }}>
      <div style={tableIntroCardStyle}>
        <div style={tableIntroToplineStyle}>
          <div>
            <p style={tableIntroEyebrowStyle}>Live queue</p>
            <h2 style={tableIntroTitleStyle}>{title}</h2>
          </div>
          <div style={tableStatGridStyle}>
            <div style={tableStatCardStyle}>
              <span style={tableStatLabelStyle}>Rows</span>
              <strong style={tableStatValueStyle}>{rows.length}</strong>
            </div>
            <div style={tableStatCardStyle}>
              <span style={tableStatLabelStyle}>HOLD</span>
              <strong style={tableStatValueStyle}>{holdCount}</strong>
            </div>
            <div style={tableStatCardStyle}>
              <span style={tableStatLabelStyle}>Owners</span>
              <strong style={tableStatValueStyle}>{ownerCount}</strong>
            </div>
          </div>
        </div>
        <p style={tableIntroBodyStyle}>
          Operate the queue first, then inspect evidence and shipment context in the side panel.
        </p>
        {activeFilterPills.length > 0 ? (
          <div style={filterPillRowStyle}>
            {activeFilterPills.map((pill) => (
              <span key={pill} style={filterPillStyle}>
                {pill}
              </span>
            ))}
          </div>
        ) : null}
        {syncHint ? (
          <p role="status" style={syncHintStyle}>
            {syncHint}
          </p>
        ) : null}
      </div>
      <div style={tableSurfaceStyle}>
        <div ref={tableContainerRef} data-testid="work-board-scroll" style={tableScrollStyle}>
          <table
            id={tableId}
            style={tableElementStyle}
          >
            <caption style={tableCaptionStyle}>
              {title} — live work items. Select a row to view details
              {detailEnabled ? '' : ' (detail panel disabled)'}.
            </caption>
            <thead style={tableHeadStyle}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} style={{ textAlign: 'left' }}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} scope="col" style={tableHeaderCellStyle}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={emptyCellStyle}>
                    No work items yet. POST a WAHA group message to `/api/webhooks/waha`.
                  </td>
                </tr>
              ) : (
                <>
                  {paddingTop > 0 ? (
                    <tr aria-hidden>
                      <td colSpan={colCount} style={{ ...padCellStyle, height: paddingTop }} />
                    </tr>
                  ) : null}
                  {virtualItems.map((vr) => {
                    const tableRow = tableRows[vr.index];
                    if (!tableRow) return null;
                    const r = tableRow.original;
                    const selected = selectedId === r.id;
                    const flash = flashIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        data-index={vr.index}
                        ref={(node) => rowVirtualizer.measureElement(node)}
                        style={{
                          borderBottom: '1px solid rgba(226, 232, 240, 0.88)',
                          verticalAlign: 'top',
                          cursor: detailEnabled ? 'pointer' : 'default',
                          background: selected
                            ? 'rgba(15, 23, 42, 0.06)'
                            : flash
                              ? 'rgba(254, 240, 138, 0.32)'
                              : 'transparent',
                          boxShadow: selected ? 'inset 4px 0 0 #0f172a' : undefined,
                          outline: flash ? '2px solid rgba(217, 119, 6, 0.4)' : undefined,
                          transition: prefersReducedMotion
                            ? undefined
                            : 'background 0.35s ease, box-shadow 0.2s ease',
                        }}
                        {...(detailEnabled ? { 'aria-selected': selected } : {})}
                        onClick={detailEnabled ? () => setSelectedId(r.id) : undefined}
                      >
                        {tableRow.getVisibleCells().map((cell) => (
                          <td key={cell.id} style={tableBodyCellStyle}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {paddingBottom > 0 ? (
                    <tr aria-hidden>
                      <td colSpan={colCount} style={{ ...padCellStyle, height: paddingBottom }} />
                    </tr>
                  ) : null}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (!detailEnabled) {
    return tableBlock;
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: wide ? 'minmax(0, 1fr) minmax(280px, 400px)' : '1fr',
          gap: wide ? '1rem' : 0,
          alignItems: 'start',
          padding: wide ? '0 1rem 1rem' : 0,
        }}
      >
        {tableBlock}
        {wide ? (
          <div style={{ position: 'sticky', top: '0.5rem', paddingRight: '0.5rem' }}>
            <WorkBoardDetailPanel row={selectedRow} title="Details" />
          </div>
        ) : null}
      </div>

      {!wide && selectedRow ? (
        <div
          style={mobileDockStyle}
        >
          <span style={mobileDockTitleStyle}>
            {selectedRow.title}
          </span>
          <button type="button" onClick={openMobileDialog} style={floatingBtn}>
            View details
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        style={mobileDialogStyle}
        onClose={() => {}}
      >
        <div style={mobileDialogInnerStyle}>
          <WorkBoardDetailPanel row={selectedRow} title="Details" onClose={closeMobileDialog} />
        </div>
      </dialog>
    </>
  );
}

const floatingBtn: CSSProperties = {
  padding: '0.62rem 0.95rem',
  borderRadius: '999px',
  border: '1px solid #0f172a',
  background: '#0f172a',
  color: '#fff',
  cursor: 'pointer',
  flexShrink: 0,
  fontWeight: 700,
};

const loadingCardStyle: CSSProperties = {
  padding: '1.2rem',
  borderRadius: '20px',
  border: '1px solid rgba(148, 163, 184, 0.26)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248, 245, 238, 0.92) 100%)',
  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
};

const loadingEyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#75623c',
};

const loadingTitleStyle: CSSProperties = {
  margin: '0.3rem 0 0',
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.6rem',
  letterSpacing: '-0.04em',
};

const loadingBodyStyle: CSSProperties = {
  margin: '0.55rem 0 0',
  color: '#475569',
};

const errorCardStyle: CSSProperties = {
  padding: '1.2rem',
  borderRadius: '20px',
  border: '1px solid rgba(239, 68, 68, 0.18)',
  background: 'linear-gradient(180deg, rgba(254, 242, 242, 0.96) 0%, rgba(255,255,255,0.98) 100%)',
  boxShadow: '0 16px 36px rgba(127, 29, 29, 0.06)',
};

const errorEyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#991b1b',
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const errorTitleStyle: CSSProperties = {
  margin: '0.35rem 0 0',
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.5rem',
  letterSpacing: '-0.04em',
  color: '#7f1d1d',
};

const errorHeadlineStyle: CSSProperties = {
  margin: '0.7rem 0 0',
  color: '#7f1d1d',
  lineHeight: 1.5,
  fontWeight: 600,
};

const errorGuidanceStyle: CSSProperties = {
  margin: '0.45rem 0 0',
  color: '#991b1b',
  fontSize: '0.94rem',
  lineHeight: 1.55,
};

const tableIntroCardStyle: CSSProperties = {
  display: 'grid',
  gap: '0.8rem',
  padding: '1.05rem 1.1rem',
  borderRadius: '20px',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248, 245, 238, 0.92) 100%)',
  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
};

const tableIntroToplineStyle: CSSProperties = {
  display: 'grid',
  gap: '0.9rem',
  gridTemplateColumns: 'minmax(0, 1.25fr) minmax(260px, 0.95fr)',
  alignItems: 'start',
};

const tableIntroEyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#75623c',
};

const tableIntroTitleStyle: CSSProperties = {
  margin: '0.25rem 0 0',
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.6rem',
  lineHeight: 1,
  letterSpacing: '-0.04em',
  color: '#0f172a',
};

const tableIntroBodyStyle: CSSProperties = {
  margin: 0,
  color: '#475569',
  lineHeight: 1.55,
};

const tableStatGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '0.55rem',
};

const tableStatCardStyle: CSSProperties = {
  display: 'grid',
  gap: '0.15rem',
  padding: '0.7rem',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.86)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
};

const tableStatLabelStyle: CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#64748b',
};

const tableStatValueStyle: CSSProperties = {
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.1rem',
  lineHeight: 1,
  color: '#0f172a',
};

const filterPillRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.45rem',
};

const filterPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.24rem 0.58rem',
  borderRadius: '999px',
  background: 'rgba(15, 23, 42, 0.08)',
  border: '1px solid rgba(15, 23, 42, 0.12)',
  color: '#334155',
  fontSize: '0.78rem',
  fontWeight: 700,
};

const syncHintStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.84rem',
  color: '#1d4ed8',
  fontWeight: 600,
};

const tableSurfaceStyle: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.22)',
  borderRadius: '22px',
  background: 'rgba(255, 255, 255, 0.94)',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
  overflow: 'hidden',
};

const tableScrollStyle: CSSProperties = {
  maxHeight: 'min(70vh, 720px)',
  overflow: 'auto',
};

const tableElementStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
  tableLayout: 'fixed',
};

const tableCaptionStyle: CSSProperties = {
  textAlign: 'left',
  padding: '0.7rem 1rem 0.55rem',
  color: '#64748b',
  fontSize: '0.82rem',
};

const tableHeadStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  background: 'rgba(248, 250, 252, 0.96)',
  boxShadow: '0 1px 0 rgba(148, 163, 184, 0.24)',
};

const tableHeaderCellStyle: CSSProperties = {
  padding: '0.78rem 0.85rem',
  fontSize: '0.76rem',
  fontWeight: 700,
  color: '#475569',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const tableBodyCellStyle: CSSProperties = {
  padding: '0.82rem 0.85rem',
};

const emptyCellStyle: CSSProperties = {
  padding: '1.2rem',
  color: '#64748b',
};

const mobileDockStyle: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '0.7rem 1rem',
  background: 'rgba(255,255,255,0.94)',
  borderTop: '1px solid rgba(148, 163, 184, 0.22)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.75rem',
  zIndex: 20,
  backdropFilter: 'blur(14px)',
};

const mobileDockTitleStyle: CSSProperties = {
  fontSize: '0.92rem',
  fontWeight: 700,
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const mobileDialogStyle: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.22)',
  borderRadius: '20px',
  padding: 0,
  maxWidth: 'min(100vw - 2rem, 460px)',
  width: '100%',
  background: 'transparent',
};

const mobileDialogInnerStyle: CSSProperties = {
  padding: '1rem',
};
