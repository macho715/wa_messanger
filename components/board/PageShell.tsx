import type { CSSProperties, ReactNode } from 'react';
import { OpsNav } from './OpsNav';

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function PageShell({ eyebrow, title, description, children }: Props) {
  return (
    <div style={shellStyle}>
      <div aria-hidden style={ambientGlowPrimaryStyle} />
      <div aria-hidden style={ambientGlowSecondaryStyle} />
      <OpsNav />
      <main style={mainStyle}>
        <section style={heroStyle}>
          <div style={heroToplineStyle}>
            <p style={eyebrowStyle}>{eyebrow}</p>
            <span style={heroBadgeStyle}>Evidence-linked operations</span>
          </div>
          <div style={heroGridStyle}>
            <div style={copyColumnStyle}>
              <h1 style={titleStyle}>{title}</h1>
              <p style={descriptionStyle}>{description}</p>
            </div>
            <aside style={signalPanelStyle} aria-label="Shell profile">
              <p style={signalKickerStyle}>Shell profile</p>
              <div style={signalGridStyle}>
                <div style={signalCardStyle}>
                  <span style={signalLabelStyle}>Tone</span>
                  <strong style={signalValueStyle}>Calm, light, operational</strong>
                </div>
                <div style={signalCardStyle}>
                  <span style={signalLabelStyle}>Flow</span>
                  <strong style={signalValueStyle}>Queue to owner to hold</strong>
                </div>
                <div style={signalCardStyle}>
                  <span style={signalLabelStyle}>Motion</span>
                  <strong style={signalValueStyle}>Feedback, not theater</strong>
                </div>
              </div>
            </aside>
          </div>
        </section>
        <section style={contentStyle}>{children}</section>
      </main>
    </div>
  );
}

const shellStyle: CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  background:
    'radial-gradient(circle at top right, rgba(180, 145, 83, 0.18), transparent 24%), radial-gradient(circle at left 14%, rgba(15, 23, 42, 0.09), transparent 30%), linear-gradient(180deg, #f3efe7 0%, #fbfaf7 46%, #ffffff 100%)',
  overflow: 'hidden',
};

const ambientGlowPrimaryStyle: CSSProperties = {
  position: 'absolute',
  top: '-9rem',
  right: '-6rem',
  width: '22rem',
  height: '22rem',
  borderRadius: '999px',
  background: 'radial-gradient(circle, rgba(212, 176, 113, 0.22) 0%, rgba(212, 176, 113, 0) 70%)',
  pointerEvents: 'none',
};

const ambientGlowSecondaryStyle: CSSProperties = {
  position: 'absolute',
  left: '-8rem',
  top: '9rem',
  width: '18rem',
  height: '18rem',
  borderRadius: '999px',
  background: 'radial-gradient(circle, rgba(15, 23, 42, 0.08) 0%, rgba(15, 23, 42, 0) 68%)',
  pointerEvents: 'none',
};

const mainStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '1.4rem 1rem 2.5rem',
  display: 'grid',
  gap: '1.15rem',
};

const heroStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  padding: '1.45rem',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '24px',
  background: 'linear-gradient(160deg, rgba(255,255,255,0.93) 0%, rgba(255,255,255,0.84) 100%)',
  boxShadow: '0 18px 48px rgba(15, 23, 42, 0.08)',
  backdropFilter: 'blur(12px)',
};

const heroToplineStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.65rem',
  justifyContent: 'space-between',
};

const heroGridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  alignItems: 'stretch',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
};

const copyColumnStyle: CSSProperties = {
  display: 'grid',
  alignContent: 'start',
  gap: '0.4rem',
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#75623c',
  fontSize: '0.76rem',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display), sans-serif',
  fontSize: 'clamp(2.1rem, 4vw, 3.4rem)',
  lineHeight: 0.96,
  letterSpacing: '-0.05em',
  color: '#0f172a',
  maxWidth: '12ch',
};

const descriptionStyle: CSSProperties = {
  margin: '0.7rem 0 0',
  maxWidth: '62ch',
  color: '#475569',
  lineHeight: 1.6,
  fontSize: '1rem',
};

const heroBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.28rem 0.65rem',
  borderRadius: '999px',
  border: '1px solid rgba(117, 98, 60, 0.22)',
  background: 'rgba(117, 98, 60, 0.08)',
  color: '#594929',
  fontSize: '0.78rem',
  fontWeight: 700,
};

const signalPanelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.9rem',
  padding: '1rem',
  borderRadius: '18px',
  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%)',
  color: '#f8fafc',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
};

const signalKickerStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(226, 232, 240, 0.76)',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const signalGridStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
};

const signalCardStyle: CSSProperties = {
  display: 'grid',
  gap: '0.2rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
};

const signalLabelStyle: CSSProperties = {
  color: 'rgba(191, 219, 254, 0.74)',
  fontSize: '0.74rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

const signalValueStyle: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  lineHeight: 1.35,
};

const contentStyle: CSSProperties = {
  minWidth: 0,
};
