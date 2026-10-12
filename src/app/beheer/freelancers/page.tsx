import Link from 'next/link';
import { q } from '@/lib/db';
import { vakgebiedNaam } from '@/lib/constants';
import { datumNL, relatief } from '@/lib/util';

export const metadata = { title: 'Freelancers' };
export default async function Freelancers({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { zoek = '', status = '' } = await searchParams;
  const p: unknown[] = []; const w: string[] = [];
  if (zoek) { p.push(`%${zoek.toLowerCase()}%`); w.push(`(lower(a.voornaam || ' ' || a.achternaam) like $${p.length} or lower(a.email) like $${p.length} or lower(f.functietitel) like $${p.length})`); }
  if (status === 'geblokkeerd' || status === 'actief') { p.push(status); w.push(`a.status = $${p.length}`); }
  if (status === 'onbevestigd') w.push('not a.email_bevestigd');
  const rows = await q(`select f.id, a.voornaam, a.achternaam, a.email, a.status, a.email_bevestigd, a.aangemaakt, a.laatst_actief, f.functietitel, f.vakgebied, f.regio, f.cv_pad is not null as cv,
      (select count(*) from reacties r where r.freelancer_id = f.id)::int as reacties
    from freelancers f join accounts a on a.id = f.id ${w.length ? 'where ' + w.join(' and ') : ''} order by a.aangemaakt desc limit 300`, p);
  const tel = await q(`select a.status, count(*)::int as n from freelancers f join accounts a on a.id = f.id group by a.status`);
  const n = (s: string) => tel.find((t: any) => t.status === s)?.n ?? 0;
  return (
    <div className="p-stack">
      <h1 className="p-h2">Freelancers</h1>
      <form className="p-searchbar" style={{ gridTemplateColumns: '1fr auto' }}><label className="sr-only" htmlFor="z">Zoeken</label><input id="z" name="zoek" defaultValue={zoek} placeholder="Naam, e-mail of functie" /><input type="hidden" name="status" value={status} /><button className="btn btn-blue">Zoek</button></form>
      <div className="p-row" style={{ gap: 8 }}>{[['', `Alle (${n('actief') + n('geblokkeerd')})`], ['actief', `Actief (${n('actief')})`], ['geblokkeerd', `Geblokkeerd (${n('geblokkeerd')})`], ['onbevestigd', 'E-mail niet bevestigd']].map(([s, l]) => <Link key={s} className={`p-chip ${status === s ? 'on' : ''}`} href={`/beheer/freelancers?status=${s}${zoek ? `&zoek=${encodeURIComponent(zoek)}` : ''}`}>{l}</Link>)}</div>
      <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Freelancers</caption>
        <thead><tr><th scope="col">Naam</th><th scope="col">Functie</th><th scope="col">Vakgebied</th><th scope="col">Cv</th><th scope="col">Reacties</th><th scope="col">Aangemeld</th><th scope="col">Laatst actief</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.map((r: any) => <tr key={r.id}><td><Link className="p-link" href={`/beheer/freelancers/${r.id}`}>{r.voornaam} {r.achternaam}</Link><div className="p-xs p-muted">{r.email}{!r.email_bevestigd && ' · niet bevestigd'}</div></td><td>{r.functietitel}<div className="p-xs p-muted">{r.regio}</div></td><td>{vakgebiedNaam(r.vakgebied)}</td><td>{r.cv ? 'Ja' : '–'}</td><td>{r.reacties}</td><td>{datumNL(r.aangemaakt)}</td><td>{relatief(r.laatst_actief)}</td><td><span className={`p-status ${r.status}`}>{r.status === 'actief' ? 'Actief' : 'Geblokkeerd'}</span></td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
