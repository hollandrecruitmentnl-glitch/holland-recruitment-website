import Link from 'next/link';
import type { Metadata } from 'next';
import { huidigAccount } from '@/lib/auth';
import { zoekFreelancers } from '@/lib/data/freelancers';
import { zoekOpdrachten } from '@/lib/data/opdrachten';
import { FreelancerKaart, OpdrachtKaart } from '@/components/Kaarten';
import { VAKGEBIEDEN } from '@/lib/constants';
import { kvkActief } from '@/lib/kvk';

export const metadata: Metadata = {
  title: 'De juiste freelancer vinden. Of jouw volgende opdracht.',
  description: 'Zoek zelfstandige professionals en freelance opdrachten en kom rechtstreeks met elkaar in contact. De eerste 6 maanden helemaal gratis.',
  alternates: { canonical: '/freelance-platform' },
};

const POPULAIR_F = ['Maintenance Engineer', 'Full-stack Developer', 'Interim Controller', 'Online Marketeer', 'HR-adviseur'];
const POPULAIR_O = ['Interim Projectmanager', 'Backend Developer', 'Campagnemanager', 'Business Controller'];
const SEO_LINKS: [string, string, string][] = [
  ['techniek-onderhoud', 'rotterdam', 'Technici in Rotterdam'], ['it-software', 'amsterdam', 'IT-freelancers in Amsterdam'], ['finance-control', 'rotterdam', 'Finance in Rotterdam'],
  ['engineering', 'rotterdam', 'Engineers in Rotterdam'], ['projectmanagement', 'utrecht', 'Projectmanagers in Utrecht'], ['marketing-communicatie', 'amsterdam', 'Marketeers in Amsterdam'],
  ['data-analytics', 'utrecht', 'Data-specialisten in Utrecht'], ['hse-kwaliteit', 'rotterdam', 'HSE in Rotterdam'], ['management-interim', 'den-haag', 'Interim managers in Den Haag'],
];

