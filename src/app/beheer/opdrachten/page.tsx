import Link from 'next/link';
import { q, one } from '@/lib/db';
import { BRON_NAAM, OPDRACHT_STATUS, REACTIE_STATUS, vakgebiedNaam, werkvormNaam } from '@/lib/constants';
import { datumNL, relatief } from '@/lib/util';
import { tariefTekst, urenTekst } from '@/lib/data/opdrachten';
import { keurOpdracht } from '@/app/actions/beheer';
import Drawer from '../Drawer';

export const metadata = { title: 'Opdrachten' };
export default async function Opdrachten({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const status = sp.status || '', bron = sp.bron || '', zoek = sp.zoek || '';
  const p: unknown[] = []; const w: string[] = [];
  if (status) { p.push(status); w.push(`o.status = $${p.length}`); }
  if (bron === 'direct') w.push(`o.bron = 'direct'`); else if (bron) { p.push(bron); w.push(`o.bron = $${p.length}`); }
  if (zoek) { p.push(`%${zoek.toLowerCase()}%`); w.push(`lower(o.titel) like $${p.length}`); }
  const rows = await q(`select o.id, o.titel, o.status, o.bron, o.aanbieder, o.aangemaakt, o.bemiddeling, b.naam as bedrijf, (select count(*) from reacties r where r.opdracht_id = o.id)::int as reacties
    from opdrachten o left join bedrijven b on b.id = o.bedrijf_id ${w.length ? 'where ' + w.join(' and ') : ''} order by (o.status = 'in_controle') desc, o.aangemaakt desc limit 300`, p);
  const tel = await q(`select status, count(*)::int as n from opdrachten group by status`);
  const n = (s: string) => tel.find((t: any) => t.status === s)?.n ?? 0;
  const basis = `/beheer/opdrachten?status=${status}&bron=${bron}&zoek=${encodeURIComponent(zoek)}`;
  const open = sp.open && /^[0-9a-f-]{36}$/.test(sp.open) ? await one(`select o.*, o.reageren_tot::text, o.start_datum::text, b.naam as bedrijf, b.kvk_controle_resultaat from opdrachten o left join bedrijven b on b.id = o.bedrijf_id where o.id = $1`, [sp.open]) : null;
  const reageerders = open ? await q(`select r.status, r.aangemaakt, f.id, a.voornaam, a.achternaam, f.functietitel from reacties r join freelancers f on f.id = r.freelancer_id join accounts a on a.id = f.id where r.opdracht_id = $1 order by r.aangemaakt desc`, [open.id]) : [];
  return (
    <div className="p-stack">
      <h1 className="p-h2">Opdrachten</h1>
      <details className="p-note p-small"><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Uitleg van de statussen</summary>
        <p style={{ marginTop: 8 }}><b>Concept</b>: nog niet ingediend. <b>In controle</b>: wacht op beheer. <b>Live</b>: goedgekeurd, zichtbaar en open voor reacties. <b>Gesloten</b>: door het bedrijf of na “reageren kan tot”. <b>Afgewezen</b>: met reden terug naar het bedrijf. <b>Verwijderd</b>: offline gehaald met reden. <b>Verlopen</b>: externe opdracht die de bron niet meer levert.</p></details>
      <form className="p-searchbar" style={{ gridTemplateColumns: '1fr auto' }}><label className="sr-only" htmlFor="z">Zoeken</label><input id="z" name="zoek" defaultValue={zoek} placeholder="Titel" /><input type="hidden" name="status" value={status} /><input type="hidden" name="bron" value={bron} /><button className="btn btn-blue">Zoek</button></form>
      <div className="p-row" style={{ gap: 8 }}>{['', 'in_controle', 'live', 'concept', 'gesloten', 'afgewezen', 'verwijderd', 'verlopen'].map(s => <Link key={s} className={`p-chip ${status === s ? 'on' : ''}`} href={`/beheer/opdrachten?status=${s}&bron=${bron}`}>{s ? `${OPDRACHT_STATUS[s]} (${n(s)})` : 'Alle'}</Link>)}</div>
      <div className="p-row" style={{ gap: 8 }}><span className="p-small p-muted">Bron:</span>{['', 'direct', 'adzuna', 'jooble', 'remotive', 'remoteok', 'jobicy', 'feed'].map(b => <Link key={b} className={`p-chip ${bron === b ? 'on' : ''}`} href={`/beheer/opdrachten?status=${status}&bron=${b}`}>{b ? BRON_NAAM[b] : 'Alle'}</Link>)}</div>
      <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Opdrachten</caption>
        <thead><tr><th scope="col">Opdracht</th><th scope="col">Bedrijf / aanbieder</th><th scope="col">Bron</th><th scope="col">Reacties</th><th scope="col">Aangemaakt</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.map((o: any) => <tr key={o.id}><td><Link className="p-link" href={`${basis}&open=${o.id}`} scroll={false}>{o.titel}</Link>{o.bemiddeling && <div className="p-xs p-muted">Met bemiddeling</div>}</td><td>{o.bedrijf || o.aanbieder}</td><td>{BRON_NAAM[o.bron]}</td><td>{o.reacties}</td><td>{datumNL(o.aangemaakt)}</td><td><span className={`p-status ${o.status}`}>{OPDRACHT_STATUS[o.status]}</span></td></tr>)}</tbody>
      </table></div>
      {open && (
        <Drawer sluitUrl={basis} titel={open.titel}>
          <span className={`p-status ${open.status}`} style={{ alignSelf: 'flex-start' }}>{OPDRACHT_STATUS[open.status]}</span>
          <dl className="p-facts p-small">
            <div><dt>Bedrijf</dt><dd>{open.bedrijf || open.aanbieder}</dd></div><div><dt>Bron</dt><dd>{BRON_NAAM[open.bron]}</dd></div>
            <div><dt>Vakgebied</dt><dd>{vakgebiedNaam(open.vakgebied) || '–'}</dd></div><div><dt>Werkvorm</dt><dd>{werkvormNaam(open.werkvorm) || '–'} {open.locatie}</dd></div>
            <div><dt>Tarief</dt><dd>{tariefTekst(open)}</dd></div><div><dt>Uren</dt><dd>{urenTekst(open)}</dd></div>
            <div><dt>Reageren tot</dt><dd>{open.reageren_tot ? datumNL(open.reageren_tot) : '–'}</dd></div>
          </dl>
          <p className="p-small" style={{ whiteSpace: 'pre-line', maxHeight: 220, overflow: 'auto' }}>{open.omschrijving}</p>
          {open.externe_url && <a className="p-link p-small" href={open.externe_url} target="_blank" rel="noopener">Bekijk bij bron ↗</a>}
          {open.status === 'in_controle' && (
            <div className="p-panel p-small p-stack" style={{ gap: 4, padding: 14 }}><strong>Controlelijst</strong>
              <span>□ Echte opdracht, geen vaste baan of werving voor derden</span><span>□ Geen discriminerende eisen</span><span>□ Geen contactgegevens of links naar betaalde diensten in de tekst</span>
              <span>□ Tarief en uren realistisch</span><span>□ KvK: {open.kvk_controle_resultaat === 'actief' ? 'gecontroleerd ✓' : 'niet automatisch gecontroleerd'}</span></div>
          )}
          <div className="p-stack" style={{ gap: 6 }}><strong className="p-small">Reagerende freelancers ({reageerders.length})</strong>
            {reageerders.map((r: any) => <Link key={r.id} className="p-between p-small" href={`/beheer/freelancers/${r.id}`}><span>{r.voornaam} {r.achternaam} · {r.functietitel}</span><span>{relatief(r.aangemaakt)} <span className={`p-status ${r.status}`}>{REACTIE_STATUS[r.status]}</span></span></Link>)}</div>
          {sp.fout === 'reden' && <p className="p-err-summary" role="alert">Vul een reden in (minimaal 5 tekens). Die gaat per e-mail naar het bedrijf.</p>}
          {['in_controle', 'afgewezen'].includes(open.status) && <form action={keurOpdracht}><input type="hidden" name="id" value={open.id} /><input type="hidden" name="besluit" value="goedkeuren" /><input type="hidden" name="terug" value={basis} /><button className="btn btn-blue btn-block">Goedkeuren en live zetten</button></form>}
          {open.status !== 'verwijderd' && (
            <form action={keurOpdracht} className="p-stack" style={{ gap: 8 }}>
              <input type="hidden" name="id" value={open.id} /><input type="hidden" name="terug" value={basis} />
              <div className="field"><label htmlFor="reden">Reden (verplicht bij afwijzen of verwijderen)</label><textarea id="reden" name="reden" rows={3} /></div>
              <div className="p-row">{open.status === 'in_controle' && <button className="btn btn-line btn-sm" name="besluit" value="afwijzen">Afwijzen</button>}<button className="btn btn-danger btn-sm" name="besluit" value="verwijderen">Verwijderen</button></div>
            </form>
          )}
        </Drawer>
      )}
    </div>
  );
}
