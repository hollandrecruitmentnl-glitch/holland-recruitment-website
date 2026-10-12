import Link from 'next/link';
import { LogoSvg, Chevron } from './Logo';
import HeaderClient from './HeaderClient';
import { huidigAccount } from '@/lib/auth';
import { ongelezenAantal } from '@/lib/data/berichten';
import { uitloggen } from '@/app/actions/auth';

const BEDRIJVEN = [
  ['/freelancers-zoeken', 'Freelancers zoeken'], ['/voor-bedrijven', 'Overzicht voor bedrijven'], ['/freelancer-inhuren', 'Freelancer inhuren'],
  ['/interim-professional-inhuren', 'Interim professional inhuren'], ['/bemiddeling', 'Laat ons bemiddelen'], ['/werkwijze', 'Onze werkwijze'],
];
const FREELANCERS = [
  ['/opdrachten', 'Freelance opdrachten'], ['/bedrijven', 'Bedrijven'], ['/registreren?rol=freelancer', 'Profiel aanmaken'],
  ['/freelancers/hoe-werkt-het', 'Hoe werkt het?'], ['/freelancers/veelgestelde-vragen', 'Veelgestelde vragen'],
];
const EXPERTISES = [
  ['/expertises', 'Alle expertises'], ['/expertises/sales-business-development', 'Sales & Business Development'], ['/expertises/marketing-digital', 'Marketing & Digital'],
  ['/expertises/it-data', 'IT & Data'], ['/expertises/finance', 'Finance'], ['/expertises/engineering-technical', 'Engineering & Technical'],
  ['/expertises/petrochemie-industrie', 'Petrochemie & Industrie'], ['/expertises/operations-projectmanagement', 'Operations & Project Management'],
];

function Dropdown({ id, label, items }: { id: string; label: string; items: string[][] }) {
  return (
    <div className="nav-item">
      <button className="nav-link" type="button" data-dropdown aria-expanded="false" aria-controls={id}>{label}<Chevron /></button>
      <div className="dropdown" id={id}>{items.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
    </div>
  );
}

export default async function SiteHeader() {
  const a = await huidigAccount();
  const ongelezen = a && a.rol !== 'beheer' ? await ongelezenAantal(a) : 0;
  return (
    <header className="site-header">
      <HeaderClient />
      <div className="wrap nav">
        <a href="/" className="brand" aria-label="Holland Recruitment — home"><LogoSvg /><b>Holland<span>.</span></b></a>
        <nav className="nav-main" aria-label="Hoofdnavigatie">
          <Dropdown id="dd-bedrijven" label="Voor bedrijven" items={BEDRIJVEN} />
          <Dropdown id="dd-freelancers" label="Freelancers" items={FREELANCERS} />
          <Dropdown id="dd-expertises" label="Expertises" items={EXPERTISES} />
          <div className="nav-item"><Link className="nav-link" href="/freelance-platform">Platform</Link></div>
          <div className="nav-item"><a className="nav-link" href="/kennisbank">Kennisbank</a></div>
          <div className="nav-item"><a className="nav-link" href="/contact">Contact</a></div>
        </nav>
        <div className="nav-right">
          {a ? (
            <>
              {a.rol !== 'beheer' && (
                <Link className="p-msgs" href="/mijn/berichten">Berichten{ongelezen > 0 && <span className="p-badge" aria-label={`${ongelezen} ongelezen`}>{ongelezen}</span>}</Link>
              )}
              <details className="p-acct">
                <summary aria-label="Accountmenu"><span className="p-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{(a.voornaam[0] || '?').toUpperCase()}</span><Chevron /></summary>
                <div className="p-acct-menu">
                  <div className="p-xs p-muted" style={{ padding: '6px 12px' }}>{a.voornaam} {a.achternaam}{a.bedrijf_naam ? ` · ${a.bedrijf_naam}` : ''}</div>
                  {a.rol === 'beheer' ? <Link href="/beheer">Beheer</Link> : <Link href="/mijn">Mijn overzicht</Link>}
                  {a.rol === 'freelancer' && <><Link href="/mijn/profiel">Mijn profiel</Link><Link href="/mijn/reacties">Mijn reacties</Link></>}
                  {a.rol === 'bedrijf' && <><Link href="/mijn/opdrachten">Mijn opdrachten</Link><Link href="/mijn/bedrijf">Bedrijfsprofiel</Link></>}
                  {a.rol !== 'beheer' && <Link href="/mijn/berichten">Berichten</Link>}
                  <Link href="/mijn/instellingen">Instellingen</Link>
                  <form action={uitloggen}><button type="submit">Uitloggen</button></form>
                </div>
              </details>
            </>
          ) : (
            <Link className="p-login" href="/inloggen">Inloggen</Link>
          )}
          {a?.rol === 'bedrijf' ? <Link className="btn btn-blue btn-sm" href="/mijn/opdrachten/nieuw">Plaats een opdracht</Link>
            : a?.rol === 'freelancer' ? <Link className="btn btn-blue btn-sm" href="/opdrachten">Bekijk opdrachten</Link>
            : !a ? <Link className="btn btn-blue btn-sm" href="/registreren">Gratis account</Link> : null}
          <button className="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
        </div>
      </div>
      <div className="mobile-menu" id="mobile-menu">
        <div className="wrap">
          {!a && <div className="m-group"><a href="/inloggen">Inloggen</a><a href="/registreren">Gratis account maken</a></div>}
          {a && <div className="m-group"><div className="m-title">Mijn account</div>{a.rol === 'beheer' ? <a href="/beheer">Beheer</a> : <><a href="/mijn">Mijn overzicht</a><a href="/mijn/berichten">Berichten{ongelezen ? ` (${ongelezen})` : ''}</a></>}<a href="/mijn/instellingen">Instellingen</a></div>}
          <div className="m-group"><div className="m-title">Voor bedrijven</div>{BEDRIJVEN.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
          <div className="m-group"><div className="m-title">Freelancers</div>{FREELANCERS.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
          <div className="m-group"><div className="m-title">Expertises</div>{EXPERTISES.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
          <a href="/freelance-platform">Platform</a><a href="/kennisbank">Kennisbank</a><a href="/contact">Contact</a>
          {a && <form action={uitloggen}><button className="btn btn-line" type="submit">Uitloggen</button></form>}
        </div>
      </div>
    </header>
  );
}
