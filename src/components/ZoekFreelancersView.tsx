import Link from 'next/link';
import { huidigAccount } from '@/lib/auth';
import { zoekFreelancers } from '@/lib/data/freelancers';
import { FreelancerKaart, Leeg, Paginering } from './Kaarten';
import { VAKGEBIEDEN, vakgebiedNaam } from '@/lib/constants';
import { BewaarZoekopdracht } from './Bewaar';
import { q } from '@/lib/db';

export type FZoek = { q?: string; regio?: string; vakgebied?: string[]; vaardigheid?: string[]; max?: string; beschikbaar?: string; pagina?: string };

export function parseFZoek(sp: Record<string, string | string[] | undefined>): FZoek {
  const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : []).map(s => s.trim()).filter(Boolean);
  return {
    q: String(sp.q || '').slice(0, 80), regio: String(sp.regio || '').slice(0, 60), vakgebied: arr(sp.vakgebied).filter(v => VAKGEBIEDEN.some(x => x.slug === v)),
    vaardigheid: arr(sp.vaardigheid).slice(0, 8), max: String(sp.max || ''), beschikbaar: String(sp.beschikbaar || ''), pagina: String(sp.pagina || '1'),
  };
}
function url(z: FZoek, wijzig: Partial<FZoek> = {}, basis = '/freelancers-zoeken') {
  const n = { ...z, ...wijzig }; const p = new URLSearchParams();
  if (n.q) p.set('q', n.q); if (n.regio) p.set('regio', n.regio);
  n.vakgebied?.forEach(v => p.append('vakgebied', v)); n.vaardigheid?.forEach(v => p.append('vaardigheid', v));
  if (n.max) p.set('max', n.max); if (n.beschikbaar) p.set('beschikbaar', n.beschikbaar);
  if (n.pagina && n.pagina !== '1') p.set('pagina', n.pagina);
  return basis + (p.toString() ? '?' + p : '');
}

