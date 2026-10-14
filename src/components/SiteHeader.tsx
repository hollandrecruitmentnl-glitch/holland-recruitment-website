import Link from 'next/link';
import { headers } from 'next/headers';
import { LogoSvg, Chevron } from './Logo';
import HeaderClient from './HeaderClient';
import { huidigAccount } from '@/lib/auth';
import { ongelezenAantal } from '@/lib/data/berichten';
import { profielVolledigheid } from '@/lib/data/freelancers';
import { uitloggen } from '@/app/actions/auth';
import { PUBLIEK_BEDRIJVEN, PUBLIEK_FREELANCERS, HOOFD, OMGEVING, HULP, BEMIDDELING_URL, isRol, type Link as L } from '@/lib/navigatie';

function Dropdown({ id, label, items }: { id: string; label: string; items: L[] }) {
  return (
    <div className="nav-item">
      <button className="nav-link" type="button" data-dropdown aria-expanded="false" aria-controls={id}>{label}<Chevron /></button>
      <div className="dropdown" id={id}>{items.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
    </div>
  );
}

export default async function SiteHeader() {
  const a = await huidigAccount();
  const pad = (await headers()).get('x-pad') || '';
  // Focusmodus: op de registratiepagina alleen logo en inloggen, zodat er geen afleidende uitgangen zijn.
  if (!a && pad.startsWith('/registreren')) return (
    <header className="site-header site-header-focus">
      <div className="wrap nav">
        <a href="/" className="brand" aria-label="Holland Recruitment — home"><LogoSvg /><b>Holland<span>.</span></b></a>
        <div className="nav-right"><span className="p-small p-muted focus-al">Al een account?</span><Link className="btn btn-line btn-sm" href="/inloggen">Inloggen</Link></div>
      </div>
    </header>
  );
  const rol = isRol(a?.rol) ? a!.rol as 'bedrijf' | 'freelancer' : null;
  const ongelezen = rol ? await ongelezenAantal(a!) : 0;
  const profielPct = rol === 'freelancer' ? (await profielVolledigheid(a!.id)).pct : 100;
  const badge = ongelezen > 0 ? <span className="p-badge" aria-label={`${ongelezen} ongelezen`}>{ongelezen}</span> : null;

  return (
    <header className="site-header">
      <HeaderClient />
      <div className="wrap nav">
        <a href={rol ? '/mijn' : '/'} className="brand" aria-label={rol ? 'Holland Recruitment — mijn overzicht' : 'Holland Recruitment — home'}><LogoSvg /><b>Holland<span>.</span></b></a>

        <nav className="nav-main" aria-label="Hoofdnavigatie">
          {rol ? (
            HOOFD[rol].map(([h, l]) => <div key={h} className="nav-item"><Link className="nav-link" href={h} data-nav={h}>{l}</Link></div>)
          ) : (
            <>
              <Dropdown id="dd-bedrijven" label="Voor bedrijven" items={PUBLIEK_BEDRIJVEN} />
              <Dropdown id="dd-freelancers" label="Voor freelancers" items={PUBLIEK_FREELANCERS} />
              <div className="nav-item"><Link className="nav-link" href="/opdrachten" data-nav="/opdrachten">Opdrachten</Link></div>
              <div className="nav-item"><a className="nav-link" href={BEMIDDELING_URL}>Bemiddeling</a></div>
              <div className="nav-item"><a className="nav-link" href="/kennisbank">Kennisbank</a></div>
            </>
          )}
        </nav>

        <div className="nav-right">
          {a ? (
            <>
              {rol && <Link className="p-msgs" href="/mijn/berichten" data-nav="/mijn/berichten">Berichten{badge}</Link>}
              <details className="p-acct">
                <summary aria-label="Accountmenu"><span className="p-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{(a.voornaam[0] || '?').toUpperCase()}</span><Chevron /></summary>
                <div className="p-acct-menu">
                  <div className="p-xs p-muted" style={{ padding: '6px 12px' }}>{a.voornaam} {a.achternaam}{a.bedrijf_naam ? ` · ${a.bedrijf_naam}` : ''}<br />{rol === 'bedrijf' ? 'Account voor opdrachtgevers' : rol === 'freelancer' ? 'Account voor freelancers' : 'Beheer'}</div>
                  {rol ? OMGEVING[rol].map(([h, l]) => <Link key={h} href={h}>{l}{h === '/mijn/berichten' && ongelezen > 0 ? ` (${ongelezen})` : ''}</Link>)
                    : <><Link href="/beheer">Beheer</Link><Link href="/mijn/instellingen">Instellingen</Link></>}
                  <form action={uitloggen}><button type="submit">Uitloggen</button></form>
                </div>
              </details>
            </>
          ) : (
            <Link className="p-login" href="/inloggen">Inloggen</Link>
          )}
          {rol === 'bedrijf' ? <Link className="btn btn-blue btn-sm" href="/mijn/opdrachten/nieuw">Plaats een opdracht</Link>
            : rol === 'freelancer' ? (profielPct < 100 ? <Link className="btn btn-blue btn-sm" href="/mijn/profiel">Profiel aanvullen ({profielPct}%)</Link> : <Link className="btn btn-blue btn-sm" href="/opdrachten">Opdrachten zoeken</Link>)
            : !a ? <Link className="btn btn-blue btn-sm nav-cta" href="/registreren">Gratis account</Link> : null}
          <button className="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
        </div>
      </div>

      <div className="mobile-menu" id="mobile-menu">
        <div className="wrap">
          {rol ? (
            <>
              <div className="m-group">
                <div className="m-title">{rol === 'bedrijf' ? (a!.bedrijf_naam || 'Mijn bedrijf') : 'Mijn omgeving'}</div>
                {OMGEVING[rol].map(([h, l]) => <a key={h} href={h}>{l}{h === '/mijn/berichten' && ongelezen > 0 ? ` (${ongelezen})` : ''}</a>)}
              </div>
              <div className="m-group"><div className="m-title">Hulp en uitleg</div>{HULP[rol].map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
              {rol === 'bedrijf' ? <a className="btn btn-blue" href="/mijn/opdrachten/nieuw">Plaats een opdracht</a> : <a className="btn btn-blue" href="/opdrachten">Opdrachten zoeken</a>}
              <form action={uitloggen}><button className="btn btn-line" type="submit">Uitloggen</button></form>
            </>
          ) : (
            <>
              {a ? <div className="m-group"><div className="m-title">Beheer</div><a href="/beheer">Beheer</a><a href="/mijn/instellingen">Instellingen</a></div>
                : <div className="m-group m-acties"><a className="btn btn-blue" href="/registreren">Gratis account maken</a><a href="/inloggen">Inloggen</a></div>}
              <div className="m-group"><div className="m-title">Voor bedrijven</div>{PUBLIEK_BEDRIJVEN.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
              <div className="m-group"><div className="m-title">Voor freelancers</div>{PUBLIEK_FREELANCERS.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
              <a href="/opdrachten">Opdrachten</a><a href={BEMIDDELING_URL}>Bemiddeling</a><a href="/kennisbank">Kennisbank</a><a href="/over-ons">Over ons</a><a href="/contact">Contact</a>
              {a ? <form action={uitloggen}><button className="btn btn-line" type="submit">Uitloggen</button></form> : <a className="btn btn-line" href={BEMIDDELING_URL}>Laat ons zoeken (bemiddeling)</a>}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
