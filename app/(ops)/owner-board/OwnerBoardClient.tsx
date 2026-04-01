'use client';

import type { CSSProperties, FormEvent } from 'react';
import { useState } from 'react';
import { WorkBoardTable } from '@/components/board/WorkBoardTable';

export function OwnerBoardClient() {
  const [owner, setOwner] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOwnerFilter(owner.trim());
  }

  return (
    <div>
      <section style={controlStripStyle}>
        <div style={controlIntroStyle}>
          <div>
            <p style={eyebrowStyle}>Assignment focus</p>
            <h2 style={titleStyle}>Owner board</h2>
            <p style={descriptionStyle}>
              Filter work items by owner name to focus on assignment and follow-up.
            </p>
          </div>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Control strip</span>
            <strong style={summaryValueStyle}>
              Owner filter narrows the live queue without changing the evidence view.
            </strong>
          </div>
        </div>

        <form onSubmit={applyFilter} style={formStyle}>
          <label style={inputWrapStyle}>
            <span style={inputLabelStyle}>Owner name</span>
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Karthik, Bushra, DSV..."
              aria-label="Owner name"
              style={inputStyle}
            />
          </label>
          <div style={buttonRowStyle}>
            <button type="submit" style={buttonStyle}>
              Apply filter
            </button>
            <button
              type="button"
              onClick={() => {
                setOwner('');
                setOwnerFilter('');
              }}
              style={secondaryButtonStyle}
            >
              Reset
            </button>
          </div>
        </form>

        {ownerFilter ? (
          <div style={activeFilterBarStyle}>
            <span style={activeFilterLabelStyle}>Active owner filter</span>
            <strong style={activeFilterValueStyle}>{ownerFilter}</strong>
          </div>
        ) : (
          <div style={hintBarStyle}>
            No owner filter applied. The board is showing all assigned owners.
          </div>
        )}
      </section>

      <WorkBoardTable title="Owner board" filterOwnerName={ownerFilter || undefined} />
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
  color: '#75623c',
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

const formStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'minmax(260px, 1fr) auto',
  alignItems: 'end',
};

const inputWrapStyle: CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
};

const inputLabelStyle: CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#64748b',
};

const inputStyle: CSSProperties = {
  minWidth: '240px',
  padding: '0.82rem 0.95rem',
  border: '1px solid rgba(148, 163, 184, 0.26)',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.92)',
  color: '#0f172a',
  fontSize: '0.96rem',
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: '0.6rem',
  flexWrap: 'wrap',
};

const buttonStyle: CSSProperties = {
  padding: '0.82rem 1rem',
  border: '1px solid #0f172a',
  borderRadius: '999px',
  background: '#0f172a',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  padding: '0.82rem 1rem',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '999px',
  background: 'rgba(255,255,255,0.88)',
  color: '#334155',
  cursor: 'pointer',
  fontWeight: 700,
};

const activeFilterBarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  alignItems: 'center',
};

const activeFilterLabelStyle: CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#64748b',
};

const activeFilterValueStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.26rem 0.6rem',
  borderRadius: '999px',
  background: 'rgba(15, 118, 110, 0.1)',
  border: '1px solid rgba(15, 118, 110, 0.2)',
  color: '#0f766e',
  fontSize: '0.84rem',
  fontWeight: 700,
};

const hintBarStyle: CSSProperties = {
  fontSize: '0.88rem',
  color: '#64748b',
};
