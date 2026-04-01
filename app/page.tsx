import Link from 'next/link';
import type { CSSProperties } from 'react';
import { PageShell } from '@/components/board/PageShell';

const routeCards = [
  {
    href: '/work-board',
    eyebrow: 'Queue',
    title: 'All Work Board',
    description:
      'See the full live queue first, with board state, owner, hold, event, and shipment context in one surface.',
    footnote: 'Broadest operational view',
    accent: '#0f172a',
    tint: 'linear-gradient(180deg, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0.02) 100%)',
  },
  {
    href: '/owner-board',
    eyebrow: 'Assignment',
    title: 'Owner Board',
    description:
      'Collapse the queue around named owners and follow-up responsibility without changing the main board contract.',
    footnote: 'Best for daily ownership review',
    accent: '#0f766e',
    tint: 'linear-gradient(180deg, rgba(15, 118, 110, 0.09) 0%, rgba(15, 118, 110, 0.02) 100%)',
  },
  {
    href: '/hold',
    eyebrow: 'Exception',
    title: 'HOLD Board',
    description:
      'Bring blocked items, waiting reasons, and unresolved execution friction to the front of the operating rhythm.',
    footnote: 'Best for unblock loops',
    accent: '#9a3412',
    tint: 'linear-gradient(180deg, rgba(154, 52, 18, 0.1) 0%, rgba(154, 52, 18, 0.02) 100%)',
  },
];

const operatingNotes = [
  {
    label: 'Primary rhythm',
    value: 'Triage the full queue, narrow to owners, then clear HOLD friction.',
  },
  {
    label: 'Layout stance',
    value: 'Compact nav, framed header, breathable work surface.',
  },
  {
    label: 'Motion rule',
    value: 'Feedback-heavy and low-drama. No cinematic transitions.',
  },
];

export default function HomePage() {
  return (
    <PageShell
      eyebrow="WA Message Ops"
      title="Operations tower"
      description="Move between the full queue, ownership review, and HOLD follow-up without changing the shell contract. The redesign keeps the surface light, enterprise, and evidence-first."
    >
      <div style={homeLayoutStyle}>
        <div style={cardGridStyle}>
          {routeCards.map((card) => (
            <Link key={card.href} href={card.href} style={{ ...cardStyle, background: card.tint }}>
              <span style={{ ...cardEyebrowStyle, color: card.accent }}>{card.eyebrow}</span>
              <strong style={cardTitleStyle}>{card.title}</strong>
              <p style={cardBodyStyle}>{card.description}</p>
              <div style={cardMetaRowStyle}>
                <span style={cardFootnoteStyle}>{card.footnote}</span>
                <span style={{ ...cardArrowStyle, color: card.accent }}>Open view →</span>
              </div>
            </Link>
          ))}
        </div>

        <aside style={briefPanelStyle} aria-label="Operating brief">
          <p style={briefEyebrowStyle}>Operating brief</p>
          <h2 style={briefTitleStyle}>Design direction anchored to task flow, not marketing theater.</h2>
          <div style={briefGridStyle}>
            {operatingNotes.map((note) => (
              <div key={note.label} style={briefItemStyle}>
                <span style={briefLabelStyle}>{note.label}</span>
                <strong style={briefValueStyle}>{note.value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

const homeLayoutStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'minmax(0, 1.8fr) minmax(280px, 0.95fr)',
  alignItems: 'start',
};

const cardGridStyle: CSSProperties = {
  display: 'grid',
  gap: '0.9rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
};

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: '0.65rem',
  padding: '1.15rem',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '20px',
  textDecoration: 'none',
  color: '#0f172a',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.07)',
  minHeight: '220px',
};

const cardEyebrowStyle: CSSProperties = {
  fontSize: '0.76rem',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  fontWeight: 700,
};

const cardTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.45rem',
  lineHeight: 1.05,
  letterSpacing: '-0.04em',
};

const cardBodyStyle: CSSProperties = {
  margin: 0,
  color: '#475569',
  lineHeight: 1.58,
};

const cardMetaRowStyle: CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  alignItems: 'end',
};

const cardFootnoteStyle: CSSProperties = {
  fontSize: '0.82rem',
  color: '#64748b',
};

const cardArrowStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: '0.88rem',
};

const briefPanelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.8rem',
  padding: '1.15rem',
  borderRadius: '20px',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248, 245, 238, 0.92) 100%)',
  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
};

const briefEyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.76rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: '#75623c',
};

const briefTitleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: '1.35rem',
  lineHeight: 1.12,
  letterSpacing: '-0.04em',
  color: '#0f172a',
};

const briefGridStyle: CSSProperties = {
  display: 'grid',
  gap: '0.8rem',
};

const briefItemStyle: CSSProperties = {
  display: 'grid',
  gap: '0.18rem',
  paddingBottom: '0.8rem',
  borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
};

const briefLabelStyle: CSSProperties = {
  fontSize: '0.76rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#64748b',
};

const briefValueStyle: CSSProperties = {
  fontSize: '0.97rem',
  lineHeight: 1.45,
  color: '#1e293b',
};
