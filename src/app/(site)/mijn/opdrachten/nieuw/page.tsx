import { vereis } from '@/lib/auth';
import { q } from '@/lib/db';
import OpdrachtForm from '@/components/OpdrachtForm';

export const metadata = { title: 'Opdracht plaatsen', robots: { index: false } };
export default async function Nieuw() {
  const a = await vereis('bedrijf', '/mijn/opdrachten/nieuw');
  const collegas = await q(`select a.id, a.voornaam || ' ' || a.achternaam as naam from bedrijf_leden bl join accounts a on a.id = bl.account_id where bl.bedrijf_id = $1 and a.status = 'actief' order by (a.id = $2) desc, a.voornaam`, [a.bedrijf_id, a.id]);
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 64px' }}>
      <h1 className="p-h2" style={{ marginBottom: 6 }}>Plaats een opdracht</h1>
      <p className="p-muted" style={{ marginBottom: 20 }}>Uw concept wordt automatisch opgeslagen. Na indienen controleren we de opdracht; daarna is hij zichtbaar voor freelancers.</p>
      <OpdrachtForm collegas={collegas as any} bedrijfNaam={a.bedrijf_naam || ''} telefoon={a.telefoon || ''} />
    </div>
  );
}
