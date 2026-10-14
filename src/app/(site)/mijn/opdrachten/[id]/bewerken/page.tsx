import { notFound } from 'next/navigation';
import Link from 'next/link';
import { vereis } from '@/lib/auth';
import { q, one } from '@/lib/db';
import OpdrachtForm from '@/components/OpdrachtForm';
import { verwijderConcept } from '@/app/actions/opdrachten';

export const metadata = { title: 'Opdracht bewerken', robots: { index: false } };
export default async function Bewerken({ params }: { params: Promise<{ id: string }> }) {
  const a = await vereis('bedrijf');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const o = await one(`select *, start_datum::text as start_datum, reageren_tot::text as reageren_tot from opdrachten where id = $1 and bedrijf_id = $2 and status not in ('verwijderd')`, [id, a.bedrijf_id]);
  if (!o) notFound();
  if (o.status === 'gesloten' || o.status === 'verlopen') return <div className="p-narrow" style={{ padding: 40 }}><p className="p-note">Deze opdracht is gesloten en kan niet meer worden bewerkt.</p></div>;
  const collegas = await q(`select a.id, a.voornaam || ' ' || a.achternaam as naam from bedrijf_leden bl join accounts a on a.id = bl.account_id where bl.bedrijf_id = $1 and a.status = 'actief'`, [a.bedrijf_id]);
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 64px' }}>
      <p><Link className="p-link p-small" href="/mijn/opdrachten">← Mijn opdrachten</Link></p>
      <div className="p-between" style={{ margin: '10px 0 16px' }}>
        <h1 className="p-h2">{o.status === 'concept' ? 'Concept afmaken' : 'Opdracht bewerken'}</h1>
        {o.status === 'concept' && <form action={verwijderConcept}><input type="hidden" name="id" value={o.id} /><button className="btn btn-danger btn-sm">Concept verwijderen</button></form>}
      </div>
      {o.status === 'afgewezen' && <p className="p-err-summary" style={{ marginBottom: 16 }}><strong>Niet geplaatst.</strong> Reden: {o.status_reden}. Pas de opdracht aan en dien hem opnieuw in.</p>}
      {o.status === 'live' && <p className="p-note" style={{ marginBottom: 16 }}>Deze opdracht staat live. Reacties blijven gekoppeld; freelancers die reageerden krijgen een melding van uw wijziging.</p>}
      <OpdrachtForm o={o} collegas={collegas as any} bedrijfNaam={a.bedrijf_naam || ''} telefoon={a.telefoon || ''} />
    </div>
  );
}
