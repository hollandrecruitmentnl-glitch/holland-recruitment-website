import { q } from '@/lib/db';
import { indexeringActief } from '@/lib/indexering';
import { BRON_NAAM } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import { draaiFeedsNu } from '@/app/actions/beheer';

export const metadata = { title: 'Externe feeds' };
export default async function Feeds() {
  const runs = await q(`select * from feed_runs order by gestart desc limit 30`);
  const live = await q(`select bron, count(*) filter (where status='live')::int as live, count(*) filter (where status='verlopen')::int as verlopen from opdrachten where bron <> 'direct' group by bron`);
  const meldingen = await q(`select pad, type, gemeld_op, google, indexnow from indexering order by gemeld_op desc limit 10`).catch(() => [] as any[]);
  const idxAan = indexeringActief(), googleAan = !!process.env.GOOGLE_INDEXING_KEY;
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
      <h2 className="p-h3" style={{ marginTop: 18 }}>Zoekmachines (eigen opdrachten)</h2>
      <p className="p-small p-muted">Nieuwe, gewijzigde en gesloten eigen opdrachten worden direct gemeld aan Google (Indexing API, alleen voor vacaturepagina’s) en aan Bing e.a. (IndexNow). Elke nacht controleert de cron of alles gemeld is. Externe opdrachten worden niet gemeld: die staan op noindex.</p>
      <div className="p-row" style={{ gap: 8 }}>
        <span className={`p-status ${idxAan ? 'live' : ''}`}>{idxAan ? 'Actief op www' : 'Uit: alleen actief op www.holland-recruitment.nl'}</span>
        <span className={`p-status ${googleAan ? 'live' : ''}`}>{googleAan ? 'Google-sleutel aanwezig' : 'Geen Google-sleutel (GOOGLE_INDEXING_KEY)'}</span>
      </div>
      {meldingen.length > 0 && <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Laatste meldingen aan zoekmachines</caption>
        <thead><tr><th scope="col">Pagina</th><th scope="col">Soort</th><th scope="col">Gemeld</th><th scope="col">Google</th><th scope="col">IndexNow</th></tr></thead>
        <tbody>{meldingen.map((m: any) => <tr key={m.pad}><td>{m.pad}</td><td>{m.type === 'URL_UPDATED' ? 'Nieuw/gewijzigd' : 'Verwijderd'}</td><td>{datumNL(m.gemeld_op)}</td><td>{m.google || '–'}</td><td>{m.indexnow || '–'}</td></tr>)}</tbody>
      </table></div>}
    </div>
  );
}
