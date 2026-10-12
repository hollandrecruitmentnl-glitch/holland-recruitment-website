import { NieuwForm } from '@/components/ResetForms';
export const metadata = { title: 'Nieuw wachtwoord', robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { token = '' } = await searchParams;
  return (
    <div className="p-narrow" style={{ maxWidth: 520, padding: '40px 26px 64px' }}>
      <h1 className="p-h2" style={{ marginBottom: 18 }}>Kies een nieuw wachtwoord</h1>
      <NieuwForm token={token} />
    </div>
  );
}
