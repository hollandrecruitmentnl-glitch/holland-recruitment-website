import type { Metadata } from 'next';
import Link from 'next/link';
import { huidigAccount } from '@/lib/auth';
import { zoekOpdrachten, landingTellingen, MIN_LANDING } from '@/lib/data/opdrachten';
import { Leeg, OpdrachtKaart, Paginering } from '@/components/Kaarten';
import { BewaarZoekopdracht } from '@/components/Bewaar';
import { VAKGEBIEDEN, WERKVORMEN, regioNaam, vakgebiedNaam, werkvormNaam } from '@/lib/constants';
import { q } from '@/lib/db';
import { Suspense } from 'react';
import CareerjetAanvulling from '@/components/CareerjetAanvulling';

export const metadata: Metadata = {
  title: 'Freelance opdrachten',
  description: 'Bekijk freelance en interim opdrachten in heel Nederland: direct geplaatst door bedrijven en van andere platforms. Filter op vakgebied, werkvorm en regio.',
  alternates: { canonical: '/opdrachten' },
};

type Z = { q: string; locatie: string; vakgebied: string[]; werkvorm: string[]; bron: string; sorteer: string; pagina: string };
const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : []).filter(Boolean) as string[];
function url(z: Z, w: Partial<Z> = {}) {
  const n = { ...z, ...w }; const p = new URLSearchParams();
  if (n.q) p.set('q', n.q); if (n.locatie) p.set('locatie', n.locatie);
  n.vakgebied.forEach(v => p.append('vakgebied', v)); n.werkvorm.forEach(v => p.append('werkvorm', v));
  if (n.bron) p.set('bron', n.bron); if (n.sorteer && n.sorteer !== 'nieuwste') p.set('sorteer', n.sorteer); if (n.pagina !== '1') p.set('pagina', n.pagina);
  return '/opdrachten' + (p.toString() ? '?' + p : '');
}

