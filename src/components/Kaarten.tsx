import Link from 'next/link';
import { BESCHIKBAARHEID, BRON_NAAM, BRON_SITE, vakgebiedNaam, werkvormNaam } from '@/lib/constants';
import { datumNL, initialen, relatief } from '@/lib/util';
import { tariefTekst } from '@/lib/data/opdrachten';

export function Avatar({ id, foto, voornaam, achternaam, maat = '' }: { id: string; foto?: string | null; voornaam: string; achternaam: string; maat?: '' | 'lg' | 'xl' }) {
  return (
    <span className={`p-avatar ${maat}`} aria-hidden="true">
      {foto ? <img src={`/bestand/foto/${id}`} alt="" loading="lazy" /> : initialen(voornaam, achternaam)}
    </span>
  );
}
export function Logo({ id, logo, naam }: { id: string; logo?: string | null; naam: string }) {
  return <span className="p-logo" aria-hidden="true">{logo ? <img src={`/bestand/logo/${id}`} alt="" loading="lazy" /> : (naam[0] || '?').toUpperCase()}</span>;
}

export function beschikbaarTekst(f: { beschikbaarheid: string; beschikbaar_vanaf?: string | null; beschikbaar_tot?: string | null }) {
  if (f.beschikbaarheid === 'vanaf' && f.beschikbaar_vanaf) return `Beschikbaar vanaf ${datumNL(f.beschikbaar_vanaf, { jaar: false })}`;
  if (f.beschikbaarheid === 'periode' && f.beschikbaar_vanaf) return `Beschikbaar ${datumNL(f.beschikbaar_vanaf, { jaar: false })} t/m ${datumNL(f.beschikbaar_tot, { jaar: false })}`;
  return BESCHIKBAARHEID[f.beschikbaarheid] || '';
}
export function Beschikbaar({ f }: { f: { beschikbaarheid: string; beschikbaar_vanaf?: string | null; beschikbaar_tot?: string | null } }) {
  return <span className="p-row" style={{ gap: 6 }}><span className={`p-dot ${f.beschikbaarheid}`} aria-hidden="true" />{beschikbaarTekst(f)}</span>;
}

export function FreelancerKaart({ f, compact }: { f: any; compact?: boolean }) {
  const vaardig: string[] = (f.vaardigheden || []).slice(0, compact ? 2 : 4);
  return (
    <article className="p-result">
      <div className="p-row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <Avatar id={f.id} foto={f.foto_pad} voornaam={f.voornaam} achternaam={f.achternaam} />
        <div style={{ minWidth: 0 }}>
          <h3><Link href={`/freelancer/${f.slug}`}>{f.voornaam} {f.achternaam}</Link></h3>
          <p className="p-muted p-small">{[f.functietitel, f.regio, f.jaren_ervaring ? `${f.jaren_ervaring} jaar ervaring` : ''].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      {vaardig.length > 0 && <div className="p-row" style={{ gap: 6 }}>{vaardig.map(v => <span key={v} className="p-tag">{v}</span>)}</div>}
      <div className="p-row p-small" style={{ gap: 14 }}>
        {f.uurtarief != null ? <strong>€ {f.uurtarief} per uur</strong> : <span className="p-muted">Tarief op aanvraag</span>}
        <Beschikbaar f={f} />
      </div>
      <div className="p-row">
        <Link className="p-link" href={`/freelancer/${f.slug}`}>Bekijk profiel</Link>
        <Link className="btn btn-line btn-sm" href={`/freelancer/${f.slug}#bericht`}>Stuur bericht</Link>
      </div>
    </article>
  );
}

export function Bronlabel({ o }: { o: { bron: string; aanbieder?: string | null } }) {
  if (o.bron === 'direct') return <span className="p-src direct">Direct geplaatst</span>;
  const site = BRON_SITE[o.bron];
  return <span className="p-src">Externe opdracht · via {site ? <a href={site} target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>{BRON_NAAM[o.bron]}</a> : BRON_NAAM[o.bron] || 'partner'}</span>;
}

export function OpdrachtKaart({ o, reageerde }: { o: any; reageerde?: boolean }) {
  const org = o.bron === 'direct' ? o.bedrijf_naam : o.aanbieder;
  return (
    <article className="p-result">
      <div className="p-between" style={{ alignItems: 'flex-start' }}>
        <Bronlabel o={o} />
        {reageerde && <span className="p-status samenwerking">Je hebt gereageerd</span>}
      </div>
      <h3><Link href={`/opdrachten/${o.slug}`}>{o.titel}</Link></h3>
      <p className="p-muted p-small">{[org, o.locatie || (o.werkvorm === 'remote' ? 'Remote' : ''), werkvormNaam(o.werkvorm), vakgebiedNaam(o.vakgebied)].filter(Boolean).join(' · ')}</p>
      {o.omschrijving && <p className="p-small" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.omschrijving}</p>}
      <div className="p-between p-small">
        <strong>{tariefTekst(o)}</strong>
        <span className="p-muted">Geplaatst {relatief(o.geplaatst_op)}</span>
      </div>
    </article>
  );
}

export function Leeg({ titel, tekst, children }: { titel: string; tekst?: string; children?: React.ReactNode }) {
  return (
    <div className="p-empty">
      <strong className="p-h3">{titel}</strong>
      {tekst && <p className="p-muted" style={{ maxWidth: 520 }}>{tekst}</p>}
      {children}
    </div>
  );
}

export function Paginering({ pagina, totaal, per, basis }: { pagina: number; totaal: number; per: number; basis: (p: number) => string }) {
  const n = Math.ceil(totaal / per);
  if (n <= 1) return null;
  const pages = Array.from({ length: n }, (_, i) => i + 1).filter(p => p === 1 || p === n || Math.abs(p - pagina) <= 2);
  return (
    <nav className="p-pager" aria-label="Paginering">
      {pagina > 1 && <Link className="p-chip" href={basis(pagina - 1)} rel="prev">← Vorige</Link>}
      {pages.map((p, i) => (
        <span key={p} style={{ display: 'contents' }}>
          {i > 0 && p - pages[i - 1] > 1 && <span className="p-muted" aria-hidden="true">…</span>}
          <Link className={`p-chip ${p === pagina ? 'on' : ''}`} href={basis(p)} aria-current={p === pagina ? 'page' : undefined}>{p}</Link>
        </span>
      ))}
      {pagina < n && <Link className="p-chip" href={basis(pagina + 1)} rel="next">Volgende →</Link>}
    </nav>
  );
}
