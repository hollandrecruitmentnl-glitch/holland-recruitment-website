import Link from 'next/link';
import { huidigAccount } from '@/lib/auth';
import { one } from '@/lib/db';
import { zoekFreelancers } from '@/lib/data/freelancers';
import { Avatar } from '@/components/Kaarten';
import { zoekOpdrachten, tariefTekst } from '@/lib/data/opdrachten';
import { BEMIDDELING_URL, REG_BEDRIJF, REG_FREELANCER } from '@/lib/navigatie';
import { werkvormNaam, LOGO_STROOK_MIN, EERDERE_SAMENWERKINGEN } from '@/lib/constants';
import { relatief } from '@/lib/util';
import { logoStrook } from '@/lib/data/bedrijven';


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

/** Engelstalige remote-feeds tonen we niet op de home (wel bij Opdrachten). */
const ALLEEN_OP_OPDRACHTEN = new Set(['jobicy', 'remotive', 'remoteok']);

/**
 * Home (V33, na de conversie-audit van 14-10-2026): rustig, zoeken blijft de hoofdactie,
 * per doelgroep één duidelijke registratieknop en bemiddeling altijd direct bereikbaar.
 */
export default async function HomeView({ sp, basis = '/' }: { sp: Record<string, string>; basis?: string }) {
  const a = await huidigAccount();
  const voorOpdrachten = sp.zoek === 'opdrachten' || (sp.zoek !== 'freelancers' && a?.rol === 'freelancer');
  const [fr, op, tel, logos] = await Promise.all([
    zoekFreelancers({ perPagina: 3 }, a),
    zoekOpdrachten({ perPagina: 24, sorteer: 'relevant' }),
    one<{ opdrachten: number; freelancers: number }>(`select
      (select count(*) from opdrachten o left join bedrijven b on b.id = o.bedrijf_id where o.status = 'live' and (o.bedrijf_id is null or b.status = 'actief') and (o.reageren_tot is null or o.reageren_tot >= current_date))::int as opdrachten,
      (select count(*) from freelancers f join accounts ac on ac.id = f.id where ac.status = 'actief' and f.functietitel <> '')::int as freelancers`),
    logoStrook().catch(() => []),
  ]);
  const opdrachten = op.items.filter(o => !ALLEEN_OP_OPDRACHTEN.has(o.bron)).slice(0, 3);
  const faq: [string, string][] = [
    ['Wat kost het?', 'Het platform is gratis; de eerste 6 maanden is alles gratis. U betaalt alleen als u kiest voor bemiddeling. Dan geldt een vast uurtarief per professional, dat we vooraf met u afspreken. Aan een aanvraag of kennismaking zijn geen kosten verbonden.'],
    ['Zelf zoeken of laten zoeken: wat is het verschil?', 'Op het platform zoekt u zelf tussen profielen en neemt u direct contact op; dat is gratis. Bij bemiddeling bespreekt u de opdracht met een recruiter, die een beperkte selectie van passende professionals voorstelt en het traject begeleidt.'],
    ['Ik ben freelancer. Wat kost een profiel?', 'Een profiel is gratis. Je bekijkt opdrachten, reageert direct en bedrijven kunnen je vinden. Wil je ook voorgesteld worden door onze recruiters? Zet dat aan in je profiel.'],
    ['Hoe weet ik dat een bedrijf echt bestaat?', 'Elk bedrijf meldt zich aan met een KvK-nummer en een zakelijk e-mailadres. Bij misbruik blokkeren we het account.'],
  ];
  const zoekUrl = voorOpdrachten ? '/opdrachten' : '/freelancers-zoeken';
  const bedrijfKnop = a?.rol === 'bedrijf' ? '/mijn/opdrachten/nieuw' : REG_BEDRIJF;
  const freelancerKnop = a?.rol === 'freelancer' ? '/mijn/profiel' : REG_FREELANCER;
  return (
    <>
      <section className="h-hero">
        <div className="p-wrap h-hero-in">
          <span className="p-eyebrow">Freelance &amp; interim · heel Nederland</span>
          <h1 className="p-h1 h-titel">De juiste freelancer. Of je volgende opdracht.</h1>
          <p className="h-lead">Gratis platform voor bedrijven en zzp'ers. Liever niet zelf zoeken? Dan selecteren onze recruiters voor u.</p>
          <div className="p-seg" role="tablist" aria-label="Wat zoekt u?">
            <Link role="tab" aria-selected={!voorOpdrachten} className={!voorOpdrachten ? 'on' : ''} href={`${basis}?zoek=freelancers`} scroll={false}>Freelancers zoeken</Link>
            <Link role="tab" aria-selected={voorOpdrachten} className={voorOpdrachten ? 'on' : ''} href={`${basis}?zoek=opdrachten`} scroll={false}>Opdrachten zoeken</Link>
          </div>
          <form action={zoekUrl} method="get" role="search" className="h-zoek">
            <label><span>Functie of vaardigheid</span><input name="q" placeholder={voorOpdrachten ? 'Bijvoorbeeld projectmanager' : 'Bijvoorbeeld maintenance engineer'} enterKeyHint="search" /></label>
            <label><span>Waar</span><input name={voorOpdrachten ? 'locatie' : 'regio'} placeholder="Plaats of regio" enterKeyHint="search" /></label>
            <button type="submit" className="btn btn-blue">Zoeken</button>
          </form>
          {!a && <p className="h-nieuw">Zoeken kan zonder account. Nieuw hier? <Link href={REG_BEDRIJF}>Ik zoek een freelancer →</Link><Link href={REG_FREELANCER}>Ik ben freelancer →</Link></p>}
          <p className="h-trust">
            <span><b>KvK</b> 96618914</span><span><b>Rotterdam</b>, landelijk actief</span><span><b>Reactie</b> binnen één werkdag</span>
            {(tel?.opdrachten ?? 0) >= 10 && <span><b>{tel!.opdrachten}</b> opdrachten live</span>}
            {(tel?.freelancers ?? 0) >= 50 && <span><b>{tel!.freelancers}</b> freelancers</span>}
          </p>
          {logos.length >= LOGO_STROOK_MIN && EERDERE_SAMENWERKINGEN.length > 0 && <p className="h-ref"><span>Eerder samengewerkt met</span> {EERDERE_SAMENWERKINGEN.map((n, i) => <b key={n}>{i > 0 && <i aria-hidden="true"> · </i>}{n}</b>)}</p>}
        </div>
      </section>

      {logos.length >= LOGO_STROOK_MIN && (
        <section className="p-wrap h-logos" aria-labelledby="h-logos">
          <h2 id="h-logos" className="h-logos-kop">Bedrijven op ons platform</h2>
          <ul className="h-logos-rij">
            {logos.map(l => (
              <li key={l.id}><Link href={`/bedrijf/${l.slug}`} title={l.naam}>
                <img src={`/bestand/logo/${l.id}?w=200&v=${encodeURIComponent(String(l.logo_pad).split('/').pop() || '')}`} alt={l.naam} loading="lazy" decoding="async" />
              </Link></li>
            ))}
          </ul>
          {a?.rol !== 'bedrijf' && a?.rol !== 'freelancer' && <p className="h-logos-cta"><Link className="p-link" href={REG_BEDRIJF}>Ook uw bedrijf hier? Maak een gratis account →</Link></p>}
        </section>
      )}

      <section className="p-wrap h-sectie" aria-labelledby="h-zo">
        <div className="h-kop"><span className="p-eyebrow">Zo werkt het</span><h2 id="h-zo" className="p-h2">Twee kanten, één platform</h2></div>
        <div className="h-twee">
          <div className="h-paneel">
            <h3 className="p-h3">Voor bedrijven</h3>
            <ol className="h-stap">
              <li><span>1</span><div><b>Plaats gratis uw opdracht</b><em>Of zoek zelf in de profielen van freelancers.</em></div></li>
              <li><span>2</span><div><b>Ontvang reacties</b><em>Freelancers reageren direct bij u.</em></div></li>
              <li><span>3</span><div><b>Kies en start</b><em>U maakt zelf de afspraken met de freelancer.</em></div></li>
            </ol>
            <div className="h-paneel-acties"><Link className="btn btn-blue" href={bedrijfKnop}>Gratis opdracht plaatsen</Link><Link className="p-link" href={BEMIDDELING_URL}>Liever dat wij zoeken? Laat ons bemiddelen →</Link></div>
          </div>
          <div className="h-paneel">
            <h3 className="p-h3">Voor freelancers</h3>
            <ol className="h-stap">
              <li><span>1</span><div><b>Maak een gratis profiel</b><em>Met je vakgebied, tarief en beschikbaarheid.</em></div></li>
              <li><span>2</span><div><b>Word gevonden</b><em>Bedrijven zoeken op het platform en sturen je een bericht.</em></div></li>
              <li><span>3</span><div><b>Reageer op opdrachten</b><em>Elke dag komen er nieuwe opdrachten bij.</em></div></li>
            </ol>
            <div className="h-paneel-acties"><Link className="btn btn-ink" href={freelancerKnop}>{a?.rol === 'freelancer' ? 'Naar mijn profiel' : 'Gratis profiel maken'}</Link><Link className="p-link" href="/opdrachten">Eerst de opdrachten bekijken →</Link></div>
          </div>
        </div>
      </section>

      <section className="p-wrap h-sectie" aria-labelledby="h-live">
        <div className="h-kop"><span className="p-eyebrow">Live</span><h2 id="h-live" className="p-h2">Nieuw op het platform</h2></div>
        <div className="h-live2">
          <div>
            <div className="h-livekop"><h3 className="p-h3">Opdrachten</h3><Link className="p-link" href="/opdrachten">Alle opdrachten →</Link></div>
            <ul className="h-lijst">
              {opdrachten.map(o => (
                <li key={o.id}><Link href={`/opdrachten/${o.slug}`}>
                  <small>{[o.bron === 'direct' ? o.bedrijf_naam : o.aanbieder, o.locatie || (o.werkvorm === 'remote' ? 'Remote' : ''), werkvormNaam(o.werkvorm)].filter(Boolean).join(' · ')}</small>
                  <strong>{o.titel}</strong>
                  <span>{[tariefTekst(o as any) !== 'Tarief niet vermeld' ? tariefTekst(o as any) : '', `geplaatst ${relatief(o.geplaatst_op)}`].filter(Boolean).join(' · ')}</span>
                </Link></li>
              ))}
            </ul>
          </div>
          {fr.items.length > 0 && (
            <div>
              <div className="h-livekop"><h3 className="p-h3">Freelancers</h3><Link className="p-link" href="/freelancers-zoeken">Alle freelancers →</Link></div>
              <ul className="h-lijst">
                {fr.items.map(f => (
                  <li key={f.id}><Link href={`/freelancer/${f.slug}`} className="h-fl">
                    <Avatar id={f.id} foto={f.foto_pad} voornaam={f.voornaam} achternaam={f.achternaam} />
                    <span><strong>{f.voornaam} {f.achternaam}</strong><small>{[f.functietitel, f.regio].filter(Boolean).join(' · ')}</small></span>
                  </Link></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="p-wrap h-sectie" aria-labelledby="h-bem">
        <div className="h-band">
          <div>
            <span className="p-eyebrow" style={{ color: 'var(--lime)' }}>Bemiddeling</span>
            <h2 id="h-bem" className="p-h2">Geen tijd om zelf te zoeken?</h2>
            <p>Een recruiter bespreekt uw opdracht, selecteert passende professionals en begeleidt het traject. Eén aanspreekpunt, één factuur en een vooraf afgesproken tarief.</p>
          </div>
          <div className="h-band-acties"><Link className="btn btn-lime" href={BEMIDDELING_URL}>Vind een professional</Link><a className="h-band-link" href={CAL_URL} target="_blank" rel="noopener">Of plan een kennismaking van 30 min →</a></div>
        </div>
      </section>

      <section className="p-wrap h-sectie" aria-labelledby="h-vak">
        <div className="h-kop"><span className="p-eyebrow">Vakgebieden</span><h2 id="h-vak" className="p-h2">Professionals in tien vakgebieden</h2></div>
        <div className="h-chips">{EXPERTISES.map(([slug, naam]) => <Link key={slug} href={`/expertises/${slug}`}>{naam}</Link>)}</div>
      </section>

      <section className="p-wrap h-sectie" aria-labelledby="h-faq">
        <div className="h-kop"><span className="p-eyebrow">Veelgestelde vragen</span><h2 id="h-faq" className="p-h2">Goed om te weten</h2></div>
        <div className="p-faq h-faq">{faq.map(([vr, an]) => <details key={vr}><summary>{vr}</summary><p>{an}</p></details>)}</div>
      </section>

      <section className="h-slot2">
        <div className="p-wrap">
          <h2 className="p-h2">Klaar om te beginnen?</h2>
          {a?.rol ? <div className="h-slot-knoppen"><Link className="btn btn-blue" href="/mijn">Naar mijn overzicht</Link></div> : (
            <div className="h-slot-knoppen"><Link className="btn btn-blue" href={REG_BEDRIJF}>Ik zoek een freelancer →</Link><Link className="btn btn-line" href={REG_FREELANCER}>Ik ben freelancer →</Link></div>
          )}
          <p className="h-slot-bem">Liever dat wij voor u zoeken? <Link className="p-link" href={BEMIDDELING_URL}>Vraag bemiddeling aan</Link></p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, an]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: an } })) },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Holland Recruitment', url: 'https://www.holland-recruitment.nl/',
          potentialAction: { '@type': 'SearchAction', target: 'https://www.holland-recruitment.nl/opdrachten?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'Holland Recruitment BV', url: 'https://www.holland-recruitment.nl/', logo: 'https://www.holland-recruitment.nl/favicon-512x512.png',
          email: 'info@holland-recruitment.nl', address: { '@type': 'PostalAddress', addressLocality: 'Rotterdam', addressCountry: 'NL' },
          sameAs: ['https://www.linkedin.com/company/hollandrecruitment/', 'https://www.instagram.com/hollandrecruitment/'] },
      ]) }} />
    </>
  );
}
