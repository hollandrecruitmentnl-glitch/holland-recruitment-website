import Link from 'next/link';
import { vereis } from '@/lib/auth';
import { q } from '@/lib/db';
import { OPDRACHT_STATUS } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import { Leeg } from '@/components/Kaarten';

export const metadata = { title: 'Mijn opdrachten', robots: { index: false } };
export default async function MijnOpdrachten({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const a = await vereis('bedrijf');
  const { status = '' } = await searchParams;
  const alle = await q(`select o.id, o.titel, o.slug, o.status, o.status_reden, o.reageren_tot::text, o.bijgewerkt, o.bemiddeling,
      (select count(*) from reacties r where r.opdracht_id = o.id)::int as reacties, (select count(*) from reacties r where r.opdracht_id = o.id and r.status = 'verstuurd')::int as nieuw
    from opdrachten o where o.bedrijf_id = $1 and o.status <> 'verwijderd' order by o.bijgewerkt desc`, [a.bedrijf_id]);
  const tel = (s: string) => alle.filter((o: any) => o.status === s).length;
  const lijst = status ? alle.filter((o: any) => o.status === status) : alle;
  const tabs: [string, string][] = [['', `Alle (${alle.length})`], ['live', `Live (${tel('live')})`], ['in_controle', `In controle (${tel('in_controle')})`], ['concept', `Concept (${tel('concept')})`], ['gesloten', `Gesloten (${tel('gesloten')})`]];
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 64px' }}>
      <div className="p-between" style={{ marginBottom: 16 }}><h1 className="p-h2">Mijn opdrachten</h1><Link className="btn btn-blue" href="/mijn/opdrachten/nieuw">Plaats een opdracht</Link></div>
      <nav className="p-tabs" aria-label="Filter op status">{tabs.map(([s, l]) => <Link key={s} href={s ? `/mijn/opdrachten?status=${s}` : '/mijn/opdrachten'} aria-current={status === s ? 'page' : undefined}>{l}</Link>)}</nav>
      {lijst.length ? (
        <div className="p-table-wrap"><table className="p-table">
          <caption className="sr-only">Mijn opdrachten</caption>
          <thead><tr><th scope="col">Opdracht</th><th scope="col">Status</th><th scope="col">Reacties</th><th scope="col">Reageren tot</th><th scope="col"><span className="sr-only">Acties</span></th></tr></thead>
          <tbody>{lijst.map((o: any) => (
            <tr key={o.id}>
              <td><Link className="p-link" href={o.status === 'concept' || o.status === 'afgewezen' ? `/mijn/opdrachten/${o.id}/bewerken` : `/mijn/opdrachten/${o.id}`}>{o.titel}</Link>{o.bemiddeling && <div className="p-xs p-muted">Met bemiddeling</div>}{o.status === 'afgewezen' && o.status_reden && <div className="p-xs" style={{ color: '#B4331A' }}>Reden: {o.status_reden}</div>}</td>
              <td><span className={`p-status ${o.status}`}>{OPDRACHT_STATUS[o.status]}</span></td>
              <td>{o.reacties}{o.nieuw > 0 && <span className="p-badge" style={{ marginLeft: 6 }}>{o.nieuw} nieuw</span>}</td>
              <td>{o.reageren_tot ? datumNL(o.reageren_tot) : '–'}</td>
              <td><Link className="p-link p-small" href={`/mijn/opdrachten/${o.id}/bewerken`}>{o.status === 'concept' ? 'Verder invullen' : 'Bewerken'}</Link></td>
            </tr>))}</tbody>
        </table></div>
      ) : <Leeg titel={status ? 'Geen opdrachten met deze status' : 'Nog geen opdrachten'} tekst="Plaats een opdracht; freelancers kunnen direct reageren."><Link className="btn btn-blue btn-sm" href="/mijn/opdrachten/nieuw">Plaats een opdracht</Link></Leeg>}
    </div>
  );
}
