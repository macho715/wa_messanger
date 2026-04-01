import { PageShell } from '@/components/board/PageShell';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      eyebrow="Operations"
      title="Message Work Board"
      description="Shared shell for All Work, Owner, and HOLD views. Master-detail content can slot in beneath this frame without changing the navigation contract."
    >
      {children}
    </PageShell>
  );
}
