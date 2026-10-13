import { googleManier } from '@/lib/google';
import { groepeer, leesSheetRijen, metStand, UITNODIGING_DAGEN } from '@/lib/uitnodigen';
import { vakgebiedNaam } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import { klaarzettenActie, testmailActie, versturenActie } from '@/app/actions/uitnodigen';

export const metadata = { title: 'Uitnodigen' };
export const dynamic = 'force-dynamic';

const LABEL: Record<string, [string, string]> = {
  nieuw: ['Nieuw', ''], klaargezet: ['Klaargezet, nog niet gemaild', 'in_controle'], uitgenodigd: ['Uitgenodigd', 'live'],
  op_platform: ['Al op het platform', 'gesloten'], overslaan: ['Overslaan', 'afgewezen'],
};

export default async function Uitnodigen({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { melding } = await searchParams;
  let rijen: Awaited<ReturnType<typeof metStand>> = []; let fout = '';
  try { rijen = await metStand(groepeer(await leesSheetRijen())); } catch (e: any) { fout = String(e?.message || e); }
  const n = (s: string) => rijen.filter(r => r.stand === s).length;
  return (
    <div className="p-stack">
      <h1 className="p-h2">Freelancers uitnodigen</h1>
      <p className="p-small p-muted" style={{ maxWidth: 760 }}>Freelancers die zich via de website hebben aangemeld (Google Sheet, tabblad Freelancers) zetten we klaar op het platform. Hun profiel is onzichtbaar tot ze het zelf activeren via de link in de uitnodiging (geldig {UITNODIGING_DAGEN} dagen). Uurtarief, KvK, btw en notities nemen we niet over. Wie niet binnen 30 dagen activeert, wordt automatisch verwijderd.</p>
      {melding && <p className="p-ok p-small" role="status">{melding}</p>}
      {fout && <p className="p-err-summary" role="alert"><strong>De Sheet kon niet worden gelezen.</strong> {fout} {googleManier() ? '' : '(Google-koppeling ontbreekt.)'}</p>}
      <div className="p-row" style={{ gap: 8 }}>
        <span className="p-status">{n('nieuw')} nieuw</span><span className="p-status in_controle">{n('klaargezet')} klaargezet</span>
        <span className="p-status live">{n('uitgenodigd')} uitgenodigd</span><span className="p-status gesloten">{n('op_platform')} al op platform</span><span className="p-status afgewezen">{n('overslaan')} overslaan</span>
      </div>
      <div className="p-card p-stack" style={{ gap: 10 }}>
        <strong>Stappen</strong>
        <div className="p-row" style={{ gap: 10 }}>
          <form action={klaarzettenActie}><button className="btn btn-line btn-sm" disabled={!n('nieuw')}>1. Klaarzetten ({n('nieuw')})</button></form>
          <form action={testmailActie}><button className="btn btn-line btn-sm">2. Testmail naar mij</button></form>
          <form action={versturenActie}><button className="btn btn-blue btn-sm" disabled={!n('klaargezet')}>3. Verstuur uitnodigingen ({n('klaargezet')})</button></form>
        </div>
        <span className="p-xs p-muted">Klaarzetten verstuurt nog niets. Pas bij stap 3 gaat er een e-mail uit, één per freelancer.</span>
      </div>
      {rijen.length > 0 && (
        <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Aanmeldingen uit de Sheet</caption>
          <thead><tr><th scope="col">Naam</th><th scope="col">Functie</th><th scope="col">Vakgebied (platform)</th><th scope="col">Cv</th><th scope="col">Rijen</th><th scope="col">Stand</th></tr></thead>
          <tbody>{rijen.map(r => (
            <tr key={r.email}><td>{r.naam}<div className="p-xs p-muted">{r.email}</div></td><td>{r.functietitel || '–'}</td>
              <td>{r.vakgebied ? vakgebiedNaam(r.vakgebied) : <span className="p-muted">Kiest zelf</span>}<div className="p-xs p-muted">{r.expertise}</div></td>
              <td>{r.cvBestand ? 'Ja' : '–'}</td><td>{r.ids.length}</td>
              <td><span className={`p-status ${LABEL[r.stand][1]}`}>{LABEL[r.stand][0]}</span>{r.uitgenodigdOp && <div className="p-xs p-muted">{datumNL(r.uitgenodigdOp)}</div>}{r.overslaan && <div className="p-xs p-muted">{r.overslaan}</div>}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
