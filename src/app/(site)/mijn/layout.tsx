import { vereis } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EmailBanner from '@/components/EmailBanner';

export default async function MijnLayout({ children }: { children: React.ReactNode }) {
  const a = await vereis(undefined, '/mijn');
  if (a.rol === 'beheer') redirect('/beheer');
  return <>{!a.email_bevestigd && <EmailBanner email={a.email} u={a.rol === 'bedrijf'} />}{children}</>;
}
