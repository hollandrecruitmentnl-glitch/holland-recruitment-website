import Link from 'next/link';
import { huidigAccount } from '@/lib/auth';
export const metadata = { title: 'Geen toegang', robots: { index: false } };
export default async function Page() {
  const a = await huidigAccount();
  return (
    <div className="p-narrow" style={{ maxWidth: 620, padding: '48px 26px 72px' }}>
      <h1 className="p-h2" style={{ marginBottom: 10 }}>Deze pagina is niet voor jouw account</h1>
      <p style={{ marginBottom: 16 }}>Je bent ingelogd als {a?.rol === 'bedrijf' ? 'bedrijf' : a?.rol === 'freelancer' ? 'freelancer' : 'beheerder'}. Deze pagina hoort bij een ander soort account.</p>
      <Link className="btn btn-blue" href={a?.rol === 'beheer' ? '/beheer' : '/mijn'}>Naar mijn overzicht</Link>
    </div>
  );
}
