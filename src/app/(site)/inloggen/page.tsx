import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { huidigAccount } from '@/lib/auth';

export const metadata: Metadata = { title: 'Inloggen', robots: { index: false } };
export default async function Inloggen({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const terug = sp.terug && sp.terug.startsWith('/') && !sp.terug.startsWith('//') ? sp.terug : '';
  const a = await huidigAccount();
  if (a) redirect(terug || (a.rol === 'beheer' ? '/beheer' : '/mijn'));
  return (
    <div className="p-narrow" style={{ maxWidth: 520, padding: '40px 26px 64px' }}>
      <h1 className="p-h2" style={{ marginBottom: 18 }}>Inloggen</h1>
      {terug && <p className="p-note" style={{ marginBottom: 16 }}>Log in om verder te gaan. Daarna ga je direct terug naar waar je was.</p>}
      <LoginForm terug={terug} />
    </div>
  );
}
