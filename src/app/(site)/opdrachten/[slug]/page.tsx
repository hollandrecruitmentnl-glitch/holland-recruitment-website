import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { huidigAccount } from '@/lib/auth';
import { opdrachtDetail, tariefTekst, urenTekst } from '@/lib/data/opdrachten';
import { Bronlabel, Logo } from '@/components/Kaarten';
import Reageren from '@/components/Reageren';
import BerichtStarter from '@/components/BerichtStarter';
import { BRON_NAAM, BRON_SITE, PERSPECTIEF, REACTIETERMIJN, vakgebiedNaam, vakKlein, werkvormNaam } from '@/lib/constants';
import { datumNL, relatief } from '@/lib/util';
import { one } from '@/lib/db';

type P = { params: Promise<{ slug: string }> };
const zichtbaar = (o: any, a: any) => o && (['live', 'gesloten', 'verlopen'].includes(o.status) && o.bedrijf_status !== 'geblokkeerd' || a?.rol === 'beheer' || (a?.bedrijf_id && a.bedrijf_id === o.bedrijf_id));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = await opdrachtDetail((await params).slug);
  if (!o || !['live', 'gesloten', 'verlopen'].includes(o.status)) return { robots: { index: false } };
  const org = o.bron === 'direct' ? o.bedrijf_naam : o.aanbieder;
  return {
    title: `${o.titel}${o.locatie ? ' in ' + o.locatie : ''} · freelance opdracht`,
    description: `${o.titel}${org ? ' bij ' + org : ''}${o.locatie ? ', ' + o.locatie : ''}. ${o.omschrijving.slice(0, 110)}`.slice(0, 158),
    alternates: { canonical: `/opdrachten/${o.slug}` },
    robots: o.status !== 'live' || o.bron !== 'direct' ? { index: false, follow: true } : undefined,
  };
}

