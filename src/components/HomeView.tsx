import Link from 'next/link';
import { huidigAccount } from '@/lib/auth';
import { one } from '@/lib/db';
import { zoekFreelancers } from '@/lib/data/freelancers';
import { zoekOpdrachten } from '@/lib/data/opdrachten';
import { FreelancerKaart, OpdrachtKaart } from '@/components/Kaarten';


const CAL_URL = 'https://cal.eu/holland-recruitment/30min';
const EXPERTISES: [string, string, string, string][] = [
  ['sales-business-development', 'Sales & Business Development', 'Commerciële professionals die pipeline opbouwen, deals sluiten en nieuwe markten openen.', 'sales-accountmanagement'],
  ['marketing-digital', 'Marketing & Digital', 'Specialisten in online groei: van SEO en performance tot content en social.', 'marketing-communicatie'],
  ['it-data', 'IT & Data', 'Developers, data-specialisten en IT-consultants voor projecten en tijdelijke capaciteit.', 'it-software'],
  ['finance', 'Finance', 'Controllers, financieel consultants en finance managers voor afsluitingen, projecten en interim.', 'finance-control'],
  ['engineering-technical', 'Engineering & Technical', 'Engineers, technisch projectmanagers en technisch consultants.', 'engineering'],
  ['petrochemie-industrie', 'Petrochemie & Industrie', 'Operators, maintenance- en E&I-technici en industrieel monteurs.', 'techniek-onderhoud'],
  ['operations-projectmanagement', 'Operations & Project Management', 'Projectmanagers, operations managers en interim managers.', 'projectmanagement'],
  ['zorg-welzijn', 'Zorg & Welzijn', 'Verzorgenden, verpleegkundigen en begeleiders.', 'zorg-welzijn'],
  ['onderwijs', 'Onderwijs', 'Leerkrachten, docenten en interim schoolleiders.', 'onderwijs-training'],
  ['transport-logistiek', 'Transport & Logistiek', 'Chauffeurs, planners en interim logistiek managers.', 'logistiek-supply-chain'],
];

