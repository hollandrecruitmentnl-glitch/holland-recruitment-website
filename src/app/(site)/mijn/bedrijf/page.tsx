import Link from 'next/link';
import { vereis } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { BedrijfForm, UitnodigForm } from '@/components/BedrijfForms';
import BestandUpload from '@/components/BestandUpload';
import { trekUitnodigingIn, verwijderLid } from '@/app/actions/profiel';
import { datumNL } from '@/lib/util';

export const metadata = { title: 'Bedrijfsprofiel', robots: { index: false } };
export default async function BedrijfProfiel() {
  const a = await vereis('bedrijf');
  const b = await one('select * from bedrijven where id = $1', [a.bedrijf_id]);
  const leden = await q(`select a.id, a.voornaam, a.achternaam, a.email, bl.rol from bedrijf_leden bl join accounts a on a.id = bl.account_id where bl.bedrijf_id = $1 order by bl.rol, a.voornaam`, [a.bedrijf_id]);
  const uitn = await q(`select id, email, aangemaakt from bedrijf_uitnodigingen where bedrijf_id = $1 and geaccepteerd is null and aangemaakt > now() - interval '7 days' order by aangemaakt desc`, [a.bedrijf_id]);
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 64px', maxWidth: 980 }}>
      <div className="p-between" style={{ marginBottom: 16 }}><h1 className="p-h2">Bedrijfsprofiel</h1><Link className="btn btn-line btn-sm" href={`/bedrijf/${b.slug}`}>Bekijk zoals freelancers</Link></div>
      <div className="p-stack" style={{ gap: 18 }}>
        <section className="p-card p-stack"><h2 className="p-h3">Logo</h2><BestandUpload soort="logo" huidig={b.logo_pad ? 'Logo' : null} label="Bedrijfslogo" /></section>
        <section className="p-card p-stack"><h2 className="p-h3">Gegevens</h2>
          {b.kvk_controle_resultaat !== 'actief' && <p className="p-note p-small">Je KvK-nummer is nog niet automatisch gecontroleerd. Holland Recruitment kijkt het na.</p>}
          <BedrijfForm b={b} telefoon={a.telefoon} /></section>
        <section className="p-card p-stack" id="team">
          <h2 className="p-h3">Team</h2>
          <p className="p-small p-muted">Iedereen in je team heeft dezelfde rechten: opdrachten plaatsen, reacties beoordelen en berichten sturen.</p>
          <ul className="p-stack" style={{ gap: 8 }}>{leden.map((l: any) => (
            <li key={l.id} className="p-between p-panel" style={{ padding: '12px 16px' }}>
              <span><strong>{l.voornaam} {l.achternaam}</strong>{l.id === a.id && ' (jij)'}<br /><span className="p-small p-muted">{l.email}</span></span>
              {l.id !== a.id && <form action={verwijderLid}><input type="hidden" name="id" value={l.id} /><button className="p-linkbtn" style={{ color: '#B4331A' }}>Verwijderen</button></form>}
            </li>))}</ul>
          {uitn.length > 0 && <div className="p-stack" style={{ gap: 6 }}><strong className="p-small">Openstaande uitnodigingen</strong>{uitn.map((u: any) => <div key={u.id} className="p-between p-small"><span>{u.email} · {datumNL(u.aangemaakt)}</span><form action={trekUitnodigingIn}><input type="hidden" name="id" value={u.id} /><button className="p-linkbtn">Intrekken</button></form></div>)}</div>}
          <UitnodigForm />
        </section>
      </div>
    </div>
  );
}
