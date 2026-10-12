import Link from 'next/link';
import { vereis } from '@/lib/auth';
import { q } from '@/lib/db';
import { bewaarMeldingen } from '@/app/actions/profiel';
import { verwijderZoekopdracht, zoekopdrachtEmail } from '@/app/actions/zoek';
import { WachtwoordForm, VerwijderForm } from '@/components/InstellingenForms';
import { datumNL } from '@/lib/util';

export const metadata = { title: 'Instellingen', robots: { index: false } };
export default async function Instellingen() {
  const a = await vereis();
  const zoek = await q('select * from bewaarde_zoekopdrachten where account_id = $1 order by aangemaakt desc', [a.id]);
  const m = a.meldingen || {};
  const zoekUrl = (z: any) => {
    const f = z.filters || {}; const p = new URLSearchParams();
    if (f.q) p.set('q', f.q); if (f.regio) p.set('regio', f.regio); if (f.locatie) p.set('locatie', f.locatie);
    (f.vakgebied || []).forEach((v: string) => p.append('vakgebied', v)); (f.vaardigheid || []).forEach((v: string) => p.append('vaardigheid', v)); (f.werkvorm || []).forEach((v: string) => p.append('werkvorm', v));
    if (f.max) p.set('max', f.max); if (f.beschikbaar) p.set('beschikbaar', f.beschikbaar); if (f.bron) p.set('bron', f.bron);
    return `${z.soort === 'freelancers' ? '/freelancers-zoeken' : '/opdrachten'}?${p}`;
  };
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 64px', maxWidth: 860 }}>
      <h1 className="p-h2" style={{ marginBottom: 16 }}>Instellingen</h1>
      <div className="p-stack" style={{ gap: 18 }}>
        <section className="p-card p-stack">
          <h2 className="p-h3">E-mailmeldingen</h2>
          <form action={bewaarMeldingen} className="p-stack" style={{ gap: 12 }}>
            <label className="p-check"><input type="checkbox" name="nieuw_bericht" defaultChecked={m.nieuw_bericht !== false} />Nieuw bericht als ik niet online ben (hooguit één e-mail per gesprek per uur)</label>
            {a.rol === 'bedrijf' && <label className="p-check"><input type="checkbox" name="reactie" defaultChecked={m.reactie !== false} />Nieuwe reactie op een opdracht</label>}
            {a.rol === 'bedrijf' && <label className="p-check"><input type="checkbox" name="opdracht_status" defaultChecked={m.opdracht_status !== false} />Opdracht goedgekeurd of afgewezen</label>}
            <label className="p-check"><input type="checkbox" name="bewaarde_zoekopdracht" defaultChecked={m.bewaarde_zoekopdracht !== false} />Nieuwe resultaten voor bewaarde zoekopdrachten</label>
            <button className="btn btn-blue btn-sm" style={{ alignSelf: 'flex-start' }}>Opslaan</button>
          </form>
        </section>
        {a.rol !== 'beheer' && <section className="p-card p-stack">
          <h2 className="p-h3">Bewaarde zoekopdrachten</h2>
          {zoek.length ? zoek.map((z: any) => (
            <div key={z.id} className="p-between p-panel" style={{ padding: '12px 16px' }}>
              <span><Link className="p-link" href={zoekUrl(z)}>{z.naam}</Link><br /><span className="p-xs p-muted">{z.soort === 'freelancers' ? 'Freelancers' : 'Opdrachten'} · bewaard op {datumNL(z.aangemaakt)}</span></span>
              <span className="p-row" style={{ gap: 10 }}>
                <form action={zoekopdrachtEmail}><input type="hidden" name="id" value={z.id} /><button className="p-linkbtn" aria-pressed={z.email}>{z.email ? 'E-mail aan' : 'E-mail uit'}</button></form>
                <form action={verwijderZoekopdracht}><input type="hidden" name="id" value={z.id} /><button className="p-linkbtn" style={{ color: '#B4331A' }}>Verwijderen</button></form>
              </span>
            </div>)) : <p className="p-small p-muted">Nog geen bewaarde zoekopdrachten. Zoek met filters en kies “Bewaar deze zoekopdracht”.</p>}
        </section>}
        <section className="p-card p-stack"><h2 className="p-h3">Wachtwoord</h2><WachtwoordForm /></section>
        <section className="p-card p-stack">
          <h2 className="p-h3">Je gegevens</h2>
          <p className="p-small">Download alle gegevens die we van je bewaren (AVG).</p>
          <a className="btn btn-line btn-sm" style={{ alignSelf: 'flex-start' }} href="/api/mijn-gegevens" download>Gegevens downloaden</a>
          <VerwijderForm rol={a.rol} />
        </section>
      </div>
    </div>
  );
}