/** Inhoud van de home. `basis` is het pad waarop de home staat (voor de tabbladen). */
export default async function HomeView({ sp, basis = '/' }: { sp: Record<string, string>; basis?: string }) {
  const a = await huidigAccount();
  const voorOpdrachten = sp.zoek === 'opdrachten' || (sp.zoek !== 'freelancers' && a?.rol === 'freelancer');
  const [fr, op, tel] = await Promise.all([
    zoekFreelancers({ perPagina: 3 }, a),
    zoekOpdrachten({ perPagina: 5 }),
    one<{ opdrachten: number; freelancers: number }>(`select
      (select count(*) from opdrachten o left join bedrijven b on b.id = o.bedrijf_id where o.status = 'live' and (o.bedrijf_id is null or b.status = 'actief') and (o.reageren_tot is null or o.reageren_tot >= current_date))::int as opdrachten,
      (select count(*) from freelancers f join accounts ac on ac.id = f.id where ac.status = 'actief' and f.functietitel <> '')::int as freelancers`),
  ]);
  const faq: [string, string][] = [
    ['Zelf zoeken of laten zoeken: wat is het verschil?', 'Op het platform zoekt u zelf tussen profielen en neemt u direct contact op; dat is gratis. Bij bemiddeling bespreekt u de opdracht met een recruiter, die een beperkte selectie van passende professionals voorstelt en het traject begeleidt.'],
    ['Wat kost het?', 'Het platform is gratis; de eerste 6 maanden is alles gratis. U betaalt alleen als u kiest voor bemiddeling. Dan geldt een vast uurtarief per professional, dat we vooraf met u afspreken. Aan een aanvraag of kennismaking zijn geen kosten verbonden.'],
    ['Hoe werkt de facturatie bij bemiddeling?', 'U ontvangt één factuur van Holland Recruitment op basis van goedgekeurde uren en het afgesproken uurtarief. De professional factureert aan ons.'],
    ['Ik ben freelancer. Wat kost een profiel?', 'Een profiel is gratis. Je bekijkt opdrachten, reageert direct en bedrijven kunnen je vinden. Wil je ook voorgesteld worden door onze recruiters? Zet dat aan in je profiel.'],
    ['Hoe weet ik dat een bedrijf echt bestaat?', 'Elk bedrijf meldt zich aan met een KvK-nummer en een zakelijk e-mailadres. Bij misbruik blokkeren we het account.'],
  ];
  const zoekUrl = voorOpdrachten ? '/opdrachten' : '/freelancers-zoeken';
  return (
    <>
      <section className="h-hero">
        <div className="p-wrap h-hero-in">
          <span className="h-chip"><span className="p-dot nu" aria-hidden="true" />Freelance & interim · heel Nederland</span>
          <h1 className="p-h1 h-titel">De juiste freelance professional. Zonder lange zoektocht.</h1>
          <p className="h-lead">Zoek zelf op ons gratis platform, of laat onze recruiters de selectie doen. Ben je freelancer? Vind opdrachten in heel Nederland.</p>
          <div className="p-seg" role="tablist" aria-label="Wat zoekt u?">
            <Link role="tab" aria-selected={!voorOpdrachten} className={!voorOpdrachten ? 'on' : ''} href={`${basis}?zoek=freelancers`} scroll={false}>Ik zoek een freelancer</Link>
            <Link role="tab" aria-selected={voorOpdrachten} className={voorOpdrachten ? 'on' : ''} href={`${basis}?zoek=opdrachten`} scroll={false}>Ik zoek een opdracht</Link>
          </div>
          <form action={zoekUrl} method="get" role="search" className="h-zoek">
            <label><span>Functie of vaardigheid</span><input name="q" placeholder={voorOpdrachten ? 'Bijvoorbeeld projectmanager' : 'Bijvoorbeeld maintenance engineer'} enterKeyHint="search" /></label>
            <label><span>Waar</span><input name={voorOpdrachten ? 'locatie' : 'regio'} placeholder="Plaats of regio" enterKeyHint="search" /></label>
            <button type="submit" className="btn btn-blue">{voorOpdrachten ? 'Bekijk opdrachten' : 'Zoek freelancers'}</button>
          </form>
          <p className="h-teller"><strong>{tel?.opdrachten ?? 0}</strong> opdrachten live · <strong>{tel?.freelancers ?? 0}</strong> freelancers · zoeken kan zonder account</p>
        </div>
      </section>

      <section className="p-wrap h-sectie" aria-labelledby="routes">
        <h2 id="routes" className="sr-only">Twee manieren om een professional te vinden</h2>
        <div className="h-routes">
          <div className="h-route">
            <span className="h-badge">Gratis</span>
            <h3 className="p-h3">Zelf zoeken op het platform</h3>
            <p>Bekijk profielen, filter op vakgebied, regio en beschikbaarheid en stuur direct een bericht. De eerste 6 maanden is alles gratis.</p>
            <div className="h-knoppen"><Link className="btn btn-blue" href="/freelancers-zoeken">Freelancers zoeken</Link><Link className="btn btn-line" href={a ? '/mijn/opdrachten/nieuw' : '/registreren?rol=bedrijf&terug=%2Fmijn%2Fopdrachten%2Fnieuw'}>Opdracht plaatsen</Link></div>
          </div>
          <div className="h-route h-route-donker">
            <span className="h-badge lime">Bemiddeling</span>
            <h3 className="p-h3">Laat ons zoeken</h3>
            <p>Een recruiter bespreekt uw opdracht, selecteert passende professionals en begeleidt het traject. Eén aanspreekpunt, één factuur en een vooraf afgesproken tarief. Reactie binnen één werkdag.</p>
            <div className="h-knoppen"><Link className="btn btn-lime" href="/professional-aanvragen">Vind een professional</Link><Link className="btn h-btn-licht" href="/werkwijze">Zo werkt het</Link></div>
          </div>
        </div>
      </section>

      <section className="p-wrap h-sectie">
        <div className="h-live">
          <div className="p-stack">
            <div className="p-between"><h2 className="p-h3">Nieuwste opdrachten</h2><Link className="p-linkbtn" href="/opdrachten">Alle opdrachten →</Link></div>
            {op.items.map(o => <OpdrachtKaart key={o.id} o={o} />)}
          </div>
          {fr.items.length > 0 && (
            <div className="p-stack">
              <div className="p-between"><h2 className="p-h3">Beschikbare freelancers</h2><Link className="p-linkbtn" href="/freelancers-zoeken">Alle →</Link></div>
              {fr.items.map(f => <FreelancerKaart key={f.id} f={f} compact />)}
            </div>
          )}
        </div>
      </section>

      <section className="h-cream">
        <div className="p-wrap h-sectie">
          <div className="h-kop"><span className="p-eyebrow">Expertises</span><h2 className="p-h2">Professionals in tien vakgebieden</h2></div>
          <div className="h-exp">
            {EXPERTISES.map(([slug, naam, tekst, vak]) => (
              <div key={slug} className="h-exp-kaart">
                <Link className="h-exp-naam" href={`/expertises/${slug}`}>{naam}</Link>
                <p>{tekst}</p>
                <span className="h-exp-links"><Link href={`/freelance-opdrachten/${vak}`}>Opdrachten</Link><Link href={`/freelancers-zoeken?vakgebied=${vak}`}>Freelancers</Link></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="p-wrap h-sectie">
        <div className="h-kop"><span className="p-eyebrow">Bemiddeling</span><h2 className="p-h2">Van aanvraag tot start in vier stappen</h2></div>
        <ol className="h-stappen">
          {[['Vertel ons wat u zoekt', 'In een kort gesprek of via het formulier: de opdracht, de planning en de gewenste expertise.'],
            ['Wij selecteren', 'Een recruiter zoekt en spreekt professionals en stelt een beperkte selectie voor, met een toelichting per profiel.'],
            ['Kennismaken en kiezen', 'U spreekt de kandidaten en kiest zelf.'],
            ['Start en begeleiding', 'Wij regelen de afspraken en blijven het aanspreekpunt tijdens de opdracht.']].map(([t, s], i) => (
            <li key={t}><span className="h-nr">{i + 1}</span><strong>{t}</strong><span>{s}</span></li>
          ))}
        </ol>
      </section>

      <section className="p-wrap h-sectie">
        <div className="h-freelancer">
          <div>
            <span className="p-eyebrow" style={{ color: 'var(--lime)' }}>Voor freelancers</span>
            <h2 className="p-h2" style={{ color: '#fff', marginTop: 6 }}>Freelancer of interim professional?</h2>
            <p>Maak een gratis profiel, bekijk opdrachten en reageer direct. Wil je ook voorgesteld worden door onze recruiters? Zet dat aan in je profiel.</p>
          </div>
          <div className="h-knoppen"><Link className="btn btn-lime" href={a?.rol === 'freelancer' ? '/mijn/profiel' : '/registreren?rol=freelancer'}>{a?.rol === 'freelancer' ? 'Naar mijn profiel' : 'Maak gratis profiel'}</Link><Link className="btn h-btn-licht" href="/opdrachten">Bekijk opdrachten</Link></div>
        </div>
      </section>

      <section className="p-narrow h-sectie">
        <div className="h-kop"><span className="p-eyebrow">Veelgestelde vragen</span><h2 className="p-h2">Goed om te weten</h2></div>
        <div className="p-faq">{faq.map(([vr, an], i) => <details key={vr} open={i === 0}><summary>{vr}</summary><p>{an}</p></details>)}</div>
      </section>

      <section className="p-wrap" style={{ paddingBottom: 48 }}>
        <div className="h-slot">
          <div><strong>Op zoek naar specialistische capaciteit?</strong><p>Vertel ons kort wie u zoekt. We nemen binnen één werkdag contact met u op.</p></div>
          <div className="h-knoppen"><Link className="btn btn-lime" href="/professional-aanvragen">Vind een professional</Link><a className="btn h-btn-licht" href={CAL_URL} target="_blank" rel="noopener">Plan 30 min kennismaking</a></div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, an]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: an } })) },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Holland Recruitment', url: 'https://www.holland-recruitment.nl/',
          potentialAction: { '@type': 'SearchAction', target: 'https://www.holland-recruitment.nl/opdrachten?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'Holland Recruitment BV', url: 'https://www.holland-recruitment.nl/', logo: 'https://www.holland-recruitment.nl/favicon-512x512.png',
          email: 'info@holland-recruitment.nl', address: { '@type': 'PostalAddress', streetAddress: 'Brielselaan 278', postalCode: '3081 LR', addressLocality: 'Rotterdam', addressCountry: 'NL' },
          sameAs: ['https://www.linkedin.com/company/hollandrecruitment/', 'https://www.instagram.com/hollandrecruitment/'] },
      ]) }} />
    </>
  );
}
