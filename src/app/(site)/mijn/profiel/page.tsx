import Link from 'next/link';
import { vereis } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { volledigheid } from '@/lib/data/freelancers';
import { BasisForm, Werkervaring } from '@/components/ProfielForms';
import BestandUpload from '@/components/BestandUpload';
import BeschikbaarheidForm from '@/components/BeschikbaarheidForm';
import { bewaarZichtbaarheid } from '@/app/actions/profiel';
import { ZICHTBAARHEID } from '@/lib/constants';

export const metadata = { title: 'Mijn profiel', robots: { index: false } };

async function suggesties(kol: 'vaardigheden' | 'certificeringen' | 'sectoren', basis: string[]) {
  const r = await q<{ v: string }>(`select v from freelancers, unnest(${kol}) v group by v order by count(*) desc limit 30`);
  return Array.from(new Set([...r.map(x => x.v), ...basis]));
}

export default async function MijnProfiel() {
  const a = await vereis('freelancer');
  const f = await one(`select *, beschikbaar_vanaf::text as beschikbaar_vanaf, beschikbaar_tot::text as beschikbaar_tot from freelancers where id = $1`, [a.id]);
  const werk = await q(`select * from werkervaring where freelancer_id = $1 order by huidig desc, coalesce(tot, 9999) desc, van desc`, [a.id]);
  const vol = volledigheid(f, werk.length);
  const sug = {
    vaardigheden: await suggesties('vaardigheden', ['Projectmanagement', 'SAP', 'Excel', 'Power BI', 'Python', 'AutoCAD', 'Lean Six Sigma']),
    certificeringen: await suggesties('certificeringen', ['VCA-VOL', 'VCA-Basis', 'NEN 3140', 'Prince2', 'IPMA', 'Scrum Master']),
    sectoren: await suggesties('sectoren', ['Petrochemie', 'Energie', 'Haven en logistiek', 'Overheid', 'Financiële dienstverlening', 'Zorg']),
  };
  const Zicht = ({ naam, label, waarde }: { naam: string; label: string; waarde: string }) => (
    <div className="field"><label htmlFor={`z-${naam}`}>{label}</label><select id={`z-${naam}`} name={naam} defaultValue={waarde}>{ZICHTBAARHEID.map(z => <option key={z.v} value={z.v}>{z.l}</option>)}</select></div>
  );
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 64px', maxWidth: 980 }}>
      <div className="p-between" style={{ marginBottom: 16 }}>
        <h1 className="p-h2">Mijn profiel</h1>
        <Link className="btn btn-line btn-sm" href={`/freelancer/${f.slug}`}>Bekijk zoals anderen</Link>
      </div>
      <section className="p-card p-stack" style={{ marginBottom: 18 }}>
        <div className="p-between"><strong>Je profiel is {vol.pct}% compleet</strong>{vol.volgende && <span className="p-small p-muted">Volgende stap: {vol.volgende}</span>}</div>
        <div className="p-progress" role="progressbar" aria-valuenow={vol.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profielvolledigheid"><span style={{ width: `${vol.pct}%` }} /></div>
      </section>
      <div className="p-stack" style={{ gap: 18 }}>
        <section className="p-card p-stack"><h2 className="p-h3">Foto</h2><BestandUpload soort="foto" huidig={f.foto_pad ? 'Profielfoto' : null} label="Profielfoto" /></section>
        <section className="p-card p-stack"><h2 className="p-h3">Basisgegevens</h2><BasisForm f={f} telefoon={a.telefoon} suggesties={sug} /></section>
        <section className="p-card p-stack" id="beschikbaarheid"><h2 className="p-h3">Beschikbaarheid</h2><BeschikbaarheidForm f={f} /></section>
        <section className="p-card p-stack"><h2 className="p-h3">Cv</h2><BestandUpload soort="cv" huidig={f.cv_naam} label="Je cv" /></section>
        <section className="p-card p-stack"><h2 className="p-h3">Werkervaring</h2><Werkervaring items={werk} /></section>
        <section className="p-card p-stack" id="zichtbaarheid">
          <h2 className="p-h3">Zichtbaarheid</h2>
          <p className="p-small p-muted">Kies per onderdeel wie het ziet. “Na contact” betekent: bedrijven waarmee jij een gesprek voert of op wiens opdracht je reageerde. Je telefoonnummer en e-mailadres zijn nooit openbaar.</p>
          <form action={bewaarZichtbaarheid} className="p-form">
            <div className="p-grid3"><Zicht naam="tarief" label="Uurtarief" waarde={f.zichtbaar_tarief} /><Zicht naam="werkervaring" label="Werkervaring" waarde={f.zichtbaar_werkervaring} /><Zicht naam="cv" label="Cv" waarde={f.zichtbaar_cv} /></div>
            <label className="p-check"><input type="checkbox" name="vindbaar_google" defaultChecked={f.vindbaar_google} />Vindbaar in Google en andere zoekmachines</label>
            <label className="p-check"><input type="checkbox" name="ook_bemiddeld" defaultChecked={f.ook_bemiddeld} /><span>Ook bemiddeld worden<br /><span className="p-small p-muted">Holland Recruitment mag je voorstellen bij opdrachten waarvoor een bedrijf bemiddeling vraagt.</span></span></label>
            <button className="btn btn-blue" type="submit" style={{ alignSelf: 'flex-start' }}>Zichtbaarheid opslaan</button>
          </form>
        </section>
      </div>
    </div>
  );
}
