import Link from 'next/link';
import { vereis } from '@/lib/auth';
import { one } from '@/lib/db';
import { uitloggen } from '@/app/actions/auth';
import BeheerNav from './BeheerNav';

export const metadata = { title: { default: 'Beheer', template: '%s · Beheer' }, robots: { index: false, follow: false } };

export default async function BeheerLayout({ children }: { children: React.ReactNode }) {
  const a = await vereis('beheer', '/beheer');
  const t = await one(`select (select count(*) from opdrachten where status = 'in_controle')::int as controle, (select count(*) from meldingen where status = 'open')::int as meldingen, (select count(*) from bemiddeling where status = 'nieuw')::int as bemiddeling`);
  return (
    <div className="p-admin">
      <aside className="p-side" aria-label="Beheer">
        <Link href="/beheer" className="p-side-brand">Holland Recruitment<br /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-on-dark)' }}>Beheer</span></Link>
        <BeheerNav tellers={t} />
        <div style={{ marginTop: 'auto', paddingTop: 18, fontSize: 13, color: 'var(--muted-on-dark)' }}>
          <div style={{ padding: '0 12px 8px' }}>{a.voornaam} {a.achternaam}</div>
          <a href="/">Naar de website</a>
          <form action={uitloggen}><button type="submit" style={{ background: 'none', border: 0, color: 'var(--muted-on-dark)', padding: '10px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 14.5 }}>Uitloggen</button></form>
        </div>
      </aside>
      <main id="inhoud" className="p-admin-main">{children}</main>
    </div>
  );
}
