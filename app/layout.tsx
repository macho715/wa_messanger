import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';

const uiFont = Manrope({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'WA Message Ops',
    template: 'WA Message Ops — %s',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${uiFont.variable} ${displayFont.variable}`}
        suppressHydrationWarning
        style={{
          margin: 0,
          fontFamily: 'var(--font-ui), sans-serif',
          color: '#111827',
          backgroundColor: '#f5f4ef',
        }}
      >
        {children}
      </body>
    </html>
  );
}
