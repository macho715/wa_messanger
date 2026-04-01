import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { WorkBoardTable } from '@/components/board/WorkBoardTable';

export const metadata: Metadata = {
  title: 'HOLD Board',
};

export default function HoldBoardPage() {
  return (
    <div>
      <section style={controlStripStyle}>
        <div style={controlIntroStyle}>
          <div>
            <p style={eyebrowStyle}>Exception focus</p>
            <h2 style={titleStyle}>HOLD board</h2>
            <p style={descriptionStyle}>
              Surface blocked work, waiting reasons, and unresolved execution friction before it disappears inside the larger queue.
            </p>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Control strip</span>
            <strong style={summaryValueStyle}>
              This view hard-filters the queue to HOLD-state work and keeps unblock loops visible.
            </strong>
          </div>
        </div>

        <div style={holdSignalRowStyle}>
          <span style={holdSignalPillStyle}>Board filter: HOLD</span>
          <span style={holdHintStyle}>
            Use this board to resolve waiting reasons first, then return items to owner flow.
          </span>
        </div>
      </section>

      <WorkBoardTable title="HOLD board" filterBoardState="HOLD" />
    </div>
  );
}

const controlStripStyle: CSSProperties = {
  margin: '0 1rem 1rem',
  padding: '1.05rem 1.1rem',
  borderRadius: '20px',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248, 245, 238, 0.92) 100%)',
  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
  display: 'grid',
  gap: '0.95rem',
};

const controlIntroStyle: CSSProperties = {
  display: 'grid',
  gap: '0.9rem',
  gridTemplateColumns: 'minmax(0, 1.3fr) minmax(260px, 0.9fr)',
  alignItems: 'start',
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#9a3412',
};

const titleStyle: CSSProperties = {
  margin: '0.25rem 0 0',
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.55rem',
  lineHeight: 1,
  letterSpacing: '-0.04em',
  color: '#0f172a',
};

const descriptionStyle: CSSProperties = {
  margin: '0.55rem 0 0',
  color: '#475569',
  lineHeight: 1.58,
  maxWidth: '58ch',
};

const summaryCardStyle: CSSProperties = {
  display: 'grid',
  gap: '0.2rem',
  padding: '0.85rem',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.82)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
};

const summaryLabelStyle: CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#64748b',
};

const summaryValueStyle: CSSProperties = {
  color: '#0f172a',
  fontSize: '0.94rem',
  lineHeight: 1.45,
};

const holdSignalRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.6rem',
  alignItems: 'center',
};

const holdSignalPillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.26rem 0.6rem',
  borderRadius: '999px',
  background: 'rgba(249, 115, 22, 0.1)',
  border: '1px solid rgba(249, 115, 22, 0.2)',
  color: '#9a3412',
  fontSize: '0.84rem',
  fontWeight: 700,
};

const holdHintStyle: CSSProperties = {
  fontSize: '0.88rem',
  color: '#64748b',
};
