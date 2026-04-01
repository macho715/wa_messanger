import type { Metadata } from 'next';
import { OwnerBoardClient } from './OwnerBoardClient';

export const metadata: Metadata = {
  title: 'Owner Board',
};

export default function OwnerBoardPage() {
  return <OwnerBoardClient />;
}
