import { vereis } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function MijnLayout({ children }: { children: React.ReactNode }) {
  const a = await vereis(undefined, '/mijn');
  if (a.rol === 'beheer') redirect('/beheer');
  return <>{children}</>;
}