export default async function Opdracht({ params }: P) {
  const { slug } = await params;
  const a = await huidigAccount();
  const o = await opdrachtDetail(slug);
  if (!o || !zichtbaar(o, a)) notFound();
  const extern = o.bron !== 'direct';
  const verlopen = o.status === 'verlopen' || (o.reageren_tot && new Date(o.reageren_tot + 'T23:59:59') < new Date() && o.status === 'live');
  const gesloten = o.status === 'gesloten';
  const open = o.status === 'live' && !verlopen;
  const eigen = !!a?.bedrijf_id && a.bedrijf_id === o.bedrijf_id;
  const mijnReactie = a?.rol === 'freelancer' ? await one('select status, aangemaakt from reacties where opdracht_id = $1 and freelancer_id = $2', [o.id, a.id]) : null;
  const fr = a?.rol === 'freelancer' ? await one('select cv_pad, functietitel, uurtarief, beschikbaarheid, beschikbaar_vanaf::text from freelancers where id = $1', [a.id]) : null;
  const org = extern ? o.aanbieder : o.bedrijf_naam;
  const feiten: [string, string][] = [
    ['Tarief', tariefTekst(o)],
    ['Start', o.start_asap ? 'Zo snel mogelijk' : o.start_datum ? datumNL(o.start_datum) : 'Startdatum niet vermeld'],
    ['Vakgebied', vakgebiedNaam(o.vakgebied) || '–'],
    ['Uren', urenTekst(o)],
    ['Looptijd', o.looptijd_onbekend ? 'Nog niet bekend' : o.looptijd_n ? `${o.looptijd_n} ${o.looptijd_eenheid}` : 'Niet vermeld'],
    ...(o.werkvorm ? [['Werkvorm', werkvormNaam(o.werkvorm) + (o.werkvorm === 'hybride' && o.dagen_op_locatie ? ` · ${o.dagen_op_locatie} ${o.dagen_op_locatie === 1 ? 'dag' : 'dagen'} op locatie` : '')] as [string, string]] : []),
  ];
  const jsonLd = !extern && open ? {
    '@context': 'https://schema.org', '@type': 'JobPosting', title: o.titel, description: `<p>${o.omschrijving.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`,
    datePosted: o.geplaatst_op, validThrough: o.reageren_tot ? `${o.reageren_tot}T23:59:59+01:00` : undefined, employmentType: 'CONTRACTOR',
    hiringOrganization: { '@type': 'Organization', name: o.bedrijf_naam }, directApply: true,
    ...(o.werkvorm === 'remote' ? { jobLocationType: 'TELECOMMUTE', applicantLocationRequirements: { '@type': 'Country', name: 'NL' } } : { jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: o.locatie, addressCountry: 'NL' } } }),
    ...(o.tarief_min || o.tarief_max ? { baseSalary: { '@type': 'MonetaryAmount', currency: 'EUR', value: { '@type': 'QuantitativeValue', minValue: o.tarief_min ?? undefined, maxValue: o.tarief_max ?? undefined, unitText: 'HOUR' } } } : {}),
  } : null;
  return (
    <div className="p-wrap">
      <p style={{ paddingTop: 20 }} className="p-small"><Link className="p-link" href="/opdrachten">← Terug naar opdrachten</Link>{o.vakgebied && vakgebiedNaam(o.vakgebied) && <> · <Link className="p-link" href={`/freelance-opdrachten/${o.vakgebied}`}>Meer opdrachten in {vakKlein(vakgebiedNaam(o.vakgebied))}</Link></>}</p>
      {gesloten && <p className="p-note" style={{ marginTop: 12 }} role="status"><strong>Deze opdracht is gesloten.</strong> Reageren kan niet meer. <Link className="p-link" href={`/opdrachten?vakgebied=${o.vakgebied || ''}`}>Bekijk vergelijkbare opdrachten</Link></p>}
      {verlopen && !gesloten && <p className="p-note" style={{ marginTop: 12 }} role="status"><strong>Deze opdracht is verlopen.</strong> {extern ? 'De aanbieder biedt hem niet meer aan.' : 'De reactietermijn is voorbij.'} <Link className="p-link" href={`/opdrachten?vakgebied=${o.vakgebied || ''}`}>Bekijk vergelijkbare opdrachten</Link></p>}
      {eigen && o.status !== 'live' && <p className="p-note" style={{ marginTop: 12 }}>Status: <strong>{o.status === 'in_controle' ? 'In controle' : o.status}</strong>. Alleen uw team ziet deze pagina.</p>}
      <div className="p-detail">
        <article className="p-stack" style={{ gap: 22 }}>
          <Bronlabel o={o} />
          <h1 className="p-h2" style={{ fontSize: 'clamp(30px,4vw,44px)' }}>{o.titel}</h1>
          <p className="p-muted">{[org, o.locatie, werkvormNaam(o.werkvorm), `geplaatst ${relatief(o.geplaatst_op || o.aangemaakt)}`].filter(Boolean).join(' · ')}</p>
          {o.omschrijving && <section><h2 className="sr-only">Omschrijving</h2><p className="p-prose">{o.omschrijving}</p>{extern && <p className="p-small p-muted" style={{ marginTop: 10 }}>Dit is een fragment. De volledige omschrijving staat bij de aanbieder.</p>}</section>}
          {o.meebrengen && <section><h2 className="p-h3" style={{ marginBottom: 8 }}>Wat je meebrengt</h2><p className="p-prose">{o.meebrengen}</p></section>}
          {(o.vaardigheden?.length > 0 || o.certificeringen?.length > 0 || o.talen?.length > 0 || o.ervaring_jaren) && (
            <section className="p-stack" style={{ gap: 10 }}>
              <h2 className="p-h3">Wie zoeken we</h2>
              {o.ervaring_jaren ? <p>Minimaal {o.ervaring_jaren} jaar ervaring{o.aantal > 1 ? ` · ${o.aantal} professionals` : ''}</p> : o.aantal > 1 ? <p>{o.aantal} professionals</p> : null}
              {o.vaardigheden?.length > 0 && <div className="p-row" style={{ gap: 6 }}>{o.vaardigheden.map((v: string) => <span key={v} className="p-tag">{v}</span>)}</div>}
              {o.certificeringen?.length > 0 && <p className="p-small"><strong>Certificeringen:</strong> {o.certificeringen.join(', ')}</p>}
              {o.talen?.length > 0 && <p className="p-small"><strong>Talen:</strong> {o.talen.join(', ')}</p>}
            </section>
          )}
          {o.perspectief?.length > 0 && <section><h2 className="p-h3" style={{ marginBottom: 8 }}>Perspectief</h2><ul className="p-stack" style={{ gap: 6 }}>{o.perspectief.map((p: string) => <li key={p} className="p-row" style={{ gap: 8 }}><span aria-hidden="true" style={{ color: 'var(--lime-deep)', fontWeight: 800 }}>✓</span>{PERSPECTIEF[p] || p}</li>)}</ul></section>}
          {!extern && (
            <section className="p-card p-stack" style={{ gap: 6 }}>
              <h2 className="p-h3">Reacties</h2>
              {o.reactietermijn && <p>Het bedrijf reageert {REACTIETERMIJN[o.reactietermijn]} op je reactie.</p>}
              {o.reageren_tot && <p>Reageren kan tot <strong>{datumNL(o.reageren_tot)}</strong>.</p>}
              {o.aantal_reacties > 0 && <p className="p-small p-muted">{o.aantal_reacties === 1 ? '1 freelancer reageerde al.' : `${o.aantal_reacties} freelancers reageerden al.`}</p>}
            </section>
          )}
        </article>
        <aside className="p-stack">
          <div className="p-panel p-stack" style={{ gap: 16 }}>
            <dl className="p-facts">{feiten.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            {extern ? (open && <a className="btn btn-line btn-block" href={o.externe_url} target="_blank" rel={o.bron === 'remoteok' ? 'noopener' : 'noopener nofollow'}>Bekijk bij {BRON_NAAM[o.bron] && o.bron !== 'feed' ? BRON_NAAM[o.bron] : 'aanbieder'} ↗</a>)
              : eigen ? <Link className="btn btn-blue btn-block" href={`/mijn/opdrachten/${o.id}`}>Bekijk reacties ({o.aantal_reacties})</Link>
              : a?.rol === 'freelancer' ? (mijnReactie ? <p className="p-ok p-small" role="status">Je hebt gereageerd op {datumNL(mijnReactie.aangemaakt)}. <Link className="p-link" href="/mijn/reacties">Bekijk status</Link></p>
                : open && <a className="btn btn-blue btn-block" href="#reageren">Reageer op deze opdracht</a>)
              : !a && open ? <Link className="btn btn-blue btn-block" href={`/registreren?rol=freelancer&terug=${encodeURIComponent(`/opdrachten/${o.slug}#reageren`)}&ctx=reactie`}>Reageer op deze opdracht</Link>
              : null}
          </div>
          {extern && (
            <div className="p-card p-small p-stack" style={{ gap: 4, borderStyle: 'dashed' }}>
              <strong>Over deze externe opdracht</strong>
              <span>Bron: {BRON_SITE[o.bron] ? <a className="p-link" href={o.externe_url || BRON_SITE[o.bron]} target="_blank" rel="noopener">{BRON_NAAM[o.bron]}</a> : BRON_NAAM[o.bron]}</span>
              {o.aanbieder && <span>Aanbieder: {o.aanbieder}</span>}
              {o.laatst_gecontroleerd && <span>Laatst gecontroleerd: {datumNL(o.laatst_gecontroleerd)}</span>}
              <span className="p-muted">Reageren gaat via de website van de aanbieder. Holland Recruitment is geen partij bij deze opdracht.</span>
            </div>
          )}
          {!extern && o.bedrijf_slug && (
            <Link href={`/bedrijf/${o.bedrijf_slug}`} className="p-card-link"><span className="p-row" style={{ flexWrap: 'nowrap' }}><Logo id={o.bedrijf_id} logo={o.bedrijf_logo} naam={o.bedrijf_naam} /><span><strong>{o.bedrijf_naam}</strong><br /><span className="p-small p-muted">{o.bedrijf_plaats} · Bekijk bedrijf</span></span></span></Link>
          )}
          {a && !eigen && !extern && <Link className="p-link p-xs" href={`/melden?soort=opdracht&id=${o.id}`}>Opdracht melden</Link>}
        </aside>
      </div>
      {!extern && open && a?.rol === 'freelancer' && !mijnReactie && (
        <div style={{ maxWidth: 760, paddingBottom: 48 }}>
          <Reageren opdrachtId={o.id} titel={o.titel} termijn={o.reactietermijn ? REACTIETERMIJN[o.reactietermijn] : ''} profiel={{ functie: fr?.functietitel, tarief: fr?.uurtarief, heeftCv: !!fr?.cv_pad }} />
        </div>
      )}
      {!extern && a?.rol === 'freelancer' && mijnReactie && (
        <div id="reageren" className="p-ok p-stack" role="status" style={{ maxWidth: 760, marginBottom: 18, gap: 4 }}>
          <strong>Je reactie is verstuurd op {datumNL(mijnReactie.aangemaakt)}.</strong>
          <span>{o.reactietermijn ? `Het bedrijf reageert ${REACTIETERMIJN[o.reactietermijn]}.` : 'Het bedrijf neemt contact met je op.'} Je ziet de status bij <Link className="p-link" href="/mijn/reacties">Mijn reacties</Link>.</span>
        </div>
      )}
      {!extern && open && a?.rol === 'freelancer' && mijnReactie && o.bedrijf_id && (
        <div style={{ maxWidth: 760, paddingBottom: 48 }}><BerichtStarter doel="bedrijf" doelId={o.bedrijf_id} opdrachtId={o.id} naam={o.bedrijf_naam} ingelogd magSturen terug={`/opdrachten/${o.slug}`} placeholder="Een vraag over deze opdracht?" /></div>
      )}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </div>
  );
}
