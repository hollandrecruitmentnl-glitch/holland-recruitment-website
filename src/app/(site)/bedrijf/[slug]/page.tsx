import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { huidigAccount } from '@/lib/auth';
import { bedrijfPagina } from '@/lib/data/bedrijven';
import { zoekOpdrachten } from '@/lib/data/opdrachten';
import { Leeg, Logo, OpdrachtKaart } from '@/components/Kaarten';
import BerichtStarter from '@/components/BerichtStarter';

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const b = await bedrijfPagina((await params).slug);
  if (!b || b.status !== 'actief') return { robots: { index: false } };
  return { title: `${b.naam} · freelance opdrachten`, description: (b.omschrijving || `${b.naam} in ${b.plaats}. Bekijk de open freelance opdrachten.`).slice(0, 155), alternates: { canonical: `/bedrijf/${b.slug}` } };
}

export default async function Bedrijf({ params }: P) {
  const a = await huidigAccount();
  const b = await bedrijfPagina((await params).slug);
  if (!b || (b.status !== 'actief' && a?.rol !== 'beheer' && a?.bedrijf_id !== b.id)) notFound();
  const ops = await zoekOpdrachten({ bedrijfId: b.id, perPagina: 50 });
  const eigen = a?.bedrijf_id === b.id;
  return (
    <div className="p-wrap">
      <p style={{ paddingTop: 20 }}><Link className="p-link p-small" href="/bedrijven">← Terug naar bedrijven</Link></p>
      {eigen && <p className="p-note" style={{ marginTop: 12 }}>Zo zien freelancers je bedrijf. <Link className="p-link" href="/mijn/bedrijf">Bedrijfsprofiel bewerken</Link></p>}
      <div className="p-detail">
        <div className="p-stack" style={{ gap: 24 }}>
          <header className="p-row" style={{ flexWrap: 'nowrap', gap: 18 }}>
            <span style={{ transform: 'scale(1.4)', transformOrigin: 'left center', marginRight: 22 }}><Logo id={b.id} logo={b.logo_pad} naam={b.naam} /></span>
            <div><h1 className="p-h2">{b.naam}</h1><p className="p-muted">{[b.branche, b.plaats, b.grootte ? `${b.grootte} medewerkers` : ''].filter(Boolean).join(' · ')}</p></div>
          </header>
          {b.omschrijving && <p className="p-prose">{b.omschrijving}</p>}
          <section className="p-stack"><h2 className="p-h3">Open opdrachten ({ops.totaal})</h2>
            {ops.items.length ? ops.items.map(o => <OpdrachtKaart key={o.id} o={o} />) : <Leeg titel="Geen open opdrachten" tekst="Dit bedrijf heeft op dit moment geen open opdrachten. Stuur gerust een bericht als je interesse hebt." />}
          </section>
        </div>
        <aside className="p-stack">
          <div className="p-panel"><dl className="p-facts">
            {b.website && <div><dt>Website</dt><dd><a className="p-link" href={b.website} target="_blank" rel="noopener nofollow">{b.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></div>}
            {b.branche && <div><dt>Branche</dt><dd>{b.branche}</dd></div>}
            {b.plaats && <div><dt>Plaats</dt><dd>{b.plaats}</dd></div>}
            <div><dt>KvK</dt><dd>{b.kvk_controle_resultaat === 'actief' ? 'Gecontroleerd' : 'Opgegeven'}</dd></div>
          </dl></div>
          {!eigen && (a?.rol === 'freelancer' || !a) && <BerichtStarter doel="bedrijf" doelId={b.id} naam={b.naam} ingelogd={!!a} magSturen={a?.rol === 'freelancer'} terug={`/bedrijf/${b.slug}#bericht`} placeholder="Stel jezelf kort voor en vertel waarom je interesse hebt." />}
        </aside>
      </div>
    </div>
  );
}
