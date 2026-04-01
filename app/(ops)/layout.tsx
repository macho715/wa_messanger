import { PageShell } from '@/components/board/PageShell';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      eyebrow="Operations"
      title="Operations Tower"
      description="Shared shell for All Work, Owner, and HOLD views. Move from queue scan to owner follow-up and unblock loops without changing the evidence-first contract."
    >
      {children}
    </PageShell>
  );
}
