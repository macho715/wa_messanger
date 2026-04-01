import { PageShell } from '@/components/board/PageShell';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      eyebrow="Operations"
      title="Operations Tower"
      description="Shared shell for All Work, Owner, and HOLD views. Use route-specific copy to move from queue scan to follow-up and unblock loops without losing the evidence-first contract."
    >
      {children}
    </PageShell>
  );
}
