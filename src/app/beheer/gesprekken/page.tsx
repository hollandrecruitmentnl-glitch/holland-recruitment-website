import { q } from '@/lib/db';
import { GESPREK_LABELS } from '@/lib/constants';
import { relatief } from '@/lib/util';
import { gesprekInzage } from '@/app/actions/beheer';

export const metadata = { title: 'Gesprekken' };
export default async function Gesprekken({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { fout } = await searchParams;
  const rows = await q(`select g.id, g.statuslabel, g.laatste_bericht, b.naam as bedrijf, a.voornaam || ' ' || a.achternaam as freelancer, o.titel,
      (select count(*) from berichten m where m.gesprek_id = g.id)::int as berichten from gesprekken g join bedrijven b on b.id = g.bedrijf_id join accounts a on a.id = g.freelancer_id
      left join opdrachten o on o.id = g.opdracht_id order by g.laatste_bericht desc limit 300`);
  return (
    <div className="p-stack">
      <h1 className="p-h2">Gesprekken</h1>
      <p className="p-note p-small">Lezen kan alleen na het kiezen van een reden. Elke inzage komt in het logboek, en gebruikers zien onder hun gesprekkenlijst dat dit kan gebeuren. Laat dit juridisch toetsen (AVG) en vermeld het in de privacyverklaring.</p>
      {fout && <p className="p-err-summary" role="alert">Kies een reden om het gesprek te lezen.</p>}
      <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Gesprekken</caption>
        <thead><tr><th scope="col">Freelancer</th><th scope="col">Bedrijf</th><th scope="col">Over</th><th scope="col">Berichten</th><th scope="col">Laatste</th><th scope="col">Status</th><th scope="col">Lezen</th></tr></thead>
        <tbody>{rows.map((g: any) => <tr key={g.id}><td>{g.freelancer}</td><td>{g.bedrijf}</td><td>{g.titel || 'Profiel'}</td><td>{g.berichten}</td><td>{relatief(g.laatste_bericht)}</td><td><span className="p-status">{GESPREK_LABELS[g.statuslabel]}</span></td>
          <td><form action={gesprekInzage} className="p-row" style={{ flexWrap: 'nowrap', gap: 6 }}><input type="hidden" name="id" value={g.id} /><label className="sr-only" htmlFor={`r-${g.id}`}>Reden</label><select id={`r-${g.id}`} name="reden" required defaultValue="" style={{ font: 'inherit', fontSize: 13.5, padding: 6, borderRadius: 10 }}><option value="" disabled>Reden…</option><option value="melding">Melding</option><option value="fraudecontrole">Fraudecontrole</option><option value="support">Support</option><option value="bemiddeling">Bemiddeling</option></select><button className="p-linkbtn">Lees</button></form></td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