export default async function Opdrachten({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const sp = await searchParams;
  const z: Z = { q: String(sp.q || '').slice(0, 80), locatie: String(sp.locatie || '').slice(0, 60), vakgebied: arr(sp.vakgebied).filter(v => VAKGEBIEDEN.some(x => x.slug === v)),
    werkvorm: arr(sp.werkvorm).filter(v => WERKVORMEN.some(x => x.v === v)), bron: ['direct', 'extern'].includes(String(sp.bron)) ? String(sp.bron) : '', sorteer: sp.sorteer === 'relevant' ? 'relevant' : 'nieuwste', pagina: String(sp.pagina || '1') };
  const a = await huidigAccount();
  const res = await zoekOpdrachten({ ...z, pagina: Number(z.pagina) || 1 });
  const gereageerd = a?.rol === 'freelancer' ? new Set((await q<{ opdracht_id: string }>('select opdracht_id from reacties where freelancer_id = $1', [a.id])).map(r => r.opdracht_id)) : new Set<string>();
  const chips: [string, string][] = [];
  if (z.q) chips.push([`“${z.q}”`, url(z, { q: '', pagina: '1' })]);
  if (z.locatie) chips.push([z.locatie, url(z, { locatie: '', pagina: '1' })]);
  z.vakgebied.forEach(v => chips.push([vakgebiedNaam(v), url(z, { vakgebied: z.vakgebied.filter(x => x !== v), pagina: '1' })]));
  z.werkvorm.forEach(v => chips.push([werkvormNaam(v), url(z, { werkvorm: z.werkvorm.filter(x => x !== v), pagina: '1' })]));
  if (z.bron) chips.push([z.bron === 'direct' ? 'Direct geplaatst' : 'Externe opdrachten', url(z, { bron: '', pagina: '1' })]);
  const landing = (await landingTellingen()).filter(t => t.n >= MIN_LANDING);
  const perVak = landing.filter(t => t.vakgebied && !t.regio).sort((x, y) => y.n - x.n);
  const perRegio = landing.filter(t => t.regio && !t.vakgebied).sort((x, y) => y.n - x.n).slice(0, 15);
  const toonAlle = z.vakgebied.some(v => VAKGEBIEDEN.findIndex(x => x.slug === v) >= 6);
  return (
    <>
      <div className="p-searchband">
        <div className="p-wrap">
          <h1 className="p-h2" style={{ margin: '6px 0 12px' }}>Freelance opdrachten</h1>
          <form className="p-searchbar" action="/opdrachten" method="get" role="search">
            <label className="sr-only" htmlFor="oq">Functie of vaardigheid</label><input id="oq" name="q" defaultValue={z.q} placeholder="Functie of vaardigheid" />
            <label className="sr-only" htmlFor="ol">Plaats of regio</label><input id="ol" name="locatie" defaultValue={z.locatie} placeholder="Plaats of regio" />
            <button className="btn btn-blue" type="submit">Zoek</button>
          </form>
        </div>
      </div>
      <div className="p-wrap p-results">
        <div className="p-filters-mobile">
          <input type="checkbox" id="fo-toggle" className="p-filters-toggle" />
          <label htmlFor="fo-toggle" className="btn btn-line btn-sm" style={{ marginBottom: 12 }}>Filters{chips.length ? ` (${chips.length})` : ''}</label>
          <form className="p-filters" action="/opdrachten" method="get" aria-label="Filters">
            <input type="hidden" name="q" value={z.q} /><input type="hidden" name="locatie" value={z.locatie} /><input type="hidden" name="sorteer" value={z.sorteer} />
            <div className="p-between"><strong style={{ fontFamily: 'Poppins', fontSize: 18 }}>Filters</strong>{chips.length > 0 && <Link className="p-link p-small" href="/opdrachten">Filters wissen</Link>}</div>
            <fieldset id="vakgebied"><legend>Vakgebied</legend>
              {VAKGEBIEDEN.slice(0, 6).map(v => <label key={v.slug} className="p-check"><input type="checkbox" name="vakgebied" value={v.slug} defaultChecked={z.vakgebied.includes(v.slug)} />{v.naam}</label>)}
              <details open={toonAlle}><summary className="p-link p-small" style={{ cursor: 'pointer', listStyle: 'none' }}>Toon alle 20 vakgebieden</summary>
                <div className="p-stack" style={{ gap: 9, marginTop: 9 }}>{VAKGEBIEDEN.slice(6).map(v => <label key={v.slug} className="p-check"><input type="checkbox" name="vakgebied" value={v.slug} defaultChecked={z.vakgebied.includes(v.slug)} />{v.naam}</label>)}</div></details>
            </fieldset>
            <fieldset><legend>Werkvorm</legend>{WERKVORMEN.map(w => <label key={w.v} className="p-check"><input type="checkbox" name="werkvorm" value={w.v} defaultChecked={z.werkvorm.includes(w.v)} />{w.l}</label>)}</fieldset>
            <fieldset><legend>Bron</legend>{[['', 'Alle opdrachten'], ['direct', 'Direct geplaatst'], ['extern', 'Externe opdrachten']].map(([v, l]) => <label key={v} className="p-check"><input type="radio" name="bron" value={v} defaultChecked={z.bron === v} />{l}</label>)}</fieldset>
            <button className="btn btn-blue btn-sm" type="submit">Toon resultaten</button>
          </form>
        </div>
        <div className="p-stack" aria-live="polite">
          {chips.length > 0 && <div className="p-row" style={{ gap: 8 }}>{chips.map(([l, h]) => <span key={l} className="p-filterchip">{l}<Link href={h} aria-label={`Filter ${l} verwijderen`}>×</Link></span>)}<Link className="p-link p-small" href="/opdrachten">Filters wissen</Link></div>}
          <div className="p-between">
            <strong>{res.totaal === 1 ? '1 opdracht' : `${res.totaal} opdrachten`}</strong>
            <div className="p-row p-small p-sorteer" style={{ gap: 10 }}>
              {a?.rol === 'freelancer' && chips.length > 0 && <BewaarZoekopdracht soort="opdrachten" filters={z} naam={chips.map(c => c[0]).join(', ')} />}
              <span className="p-muted">Sorteer op:</span>
              <Link href={url(z, { sorteer: 'nieuwste', pagina: '1' })} aria-current={z.sorteer === 'nieuwste' ? 'true' : undefined} style={{ fontWeight: z.sorteer === 'nieuwste' ? 700 : 400 }}>Nieuwste</Link>
              <Link href={url(z, { sorteer: 'relevant', pagina: '1' })} aria-current={z.sorteer === 'relevant' ? 'true' : undefined} style={{ fontWeight: z.sorteer === 'relevant' ? 700 : 400 }}>Meest relevant</Link>
            </div>
          </div>
          {res.items.length ? res.items.map(o => <OpdrachtKaart key={o.id} o={o} reageerde={gereageerd.has(o.id)} />) : (
            <Leeg titel="Geen opdrachten gevonden" tekst={chips.length ? 'Probeer een bredere zoekterm, haal een filter weg of kijk ook naar remote opdrachten.' : 'Er staan op dit moment geen open opdrachten. Maak een profiel aan, dan vinden bedrijven jou.'}>
              <div className="p-row" style={{ justifyContent: 'center' }}>
                {chips.length > 0 && <Link className="btn btn-line btn-sm" href="/opdrachten">Filters wissen</Link>}
                {!a && <Link className="btn btn-blue btn-sm" href="/registreren?rol=freelancer">Maak gratis profiel</Link>}
              </div>
            </Leeg>
          )}
          <Paginering pagina={res.pagina} totaal={res.totaal} per={res.perPagina} basis={p => url(z, { pagina: String(p) })} />
          {z.pagina === '1' && z.bron !== 'direct' && <Suspense fallback={null}><CareerjetAanvulling q={z.q} locatie={z.locatie} /></Suspense>}
          {res.items.some(o => o.bron !== 'direct') && <p className="p-xs p-muted">Externe opdrachten komen van andere websites. We tonen altijd de bron; reageren gaat via die website.</p>}
          {(perVak.length > 0 || perRegio.length > 0) && (
            <section className="p-stack" style={{ marginTop: 18, gap: 14 }} aria-label="Opdrachten per vakgebied en regio">
              {perVak.length > 0 && <div><h2 style={{ fontSize: 18, marginBottom: 10 }}>Freelance opdrachten per vakgebied</h2><div className="p-row" style={{ gap: 8 }}>{perVak.map(t => <Link key={t.pad} className="p-chip" href={t.pad}>{vakgebiedNaam(t.vakgebied)} ({t.n})</Link>)}</div></div>}
              {perRegio.length > 0 && <div><h2 style={{ fontSize: 18, marginBottom: 10 }}>Freelance opdrachten per regio</h2><div className="p-row" style={{ gap: 8 }}>{perRegio.map(t => <Link key={t.pad} className="p-chip" href={t.pad}>{regioNaam(t.regio)} ({t.n})</Link>)}</div></div>}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
