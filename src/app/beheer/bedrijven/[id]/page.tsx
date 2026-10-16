import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, one } from '@/lib/db';
import { OPDRACHT_STATUS } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import Blokkeer from '../../Blokkeer';
import { zetLogoVerborgen } from '@/app/actions/beheer';
import { logoStrookAantal } from '@/lib/data/bedrijven';
import { LOGO_STROOK_MIN } from '@/lib/constants';

export default async function BedrijfDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params; const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const b = await one(`select * from bedrijven where id = $1`, [id]); if (!b) notFound();
  const leden = await q(`select a.voornaam, a.achternaam, a.email, a.telefoon, bl.rol, bl.functie, a.email_bevestigd from bedrijf_leden bl join accounts a on a.id = bl.account_id where bl.bedrijf_id = $1`, [id]);
  const ops = await q(`select o.id, o.titel, o.status, o.aangemaakt, (select count(*) from reacties r where r.opdracht_id = o.id)::int as reacties from opdrachten o where o.bedrijf_id = $1 order by o.aangemaakt desc`, [id]);
  const inStrook = await logoStrookAantal();
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
      <Blokkeer soort="bedrijf" id={b.id} status={b.status} reden={b.blok_reden} terug={`/beheer/bedrijven/${b.id}`} fout={sp.fout === 'reden'} />
    </div>
  );
}
