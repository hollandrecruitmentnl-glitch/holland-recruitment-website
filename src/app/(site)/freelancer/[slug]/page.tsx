import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { huidigAccount } from '@/lib/auth';
import { freelancerProfiel } from '@/lib/data/freelancers';
import { Avatar, Beschikbaar } from '@/components/Kaarten';
import BerichtStarter from '@/components/BerichtStarter';
import { vakgebiedNaam, werkvormNaam } from '@/lib/constants';
import { q } from '@/lib/db';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const f = await freelancerProfiel((await params).slug, null);
  if (!f) return { robots: { index: false } };
  return {
    title: `${f.voornaam} ${f.achternaam} · ${f.functietitel}${f.regio ? ' in ' + f.regio : ''}`,
    description: (f.introductie || `${f.functietitel} in ${f.regio}. Bekijk het profiel en stuur direct een bericht.`).slice(0, 155),
    alternates: { canonical: `/freelancer/${f.slug}` },
    robots: f.vindbaar_google ? undefined : { index: false, follow: false },
  };
}

export default async function Profiel({ params }: P) {
  const { slug } = await params;
  const a = await huidigAccount();
  const f = await freelancerProfiel(slug, a);
  if (!f) notFound();
  if (a?.rol === 'bedrijf') q(`insert into recent_bekeken (account_id, freelancer_id) values ($1,$2) on conflict (account_id, freelancer_id) do update set op = now()`, [a.id, f.id]).catch(() => {});
  const eigen = a?.id === f.id;
  const naam = `${f.voornaam} ${f.achternaam}`;
  return (
    <div className="p-wrap">
      <p style={{ paddingTop: 20 }}><Link className="p-link p-small" href="/freelancers-zoeken">← Terug naar freelancers</Link></p>
      {eigen && <p className="p-note" style={{ marginTop: 12 }}>Zo zien anderen je profiel. <Link className="p-link" href="/mijn/profiel">Profiel bewerken</Link></p>}
      <div className="p-detail">
        <div className="p-stack" style={{ gap: 28 }}>
          <header className="p-row p-profielkop" style={{ gap: 20, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Avatar id={f.id} foto={f.foto_pad} voornaam={f.voornaam} achternaam={f.achternaam} maat="xl" />
            <div className="p-stack" style={{ gap: 8, minWidth: 0 }}>
              <h1 className="p-h2">{naam}</h1>
              <p className="p-muted">{[f.functietitel, f.regio, f.jaren_ervaring ? `${f.jaren_ervaring} jaar ervaring` : ''].filter(Boolean).join(' · ')}</p>
              <div className="p-row p-small" style={{ gap: 16 }}>
                {f.uurtarief != null ? <strong>€ {f.uurtarief} per uur</strong> : <span className="p-muted">Tarief {f.zichtbaar_tarief === 'na_contact' ? 'zichtbaar na contact' : 'op aanvraag'}</span>}
                <Beschikbaar f={f} />
              </div>
              {!eigen && a?.rol !== 'freelancer' && a?.rol !== 'beheer' && <div><a className="btn btn-blue" href={a ? '#bericht' : `/freelancer/${f.slug}/bericht`}>Stuur bericht</a></div>}
            </div>
          </header>
          {f.introductie && <section><h2 className="p-h3" style={{ marginBottom: 8 }}>Introductie</h2><p className="p-prose">{f.introductie}</p></section>}
          {f.vaardigheden?.length > 0 && <section><h2 className="p-h3" style={{ marginBottom: 10 }}>Vaardigheden</h2><div className="p-row" style={{ gap: 6 }}>{f.vaardigheden.map((v: string) => <span key={v} className="p-tag">{v}</span>)}</div></section>}
          <section>
            <h2 className="p-h3" style={{ marginBottom: 10 }}>Werkervaring</h2>
            {!f.toon_werkervaring ? <p className="p-muted">{f.zichtbaar_werkervaring === 'na_contact' ? 'Zichtbaar na contact.' : 'Niet openbaar.'}</p>
              : f.werkervaring.length === 0 ? <p className="p-muted">Nog geen werkervaring toegevoegd.</p>
              : <ol className="p-stack" style={{ listStyle: 'none' }}>{f.werkervaring.map((w: any) => (
                <li key={w.id} className="p-card" style={{ padding: 18 }}>
                  <strong>{w.functie}</strong>{w.opdrachtgever && <span className="p-muted"> · {w.opdrachtgever}</span>}
                  <div className="p-small p-muted">{w.van} – {w.huidig ? 'heden' : w.tot ?? ''}</div>
                  {w.omschrijving && <p className="p-small" style={{ marginTop: 6, whiteSpace: 'pre-line' }}>{w.omschrijving}</p>}
                </li>))}</ol>}
          </section>
        </div>
        <aside className="p-stack">
          <div className="p-panel p-stack" style={{ gap: 14 }}>
            <dl className="p-facts">
              <div><dt>Vakgebied</dt><dd>{vakgebiedNaam(f.vakgebied) || '–'}</dd></div>
              {f.uren_per_week && <div><dt>Uren per week</dt><dd>{f.uren_per_week}</dd></div>}
              {f.werkvormen?.length > 0 && <div><dt>Werkvorm</dt><dd>{f.werkvormen.map(werkvormNaam).join(', ')}</dd></div>}
              {f.talen?.length > 0 && <div><dt>Talen</dt><dd>{f.talen.join(', ')}</dd></div>}
            </dl>
            {f.certificeringen?.length > 0 && <div><strong className="p-small">Certificeringen</strong><div className="p-row" style={{ gap: 6, marginTop: 6 }}>{f.certificeringen.map((c: string) => <span key={c} className="p-tag" style={{ background: '#fff' }}>{c}</span>)}</div></div>}
            {f.sectoren?.length > 0 && <div><strong className="p-small">Sectorervaring</strong><div className="p-row" style={{ gap: 6, marginTop: 6 }}>{f.sectoren.map((c: string) => <span key={c} className="p-tag" style={{ background: '#fff' }}>{c}</span>)}</div></div>}
            <div><strong className="p-small">Cv</strong><p className="p-small" style={{ marginTop: 4 }}>
              {f.cv_pad && f.toon_cv ? <a className="p-link" href={`/bestand/cv/${f.id}`}>Download cv{f.cv_naam ? ` (${f.cv_naam})` : ''}</a>
                : f.cv_pad ? <span className="p-muted">{f.zichtbaar_cv === 'na_contact' ? 'Beschikbaar na eerste contact.' : 'Niet openbaar.'}</span>
                : <span className="p-muted">Nog geen cv geüpload.</span>}
            </p></div>
          </div>
          {!eigen && (a?.rol === 'bedrijf' || !a) && (
            <BerichtStarter doel="freelancer" doelId={f.id} naam={f.voornaam} ingelogd={!!a} magSturen={a?.rol === 'bedrijf'} terug={`/freelancer/${f.slug}#bericht`} />
          )}
          {a?.rol === 'freelancer' && !eigen && <p className="p-note p-small">Freelancers kunnen elkaar geen berichten sturen. Bedrijven kunnen jou wel benaderen.</p>}
          {(!a || a.rol === 'bedrijf') && (
            <div className="p-card p-small p-stack" style={{ gap: 6 }}>
              <strong>Liever dat wij het regelen?</strong>
              <span className="p-muted">Holland Recruitment kan de gesprekken, afspraken en selectie voor u doen.</span>
              <Link className="p-link" href={`/bemiddeling?freelancer=${f.slug}`}>Vraag bemiddeling aan</Link>
            </div>
          )}
          {a && !eigen && <Link className="p-link p-xs" href={`/melden?soort=profiel&id=${f.id}`}>Profiel melden</Link>}
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: naam, jobTitle: f.functietitel, address: f.regio ? { '@type': 'PostalAddress', addressLocality: f.regio, addressCountry: 'NL' } : undefined, knowsAbout: f.vaardigheden }) }} />
    </div>
  );
}
