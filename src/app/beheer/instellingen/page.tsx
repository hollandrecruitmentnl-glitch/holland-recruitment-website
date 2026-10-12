import { q, one } from '@/lib/db';
import { nodigBeheerderUit, zetInstelling } from '@/app/actions/beheer';

export const metadata = { title: 'Instellingen' };
export default async function Instellingen({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { fout } = await searchParams;
  const team = await q(`select voornaam, achternaam, email, laatst_actief from accounts where rol = 'beheer' order by voornaam`);
  const handmatig = (await one(`select waarde from instellingen where sleutel = 'opdrachten_handmatig_controleren'`))?.waarde !== false;
  return (
    <div className="p-stack" style={{ maxWidth: 820 }}>
      <h1 className="p-h2">Instellingen</h1>
      <section className="p-card p-stack"><h2 className="p-h3">Opdrachten</h2>
        <form action={zetInstelling} className="p-stack" style={{ gap: 10 }}><input type="hidden" name="sleutel" value="opdrachten_handmatig_controleren" />
          <label className="p-check"><input type="checkbox" name="waarde" defaultChecked={handmatig} />Opdrachten handmatig controleren voordat ze live gaan</label>
          <span className="p-xs p-muted">Uit: opdrachten van bedrijven gaan direct live. Opdrachten met bemiddeling blijven altijd eerst naar beheer gaan.</span>
          <button className="btn btn-line btn-sm" style={{ alignSelf: 'flex-start' }}>Opslaan</button></form></section>
      <section className="p-card p-stack"><h2 className="p-h3">Team (beheer)</h2>
        {team.map((t: any) => <div key={t.email} className="p-between p-small"><span><strong>{t.voornaam} {t.achternaam}</strong> · {t.email}</span></div>)}
        {fout && <p className="p-err-summary" role="alert">{fout === 'bestaat' ? 'Er bestaat al een account met dit e-mailadres.' : 'Gebruik een @holland-recruitment.nl-adres.'}</p>}
        <form action={nodigBeheerderUit} className="p-grid3" style={{ alignItems: 'end' }}>
          <div className="field"><label htmlFor="bv">Voornaam</label><input id="bv" name="voornaam" required /></div>
          <div className="field"><label htmlFor="ba">Achternaam</label><input id="ba" name="achternaam" required /></div>
          <div className="field"><label htmlFor="be">E-mailadres</label><input id="be" name="email" type="email" required placeholder="naam@holland-recruitment.nl" /></div>
          <button className="btn btn-line btn-sm">Beheerder toevoegen</button>
        </form>
        <span className="p-xs p-muted">De nieuwe beheerder krijgt een e-mail om zelf een wachtwoord te kiezen (één uur geldig).</span>
      </section>
      <section className="p-card p-stack"><h2 className="p-h3">E-mailmeldingen voor beheer</h2>
        <p className="p-small">Nieuwe opdrachten ter controle en bemiddelingsaanvragen gaan naar sales@; meldingen naar info@. Aan te passen met MELDING_SALES en MELDING_INFO in Vercel.</p></section>
    </div>
  );
}