export default async function ZoekFreelancersView({ z, titel, intro, basis = '/freelancers-zoeken', vast }: { z: FZoek; titel?: string; intro?: string; basis?: string; vast?: { vakgebied?: string; regio?: string } }) {
  const a = await huidigAccount();
  const zoek = { ...z, vakgebied: vast?.vakgebied ? [vast.vakgebied] : z.vakgebied, regio: vast?.regio ?? z.regio };
  const res = await zoekFreelancers({ q: zoek.q, regio: zoek.regio, vakgebied: zoek.vakgebied, vaardigheid: zoek.vaardigheid, maxTarief: Number(zoek.max) || null, beschikbaar: zoek.beschikbaar, pagina: Number(zoek.pagina) || 1 }, a);
  const suggesties = await q<{ v: string }>(`select v, count(*) from freelancers, unnest(vaardigheden) v group by v order by count(*) desc limit 40`);
  const chips: [string, string][] = [];
  if (z.q) chips.push([`“${z.q}”`, url(z, { q: '', pagina: '1' }, basis)]);
  if (!vast?.regio && z.regio) chips.push([z.regio, url(z, { regio: '', pagina: '1' }, basis)]);
  if (!vast?.vakgebied) z.vakgebied?.forEach(v => chips.push([vakgebiedNaam(v), url(z, { vakgebied: z.vakgebied!.filter(x => x !== v), pagina: '1' }, basis)]));
  z.vaardigheid?.forEach(v => chips.push([v, url(z, { vaardigheid: z.vaardigheid!.filter(x => x !== v), pagina: '1' }, basis)]));
  if (z.max) chips.push([`Tot € ${z.max} per uur`, url(z, { max: '', pagina: '1' }, basis)]);
  if (z.beschikbaar) chips.push([z.beschikbaar === 'nu' ? 'Nu beschikbaar' : 'Beschikbaar binnen 1 maand', url(z, { beschikbaar: '', pagina: '1' }, basis)]);
  const toonAlle = (z.vakgebied || []).some(v => VAKGEBIEDEN.findIndex(x => x.slug === v) >= 6);
  return (
    <>
      <div className="p-searchband">
        <div className="p-wrap">
          {titel && <h1 className="p-h2" style={{ margin: '6px 0 4px' }}>{titel}</h1>}
          {intro && <p className="p-muted" style={{ marginBottom: 12, maxWidth: 760 }}>{intro}</p>}
          <form className="p-searchbar" action={basis} method="get" role="search">
            <label className="sr-only" htmlFor="zq">Functie, vaardigheid of naam</label>
            <input id="zq" name="q" defaultValue={z.q} placeholder="Functie, vaardigheid of naam" />
            {!vast?.regio && <><label className="sr-only" htmlFor="zr">Regio</label><input id="zr" name="regio" defaultValue={z.regio} placeholder="Plaats of regio" /></>}
            {z.vakgebied?.map(v => !vast?.vakgebied && <input key={v} type="hidden" name="vakgebied" value={v} />)}
            <button className="btn btn-blue" type="submit">Zoek</button>
          </form>
        </div>
      </div>
      <div className="p-wrap p-results">
        <div className="p-filters-mobile">
          <input type="checkbox" id="ff-toggle" className="p-filters-toggle" />
          <label htmlFor="ff-toggle" className="btn btn-line btn-sm" style={{ marginBottom: 12 }}>Filters{chips.length ? ` (${chips.length})` : ''}</label>
          <form className="p-filters" action={basis} method="get" aria-label="Filters">
            <input type="hidden" name="q" value={z.q} />{!vast?.regio && <input type="hidden" name="regio" value={z.regio} />}
            <div className="p-between"><strong style={{ fontFamily: 'Poppins', fontSize: 18 }}>Filters</strong>{chips.length > 0 && <Link className="p-link p-small" href={basis}>Filters wissen</Link>}</div>
            {!vast?.vakgebied && (
              <fieldset id="vakgebied"><legend>Vakgebied</legend>
                {VAKGEBIEDEN.slice(0, 6).map(v => <label key={v.slug} className="p-check"><input type="checkbox" name="vakgebied" value={v.slug} defaultChecked={z.vakgebied?.includes(v.slug)} />{v.naam}</label>)}
                <details open={toonAlle}><summary className="p-link p-small" style={{ cursor: 'pointer', listStyle: 'none' }}>Toon alle 20 vakgebieden</summary>
                  <div className="p-stack" style={{ gap: 9, marginTop: 9 }}>{VAKGEBIEDEN.slice(6).map(v => <label key={v.slug} className="p-check"><input type="checkbox" name="vakgebied" value={v.slug} defaultChecked={z.vakgebied?.includes(v.slug)} />{v.naam}</label>)}</div>
                </details>
              </fieldset>
            )}
            <fieldset><legend>Vaardigheden</legend>
              {z.vaardigheid?.map(v => <label key={v} className="p-check"><input type="checkbox" name="vaardigheid" value={v} defaultChecked />{v}</label>)}
              <label className="sr-only" htmlFor="zv">Vaardigheid toevoegen</label>
              <input id="zv" name="vaardigheid" list="vaardigheden-lijst" placeholder="Bijvoorbeeld SAP PM" style={{ font: 'inherit', fontSize: 15, padding: '11px 13px', border: '2px solid var(--field)', borderRadius: 13 }} />
              <datalist id="vaardigheden-lijst">{suggesties.map(s => <option key={s.v} value={s.v} />)}</datalist>
            </fieldset>
            <fieldset><legend>Maximaal uurtarief</legend>
              <label className="sr-only" htmlFor="zm">Maximaal uurtarief in euro</label>
              <div className="p-row" style={{ flexWrap: 'nowrap' }}><span>€</span><input id="zm" name="max" type="number" min={10} max={500} step={5} defaultValue={z.max} placeholder="Geen maximum" style={{ font: 'inherit', fontSize: 15, padding: '11px 13px', border: '2px solid var(--field)', borderRadius: 13, width: '100%' }} /><span className="p-small p-muted">per uur</span></div>
            </fieldset>
            <fieldset><legend>Beschikbaarheid</legend>
              {[['', 'Alle'], ['nu', 'Nu beschikbaar'], ['maand', 'Binnen 1 maand']].map(([v, l]) => <label key={v} className="p-check"><input type="radio" name="beschikbaar" value={v} defaultChecked={(z.beschikbaar || '') === v} />{l}</label>)}
            </fieldset>
            <button className="btn btn-blue btn-sm" type="submit">Toon resultaten</button>
          </form>
        </div>
        <div className="p-stack" aria-live="polite">
          {chips.length > 0 && <div className="p-row" style={{ gap: 8 }}>{chips.map(([l, h]) => <span key={l} className="p-filterchip">{l}<Link href={h} aria-label={`Filter ${l} verwijderen`}>×</Link></span>)}<Link className="p-link p-small" href={basis}>Filters wissen</Link></div>}
          <div className="p-between"><strong>{res.totaal === 1 ? '1 freelancer' : `${res.totaal} freelancers`}</strong>{a?.rol === 'bedrijf' && chips.length > 0 && <BewaarZoekopdracht soort="freelancers" filters={zoek} naam={chips.map(c => c[0]).join(', ')} />}</div>
          {res.items.length ? res.items.map(f => <FreelancerKaart key={f.id} f={f} />) : (
            <Leeg titel="Geen freelancers gevonden" tekst={chips.length ? 'Probeer een bredere zoekterm, haal een filter weg of zoek in een grotere regio.' : 'Er staan nog geen freelancers op het platform in deze selectie.'}>
              <div className="p-row" style={{ justifyContent: 'center' }}>
                {chips.length > 0 && <Link className="btn btn-line btn-sm" href={basis}>Filters wissen</Link>}
                <Link className="btn btn-blue btn-sm" href="/bemiddeling">Laat ons voor u zoeken</Link>
              </div>
            </Leeg>
          )}
          <Paginering pagina={res.pagina} totaal={res.totaal} per={res.perPagina} basis={p => url(z, { pagina: String(p) }, basis)} />
        </div>
      </div>
    </>
  );
}
