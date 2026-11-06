import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, one } from '@/lib/db';
import { OPDRACHT_STATUS } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import Blokkeer from '../../Blokkeer';
import { zetLogoVerborgen, stuurFreelancerTips } from '@/app/actions/beheer';
import { VAKGEBIEDEN, vakgebiedNaam } from '@/lib/constants';
import { logoStrookAantal } from '@/lib/data/bedrijven';
import { LOGO_STROOK_MIN } from '@/lib/constants';

export default async function BedrijfDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params; const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await one(`select * from bedrijven where id = $1`, [id]); if (!b) notFound();
  const leden = await q(`select a.voornaam, a.achternaam, a.email, a.telefoon, bl.rol, bl.functie, a.email_bevestigd from bedrijf_leden bl join accounts a on a.id = bl.account_id where bl.bedrijf_id = $1`, [id]);
  const ops = await q(`select o.id, o.titel, o.status, o.aangemaakt, (select count(*) from reacties r where r.opdracht_id = o.id)::int as reacties from opdrachten o where o.bedrijf_id = $1 order by o.aangemaakt desc`, [id]);
  const inStrook = await logoStrookAantal();
  // V43: suggesties voor 'Freelancers aanbevelen per e-mail' — eerst het vakgebied van de opdrachten van dit bedrijf, dan de meest complete profielen
  const vakOpdrachten = (await q(`select vakgebied, count(*) n from opdrachten where bedrijf_id = $1 and vakgebied is not null group by 1 order by 2 desc`, [id])).map((r: any) => r.vakgebied);
  const suggesties = await q(`select f.slug, f.functietitel, f.regio, f.vakgebied, f.beschikbaarheid, a.voornaam, left(a.achternaam, 1) as a1,
      (f.foto_pad is not null)::int + (f.cv_pad is not null)::int + (length(f.introductie) > 80)::int as compleet
    from freelancers f join accounts a on a.id = f.id where a.status = 'actief' and f.functietitel <> ''
    order by (f.vakgebied = any($1)) desc, compleet desc, (f.beschikbaarheid = 'nu') desc, f.bijgewerkt desc limit 40`, [vakOpdrachten]);
  const eerderTips = await q(`select aangemaakt, details from logboek where actie = 'freelancer_tips_verstuurd' and object_id = $1 order by aangemaakt desc limit 5`, [id]);
  const tel = await one(`select (select count(*) from gesprekken where bedrijf_id = $1)::int as gesprekken, (select count(*) from gesprekken where bedrijf_id = $1 and statuslabel = 'samenwerken')::int as samenwerkingen`, [id]);
  return (
    <div className="p-stack" style={{ gap: 20 }}>
      <p><Link className="p-link p-small" href="/beheer/bedrijven">← Bedrijven</Link></p>
      <div className="p-between"><h1 className="p-h2">{b.naam}</h1><Link className="btn btn-line btn-sm" href={`/bedrijf/${b.slug}`}>Openbare pagina</Link></div>
      <div className="p-grid2" style={{ alignItems: 'start' }}>
        <section className="p-card p-stack" style={{ gap: 6 }}><h2 className="p-h3">Gegevens</h2>
          <span>KvK {b.kvk} · {b.kvk_controle_resultaat === 'actief' ? `gecontroleerd op ${datumNL(b.kvk_controle_op)}` : 'niet automatisch gecontroleerd'}</span>
          {b.btw && <span>Btw {b.btw}</span>}{b.website && <a className="p-link" href={b.website} target="_blank" rel="noopener">{b.website}</a>}
          <span>{[b.branche, b.grootte && `${b.grootte} medewerkers`].filter(Boolean).join(' · ')}</span><span>{[b.straat, b.postcode, b.plaats].filter(Boolean).join(', ')}</span></section>
        <section className="p-card p-stack" style={{ gap: 8 }}><h2 className="p-h3">Contactpersonen</h2>
          {leden.map((l: any) => <span key={l.email}><strong>{l.voornaam} {l.achternaam}</strong> ({l.rol}) <br /><span className="p-small">{l.email}{!l.email_bevestigd && ' (niet bevestigd)'} · {l.telefoon || 'geen telefoon'}</span></span>)}</section>
      </div>
      <section className="p-card p-stack"><h2 className="p-h3">Opdrachten ({ops.length}) · {tel.gesprekken} gesprekken · {tel.samenwerkingen} samenwerkingen</h2>
        {ops.map((o: any) => <div key={o.id} className="p-between p-small"><Link className="p-link" href={`/beheer/opdrachten?open=${o.id}`}>{o.titel}</Link><span>{o.reacties} reacties · {datumNL(o.aangemaakt)} <span className={`p-status ${o.status}`}>{OPDRACHT_STATUS[o.status]}</span></span></div>)}</section>
      <section className="p-card p-stack" style={{ gap: 8 }}><h2 className="p-h3">Logo op de homepage</h2>
        {!b.logo_pad ? <p className="p-small p-muted">Dit bedrijf heeft geen logo.</p> : <>
          <span className="p-row" style={{ gap: 14, alignItems: 'center' }}><img src={`/bestand/logo/${b.id}?w=200&v=${encodeURIComponent(String(b.logo_pad).split('/').pop() || '')}`} alt={`Logo ${b.naam}`} style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }} />
            <span className="p-small">{b.logo_verborgen ? 'Verborgen door beheer' : !b.logo_tonen ? 'Uitgezet door het bedrijf' : !leden.some((l: any) => l.email_bevestigd) ? 'Nog niet zichtbaar: e-mailadres niet bevestigd' : 'Zichtbaar bij ‘Bedrijven op ons platform’'}</span></span>
          <form action={zetLogoVerborgen}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="verborgen" value={b.logo_verborgen ? '0' : '1'} />
            <button className="btn btn-line btn-sm">{b.logo_verborgen ? 'Logo weer tonen op de homepage' : 'Logo verbergen op de homepage'}</button></form>
          <p className="p-xs p-muted">De strook staat op de homepage zodra {LOGO_STROOK_MIN} bedrijven een zichtbaar logo hebben. Nu: {inStrook}.</p>
        </>}
      </section>
      <section className="p-card p-stack" id="tips" style={{ gap: 10 }}><h2 className="p-h3">Freelancers aanbevelen per e-mail</h2>
        <p className="p-small p-muted">Verstuurt een e-mail vanaf sales@ aan de eigenaar van dit bedrijf (alleen bij een bevestigd e-mailadres), ondertekend door &lsquo;het team van Holland Recruitment&rsquo;. Kies maximaal 5 freelancers; bovenaan staan profielen die passen bij de opdrachten van dit bedrijf en de meest complete profielen.</p>
        {sp.melding === 'tips-verstuurd' && <p className="p-ok p-small" role="status">E-mail verstuurd.</p>}
        {sp.fout === 'geen-freelancers' && <p className="p-err-summary p-small" role="alert">Kies minstens één freelancer.</p>}
        {sp.fout === 'geen-ontvanger' && <p className="p-err-summary p-small" role="alert">Dit bedrijf heeft geen teamlid met een bevestigd e-mailadres.</p>}
        {sp.fout === 'mail' && <p className="p-err-summary p-small" role="alert">Versturen is mislukt. Probeer het later opnieuw.</p>}
        <form action={stuurFreelancerTips} className="p-stack" style={{ gap: 10 }}>
          <input type="hidden" name="id" value={b.id} />
          <div className="field"><label htmlFor="v-aanhef">Aanhef (voornaam)</label><input id="v-aanhef" name="aanhef" placeholder="Bijvoorbeeld Daley" /><span className="hint">Leeg = de voornaam van het account.</span></div>
          <div className="field"><label htmlFor="v-notitie">Persoonlijke notitie (optioneel)</label><textarea id="v-notitie" name="notitie" rows={4} maxLength={800} /></div>
          <div className="field"><label htmlFor="v-zoekvakgebied">Knop &lsquo;Meer freelancers bekijken&rsquo; filtert op</label>
            <select id="v-zoekvakgebied" name="zoekvakgebied" defaultValue={vakOpdrachten[0] || ''}><option value="">Alle vakgebieden</option>{VAKGEBIEDEN.map(v => <option key={v.slug} value={v.slug}>{v.naam}</option>)}</select></div>
          <fieldset className="p-stack" style={{ gap: 4, border: 0, padding: 0, margin: 0 }}><legend className="p-small" style={{ fontWeight: 700, marginBottom: 6 }}>Freelancers</legend>
            {suggesties.map((f: any) => <label key={f.slug} className="p-check"><input type="checkbox" name="freelancer" value={f.slug} /><span><strong>{f.voornaam} {f.a1}.</strong> · {f.functietitel} <span className="p-muted p-small">· {[f.regio, vakgebiedNaam(f.vakgebied), f.beschikbaarheid === 'nu' ? 'nu beschikbaar' : '', `${f.compleet}/3 compleet`].filter(Boolean).join(' · ')}</span> <a className="p-link p-small" href={`/freelancer/${f.slug}`} target="_blank">profiel</a></span></label>)}
          </fieldset>
          <button className="btn btn-blue btn-sm" style={{ alignSelf: 'flex-start' }}>E-mail versturen</button>
        </form>
        {eerderTips.length > 0 && <div className="p-small p-muted">Eerder verstuurd: {eerderTips.map((t: any) => `${datumNL(t.aangemaakt)} (${(t.details?.freelancers || []).length} freelancers)`).join(', ')}</div>}
      </section>
      <Blokkeer soort="bedrijf" id={b.id} status={b.status} reden={b.blok_reden} terug={`/beheer/bedrijven/${b.id}`} fout={sp.fout === 'reden'} />
    </div>
  );
}
