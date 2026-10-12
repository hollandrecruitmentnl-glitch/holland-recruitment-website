import Link from 'next/link';
import { q, one } from '@/lib/db';
import { datumNL, relatief } from '@/lib/util';
import { handelMeldingAf } from '@/app/actions/beheer';
import Drawer from '../Drawer';

export const metadata = { title: 'Moderatie' };
export default async function Moderatie({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const status = sp.status || 'open';
  const rows = await q(`select m.*, d.voornaam || ' ' || d.achternaam as melder from meldingen m left join accounts d on d.id = m.door_id where m.status = $1 order by m.aangemaakt desc limit 200`, [status]);
  const open = sp.open && /^[0-9a-f-]{36}$/.test(sp.open) ? await one(`select m.*, b.tekst as bericht, b.aangemaakt as bericht_op, ba.voornaam || ' ' || ba.achternaam as afzender, ba.id as afzender_id, ba.rol as afzender_rol,
      fa.voornaam || ' ' || fa.achternaam as profiel, o.titel as opdracht, o.slug as opdracht_slug
    from meldingen m left join berichten b on b.id = m.bericht_id left join accounts ba on ba.id = b.afzender_id left join accounts fa on fa.id = m.freelancer_id left join opdrachten o on o.id = m.opdracht_id where m.id = $1`, [sp.open]) : null;
  return (
    <div className="p-stack">
      <h1 className="p-h2">Moderatie</h1>
      <div className="p-row" style={{ gap: 8 }}>{[['open', 'Open'], ['afgehandeld', 'Afgehandeld']].map(([s, l]) => <Link key={s} className={`p-chip ${status === s ? 'on' : ''}`} href={`/beheer/moderatie?status=${s}`}>{l}</Link>)}</div>
      <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Meldingen</caption>
        <thead><tr><th scope="col">Soort</th><th scope="col">Reden</th><th scope="col">Gemeld door</th><th scope="col">Datum</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.length ? rows.map((m: any) => <tr key={m.id}><td><Link className="p-link" href={`/beheer/moderatie?status=${status}&open=${m.id}`} scroll={false}>{m.soort}</Link></td><td>{m.reden}</td><td>{m.melder}</td><td>{datumNL(m.aangemaakt)}</td><td><span className={`p-status ${m.status}`}>{m.status === 'open' ? 'Open' : m.besluit?.replace('_', ' ')}</span></td></tr>)
          : <tr><td colSpan={5} className="p-muted">Geen meldingen.</td></tr>}</tbody>
      </table></div>
      {open && (
        <Drawer sluitUrl={`/beheer/moderatie?status=${status}`} titel={`Melding: ${open.reden}`}>
          <p className="p-small p-muted">{relatief(open.aangemaakt)}{open.toelichting && <> · “{open.toelichting}”</>}</p>
          {open.soort === 'gesprek' && <div className="p-panel p-stack" style={{ gap: 6 }}><strong className="p-small">Gemeld bericht (alleen dit bericht)</strong>{open.bericht ? <><p style={{ whiteSpace: 'pre-line' }}>{open.bericht}</p><span className="p-xs p-muted">Van {open.afzender} · {datumNL(open.bericht_op)}</span></> : <span className="p-small p-muted">Geen bericht van de ander gevonden.</span>}</div>}
          {open.soort === 'profiel' && <p>Profiel: <Link className="p-link" href={`/beheer/freelancers/${open.freelancer_id}`}>{open.profiel}</Link></p>}
          {open.soort === 'opdracht' && <p>Opdracht: <Link className="p-link" href={`/beheer/opdrachten?open=${open.opdracht_id}`}>{open.opdracht}</Link></p>}
          {open.status === 'open' ? (
            <form action={handelMeldingAf} className="p-stack" style={{ gap: 10 }}>
              <input type="hidden" name="id" value={open.id} />
              {sp.fout && <p className="p-err-summary" role="alert">Kies een besluit.</p>}
              <fieldset className="p-stack" style={{ border: 0, gap: 8 }}><legend className="p-small" style={{ fontWeight: 700, marginBottom: 6 }}>Besluit</legend>
                <label className="p-check"><input type="radio" name="besluit" value="geen_actie" />Geen actie</label>
                <label className="p-check"><input type="radio" name="besluit" value="waarschuwen" />Waarschuwen (contact opnemen buiten het platform)</label>
                <label className="p-check"><input type="radio" name="besluit" value="blokkeren" />Blokkeren{open.soort === 'opdracht' ? ' (opdracht verwijderen)' : ''}</label></fieldset>
              <div className="field"><label htmlFor="notitie">Interne notitie (bij blokkeren ook de reden in de e-mail)</label><textarea id="notitie" name="notitie" rows={3} /></div>
              <button className="btn btn-blue">Afhandelen</button>
            </form>
          ) : <p className="p-ok p-small">Afgehandeld: {open.besluit?.replace('_', ' ')}. {open.notitie}</p>}
        </Drawer>
      )}
    </div>
  );
}
