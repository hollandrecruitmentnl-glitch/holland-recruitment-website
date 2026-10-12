import type { Metadata } from 'next';
import Link from 'next/link';
import { zoekBedrijven } from '@/lib/data/bedrijven';
import { Leeg, Logo, Paginering } from '@/components/Kaarten';
import { BRANCHES } from '@/lib/constants';

export const metadata: Metadata = { title: 'Bedrijven', description: 'Bekijk bedrijven die freelancers zoeken via Holland Recruitment, met hun open opdrachten.', alternates: { canonical: '/bedrijven' } };

export default async function Bedrijven({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const z = { q: (sp.q || '').slice(0, 80), branche: BRANCHES.includes(sp.branche) ? sp.branche : '', plaats: (sp.plaats || '').slice(0, 60), pagina: Number(sp.pagina) || 1 };
  const res = await zoekBedrijven(z);
  const url = (p: number) => `/bedrijven?${new URLSearchParams({ ...(z.q && { q: z.q }), ...(z.branche && { branche: z.branche }), ...(z.plaats && { plaats: z.plaats }), ...(p > 1 && { pagina: String(p) }) })}`;
  return (
    <>
      <div className="p-searchband"><div className="p-wrap">
        <h1 className="p-h2" style={{ margin: '6px 0 12px' }}>Bedrijven</h1>
        <form className="p-searchbar" action="/bedrijven" method="get" role="search" style={{ gridTemplateColumns: '1.4fr 1fr 1fr auto' }}>
          <label className="sr-only" htmlFor="bq">Bedrijfsnaam</label><input id="bq" name="q" defaultValue={z.q} placeholder="Bedrijfsnaam" />
          <label className="sr-only" htmlFor="bb">Branche</label>
          <select id="bb" name="branche" defaultValue={z.branche} style={{ font: 'inherit', fontSize: 16, padding: 16, border: '1.5px solid var(--line)', borderRadius: 16, background: '#fff' }}><option value="">Alle branches</option>{BRANCHES.map(b => <option key={b}>{b}</option>)}</select>
          <label className="sr-only" htmlFor="bp">Plaats</label><input id="bp" name="plaats" defaultValue={z.plaats} placeholder="Plaats" />
          <button className="btn btn-blue" type="submit">Zoek</button>
        </form>
      </div></div>
      <div className="p-wrap" style={{ padding: '24px 26px 48px' }}>
        <p style={{ marginBottom: 14 }}><strong>{res.totaal === 1 ? '1 bedrijf' : `${res.totaal} bedrijven`}</strong></p>
        {res.items.length ? <div className="p-grid3">{res.items.map((b: any) => (
          <Link key={b.id} href={`/bedrijf/${b.slug}`} className="p-card-link">
            <span className="p-row" style={{ flexWrap: 'nowrap' }}><Logo id={b.id} logo={b.logo_pad} naam={b.naam} /><span style={{ minWidth: 0 }}><strong style={{ fontFamily: 'Poppins' }}>{b.naam}</strong><br /><span className="p-small p-muted">{[b.branche, b.plaats].filter(Boolean).join(' · ')}</span></span></span>
            {b.omschrijving && <span className="p-small p-muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.omschrijving}</span>}
            <span className="p-small"><strong>{b.open_opdrachten}</strong> {b.open_opdrachten === 1 ? 'open opdracht' : 'open opdrachten'}</span>
          </Link>))}</div>
          : <Leeg titel="Geen bedrijven gevonden" tekst="Probeer een andere naam, branche of plaats." />}
        <Paginering pagina={res.pagina} totaal={res.totaal} per={res.perPagina} basis={url} />
      </div>
    </>
  );
}
