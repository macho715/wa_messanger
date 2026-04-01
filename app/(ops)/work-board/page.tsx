import type { Metadata } from 'next';
import { WorkBoardTable } from '@/components/board/WorkBoardTable';

export const metadata: Metadata = {
  title: 'Work Board',
};

export default function WorkBoardPage() {
  return <WorkBoardTable title="All work items" />;
}
