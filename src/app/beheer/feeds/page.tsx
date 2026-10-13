import { q } from '@/lib/db';
import { BRON_NAAM } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import { draaiFeedsNu } from '@/app/actions/beheer';

export const metadata = { title: 'Externe feeds' };
export default async function Feeds() {
  const runs = await q(`select * from feed_runs order by gestart desc limit 30`);
  const live = await q(`select bron, count(*) filter (where status='live')::int as live, count(*) filter (where status='verlopen')::int as verlopen from opdrachten where bron <> 'direct' group by bron`);
  const bronnen = [
    { k: 'adzuna', actief: !!process.env.ADZUNA_APP_ID, uitleg: 'Officiële API. Elke advertentie krijgt het label “Adzuna” met link (voorwaarde van Adzuna). Standaardlimiet 250 calls per dag; we gebruiken er ±12.' },
    { k: 'jooble', actief: !!process.env.JOOBLE_KEY, uitleg: 'Partner-API. Omschrijving is een fragment; reageren gaat via Jooble.' },
    { k: 'remotive', actief: true, uitleg: 'Gratis, geen sleutel. Alleen contract/freelance, remote voor Europa. Bronvermelding + link verplicht; max. 4× per dag ophalen.' },
    { k: 'remoteok', actief: true, uitleg: 'Gratis, geen sleutel. Filter op freelance/contract. Link terug zonder nofollow is verplicht.' },
    { k: 'jobicy', actief: true, uitleg: 'Gratis, geen sleutel. Remote opdrachten voor Nederland en Europa, alleen Contract/Freelance.' },
    { k: 'careerjet', actief: !!process.env.CAREERJET_KEY, uitleg: 'Partner-API: alleen live getoond onder de zoekresultaten, niet opgeslagen. Sleutel: CAREERJET_KEY.' },
    { k: 'feed', actief: !!process.env.PARTNER_FEEDS, uitleg: 'Partnerfeeds met toestemming (JSON). Instellen via PARTNER_FEEDS in Vercel.' },
  ];
  return (
    <div className="p-stack">
      <h1 className="p-h2">Externe feeds</h1>
      <p className="p-small p-muted">De feeds lopen elke nacht om 06:00 (cron). Opdrachten die een bron twee dagen niet meer levert, worden “Verlopen” en na 60 dagen verwijderd. Alleen bronnen met toestemming of een officiële API.</p>
      <div className="p-grid3">{bronnen.map(b => { const l = live.find((x: any) => x.bron === b.k); return (
        <div key={b.k} className="p-card p-stack" style={{ gap: 6 }}><div className="p-between"><strong>{BRON_NAAM[b.k]}</strong><span className={`p-status ${b.actief ? 'live' : ''}`}>{b.actief ? 'Actief' : 'Geen sleutel'}</span></div>
          <span className="p-small">{l?.live ?? 0} live · {l?.verlopen ?? 0} verlopen</span><span className="p-xs p-muted">{b.uitleg}</span></div>); })}</div>
      <form action={draaiFeedsNu}><button className="btn btn-line btn-sm">Feeds nu ophalen</button></form>
      <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Laatste runs</caption>
        <thead><tr><th scope="col">Bron</th><th scope="col">Gestart</th><th scope="col">Nieuw</th><th scope="col">Bijgewerkt</th><th scope="col">Verlopen</th><th scope="col">Fout</th></tr></thead>
        <tbody>{runs.length ? runs.map((r: any) => <tr key={r.id}><td>{BRON_NAAM[r.bron]}</td><td>{datumNL(r.gestart)} {new Date(r.gestart).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</td><td>{r.nieuw}</td><td>{r.bijgewerkt}</td><td>{r.verlopen}</td><td style={{ color: r.fout ? '#B4331A' : undefined }}>{r.fout || '–'}</td></tr>) : <tr><td colSpan={6} className="p-muted">Nog geen runs.</td></tr>}</tbody>
      </table></div>
    </div>
  );
}
