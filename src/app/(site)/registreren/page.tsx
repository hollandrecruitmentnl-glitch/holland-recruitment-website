import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import RegistratieForm from '@/components/RegistratieForm';
import { huidigAccount } from '@/lib/auth';
import { one } from '@/lib/db';
import { sha256 } from '@/lib/util';

export const metadata: Metadata = { title: 'Gratis account maken', robots: { index: false }, alternates: { canonical: '/registreren' } };

export default async function Registreren({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const a = await huidigAccount();
  const terug = sp.terug && sp.terug.startsWith('/') && !sp.terug.startsWith('//') ? sp.terug : '';
  if (a) redirect(terug || '/mijn');
  let uit: any = null;
  if (sp.uitnodiging) uit = await one(`select u.email, b.naam from bedrijf_uitnodigingen u join bedrijven b on b.id = u.bedrijf_id where u.token_hash = $1 and u.geaccepteerd is null and u.aangemaakt > now() - interval '7 days'`, [sha256(sp.uitnodiging)]);
  return (
    <div className="p-narrow" style={{ maxWidth: sp.rol || sp.uitnodiging ? 620 : 860, padding: '48px 26px 72px' }}>
      {sp.uitnodiging && !uit && <p className="p-err-summary" role="alert" style={{ marginBottom: 16 }}>Deze uitnodiging is verlopen of al gebruikt. Vraag uw collega om een nieuwe uitnodiging.</p>}
      <RegistratieForm rolStart={sp.rol} terug={terug} ctx={sp.ctx} uitnodiging={uit ? sp.uitnodiging : undefined} uitnodigingBedrijf={uit?.naam} uitnodigingEmail={uit?.email} />
    </div>
  );
}
