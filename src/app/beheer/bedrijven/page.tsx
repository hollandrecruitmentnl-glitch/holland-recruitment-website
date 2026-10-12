import Link from 'next/link';
import { q } from '@/lib/db';
import { datumNL } from '@/lib/util';

export const metadata = { title: 'Bedrijven' };
export default async function Bedrijven({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { zoek = '', status = '' } = await searchParams;
  const p: unknown[] = []; const w: string[] = [];
  if (zoek) { p.push(`%${zoek.toLowerCase()}%`); w.push(`(lower(b.naam) like $${p.length} or b.kvk like $${p.length})`); }
  if (status === 'actief' || status === 'geblokkeerd') { p.push(status); w.push(`b.status = $${p.length}`); }
  if (status === 'kvk') w.push(`coalesce(b.kvk_controle_resultaat,'') <> 'actief'`);
  const rows = await q(`select b.*, (select count(*) from opdrachten o where o.bedrijf_id = b.id and o.status='live')::int as live, (select count(*) from bedrijf_leden bl where bl.bedrijf_id = b.id)::int as leden
    from bedrijven b ${w.length ? 'where ' + w.join(' and ') : ''} order by b.aangemaakt desc limit 300`, p);
  return (
    <div className="p-stack">
      <h1 className="p-h2">Bedrijven</h1>
      <form className="p-searchbar" style={{ gridTemplateColumns: '1fr auto' }}><label className="sr-only" htmlFor="z">Zoeken</label><input id="z" name="zoek" defaultValue={zoek} placeholder="Naam of KvK-nummer" /><input type="hidden" name="status" value={status} /><button className="btn btn-blue">Zoek</button></form>
      <div className="p-row" style={{ gap: 8 }}>{[['', 'Alle'], ['actief', 'Actief'], ['geblokkeerd', 'Geblokkeerd'], ['kvk', 'KvK niet gecontroleerd']].map(([s, l]) => <Link key={s} className={`p-chip ${status === s ? 'on' : ''}`} href={`/beheer/bedrijven?status=${s}`}>{l}</Link>)}</div>
      <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Bedrijven</caption>
        <thead><tr><th scope="col">Bedrijf</th><th scope="col">KvK</th><th scope="col">Plaats</th><th scope="col">Team</th><th scope="col">Live opdrachten</th><th scope="col">Aangemeld</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.map((b: any) => <tr key={b.id}><td><Link className="p-link" href={`/beheer/bedrijven/${b.id}`}>{b.naam}</Link></td><td>{b.kvk} <span className="p-xs p-muted">{b.kvk_controle_resultaat === 'actief' ? '✓' : 'niet gecontroleerd'}</span></td><td>{b.plaats}</td><td>{b.leden}</td><td>{b.live}</td><td>{datumNL(b.aangemaakt)}</td><td><span className={`p-status ${b.status}`}>{b.status === 'actief' ? 'Actief' : 'Geblokkeerd'}</span></td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