export default async function PlatformHome({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const a = await huidigAccount();
  const voorFreelancers = sp.zoek !== 'opdrachten' && a?.rol !== 'freelancer' || sp.zoek === 'freelancers';
  const [fr, op] = await Promise.all([zoekFreelancers({ perPagina: 3 }, a), zoekOpdrachten({ perPagina: 3 })]);
  const faq: [string, string][] = [
    ['Is het echt gratis?', 'Ja. De eerste 6 maanden zijn alle functies gratis: zoeken, berichten sturen, reageren en opdrachten plaatsen. Er zijn geen abonnementen, commissies of contactkosten. Verandert dat later, dan laten we het je vooraf weten.'],
    ['Heb ik een account nodig om te zoeken?', 'Nee. Freelancers en opdrachten bekijken kan zonder account. Een account maak je pas aan als je een bericht stuurt, reageert of een opdracht plaatst. Dat duurt twee stappen.'],
    ['Hoe weet ik dat een bedrijf echt bestaat?', kvkActief() ? 'Elk bedrijf meldt zich aan met een KvK-nummer. Dat controleren we direct bij de KvK. Bij misbruik blokkeren we het account.' : 'Elk bedrijf meldt zich aan met een KvK-nummer en een zakelijk e-mailadres. Bij misbruik blokkeren we het account.'],
    ['Wie ziet mijn gegevens?', 'Je kiest per onderdeel wie je tarief, cv en werkervaring ziet. Je telefoonnummer en e-mailadres zijn nooit openbaar; die deel je zelf in een gesprek.'],
    ['Wat is een externe opdracht?', 'Een opdracht van een andere website of vacaturebank. We tonen altijd de bron en de oorspronkelijke aanbieder. Reageren gaat via die aanbieder.'],
    ['Kan Holland Recruitment ook voor mij zoeken?', 'Ja. Kies bij het plaatsen van een opdracht voor bemiddeling. Wij zoeken actief, selecteren kandidaten en voeren de gesprekken. Dat is een betaalde dienst: je betaalt alleen als je kiest voor bemiddeling, en het tarief spreken we vooraf met je af. Zelf zoeken via het platform is de eerste 6 maanden helemaal gratis.'],
    ['Regelt Holland Recruitment contracten of facturen?', 'Bij zelf zoeken via het platform niet: jullie maken rechtstreeks afspraken. Bij bemiddeling regelen we de afspraken met je mee.'],
  ];
  return (
    <>
      <section style={{ background: 'linear-gradient(180deg,var(--cream) 0%,#fff 100%)', padding: 'clamp(40px,7vw,80px) 0 36px' }}>
        <div className="p-wrap" style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span className="p-row" style={{ gap: 9, fontFamily: 'Poppins', fontWeight: 700, fontSize: 13, padding: '8px 15px', borderRadius: 100, background: '#fff', border: '1.5px solid var(--line)' }}>
            <span className="p-dot nu" aria-hidden="true" />De eerste 6 maanden alles gratis
          </span>
          <h1 className="p-h1" style={{ margin: '22px 0 18px', maxWidth: 900 }}>De juiste freelancer vinden. Of jouw volgende opdracht.</h1>
          <p style={{ fontSize: 19, color: 'var(--muted)', maxWidth: 660 }}>Ontdek zelfstandige professionals, bekijk freelance opdrachten en kom rechtstreeks met elkaar in contact. Snel, eenvoudig en helemaal gratis.</p>
          <div className="p-seg" role="tablist" aria-label="Wat zoek je?" style={{ marginTop: 32 }}>
            <Link role="tab" aria-selected={voorFreelancers} className={voorFreelancers ? 'on' : ''} href="/freelance-platform?zoek=freelancers" scroll={false}>Ik zoek een freelancer</Link>
            <Link role="tab" aria-selected={!voorFreelancers} className={!voorFreelancers ? 'on' : ''} href="/freelance-platform?zoek=opdrachten" scroll={false}>Ik zoek een opdracht</Link>
          </div>
          <form action={voorFreelancers ? '/freelancers-zoeken' : '/opdrachten'} method="get" role="search"
            style={{ marginTop: 16, width: '100%', maxWidth: 880, background: '#fff', border: '1.5px solid var(--line)', borderRadius: 22, boxShadow: 'var(--shadow-sm)', padding: 8, display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) auto', alignItems: 'center', textAlign: 'left', gap: 4 }} className="p-herobar">
            <label style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column' }}><span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 13 }}>Functie of vaardigheid</span>
              <input name="q" placeholder={voorFreelancers ? 'Bijvoorbeeld Maintenance Engineer' : 'Bijvoorbeeld Interim Projectmanager'} style={{ border: 0, padding: '2px 0', fontSize: 16, background: 'transparent', outlineOffset: 4 }} /></label>
            <label style={{ padding: '8px 16px', borderLeft: '1.5px solid var(--line)', display: 'flex', flexDirection: 'column' }}><span style={{ fontFamily: 'Poppins', fontWeight: 600, fontSize: 13 }}>Waar</span>
              <input name={voorFreelancers ? 'regio' : 'locatie'} placeholder="Plaats of regio" style={{ border: 0, padding: '2px 0', fontSize: 16, background: 'transparent', outlineOffset: 4 }} /></label>
            <button type="submit" className="btn btn-blue" style={{ minHeight: 54 }}>{voorFreelancers ? 'Zoek freelancers' : 'Bekijk opdrachten'}</button>
          </form>
          <p className="p-small p-muted" style={{ marginTop: 14 }}>Zoeken kan direct, zonder account.</p>
          <div className="p-row" style={{ marginTop: 20, justifyContent: 'center', gap: 8 }}>
            <span className="p-small p-muted">Populair:</span>
            {(voorFreelancers ? POPULAIR_F : POPULAIR_O).map(t => <Link key={t} className="p-chip" href={`${voorFreelancers ? '/freelancers-zoeken' : '/opdrachten'}?q=${encodeURIComponent(t)}`}>{t}</Link>)}
          </div>
        </div>
      </section>

      <section className="p-wrap" style={{ maxWidth: 1180, padding: '8px 26px 40px' }}>
        <div className="p-stack">
          {voorFreelancers ? (fr.items.length > 0 && <>
            <div className="p-between"><strong style={{ fontFamily: 'Poppins', fontSize: 19 }}>Beschikbare freelancers</strong><Link className="p-linkbtn" href="/freelancers-zoeken">Alle freelancers →</Link></div>
            <div className="p-grid3">{fr.items.map(f => <FreelancerKaart key={f.id} f={f} compact />)}</div>
          </>) : (op.items.length > 0 && <>
            <div className="p-between"><strong style={{ fontFamily: 'Poppins', fontSize: 19 }}>Recente opdrachten</strong><Link className="p-linkbtn" href="/opdrachten">Alle opdrachten →</Link></div>
            <div className="p-grid3">{op.items.map(o => <OpdrachtKaart key={o.id} o={o} />)}</div>
          </>)}
          <div className="p-row" style={{ gap: 8, marginTop: 4 }}>
            <span className="p-small p-muted">Vakgebieden:</span>
            {VAKGEBIEDEN.slice(0, 12).map(v => <Link key={v.slug} className="p-chip" href={`${voorFreelancers ? '/freelancers-zoeken' : '/opdrachten'}?vakgebied=${v.slug}`}>{v.naam}</Link>)}
            <Link className="p-chip dark" href={voorFreelancers ? '/freelancers-zoeken#vakgebied' : '/opdrachten#vakgebied'}>Alle 20 →</Link>
          </div>
        </div>
      </section>

      <section id="hoe-werkt-het" className="p-cream">
        <div className="p-wrap p-grid3" style={{ maxWidth: 1180, padding: '36px 26px', gap: 20 }}>
          {[['Zoek', 'Freelancers, opdrachten of bedrijven. Zonder account.'], ['Neem contact op', 'Account in twee stappen, daarna direct een bericht.'], ['Maak afspraken', 'Rechtstreeks, zonder commissie.']].map(([t, s], i) => (
            <div key={t} className="p-row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 14 }}>
              <span style={{ flex: 'none', width: 32, height: 32, borderRadius: '50%', background: i === 2 ? 'var(--lime)' : 'var(--blue)', color: i === 2 ? 'var(--ink)' : '#fff', display: 'grid', placeItems: 'center', fontFamily: 'Poppins', fontWeight: 700 }}>{i + 1}</span>
              <span><strong>{t}</strong><br /><span className="p-muted" style={{ fontSize: 15 }}>{s}</span></span>
            </div>
          ))}
        </div>
      </section>

      <section className="p-wrap" style={{ maxWidth: 1180, paddingTop: 32 }}>
        <div className="p-card p-between" style={{ padding: '22px 24px' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 760 }}>
            <strong style={{ fontFamily: 'Poppins', fontSize: 17 }}>Geen tijd om zelf te zoeken?</strong>
            <span className="p-muted" style={{ fontSize: 15 }}>Laat Holland Recruitment bemiddelen. Wij zoeken, selecteren en voeren de gesprekken. Je betaalt alleen als je kiest voor bemiddeling; het tarief spreken we vooraf met je af.</span>
          </span>
          <Link className="btn btn-line btn-sm" href="/bemiddeling">Vraag bemiddeling aan</Link>
        </div>
      </section>

      <section className="p-narrow" style={{ padding: '40px 26px' }}>
        <div style={{ margin: '0 0 18px' }}><div className="p-eyebrow">Veelgestelde vragen</div><h2 className="p-h2" style={{ marginTop: 6 }}>Goed om te weten</h2></div>
        <div className="p-faq">{faq.map(([vr, an], i) => <details key={vr} open={i === 0}><summary>{vr}</summary><p>{an}</p></details>)}</div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }) }} />
      </section>

      <section className="p-wrap" style={{ maxWidth: 1180, paddingBottom: 48 }}>
        <div className="p-between" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 26, padding: 28, gap: 20 }}>
          <div><strong style={{ fontFamily: 'Poppins', fontSize: 22 }}>Klaar om te beginnen?</strong><p style={{ marginTop: 4, color: 'var(--muted-on-dark)' }}>Een account is gratis en staat binnen twee stappen.</p></div>
          {a ? <Link className="btn btn-lime" href="/mijn">Naar mijn overzicht</Link> : <Link className="btn btn-lime" href="/registreren">Maak gratis account</Link>}
        </div>
      </section>

      <section className="p-wrap" style={{ maxWidth: 1180, paddingBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Populaire zoekopdrachten</h2>
        <div className="p-row" style={{ gap: 8 }}>{SEO_LINKS.map(([v, r, l]) => <Link key={l} className="p-chip" href={`/freelancers-zoeken/${v}/${r}`}>{l}</Link>)}</div>
      </section>
    </>
  );
}
