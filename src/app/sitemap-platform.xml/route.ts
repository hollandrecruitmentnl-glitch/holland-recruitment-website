import { q } from '@/lib/db';
import { SITE } from '@/lib/mail';
import { REGIOS, VAKGEBIEDEN } from '@/lib/constants';
import { landingTellingen, MIN_LANDING } from '@/lib/data/opdrachten';

export const dynamic = 'force-dynamic';
export async function GET() {
  const urls: [string, string?][] = [['/freelance-platform'], ['/opdrachten'], ['/freelancers-zoeken'], ['/bedrijven'], ['/bemiddeling']];
  const ops = await q(`select slug, bijgewerkt from opdrachten where bron = 'direct' and status = 'live' and (reageren_tot is null or reageren_tot >= current_date)`);
  ops.forEach((o: any) => urls.push([`/opdrachten/${o.slug}`, new Date(o.bijgewerkt).toISOString()]));
  const fr = await q(`select f.slug, f.bijgewerkt from freelancers f join accounts a on a.id = f.id where a.status = 'actief' and f.vindbaar_google and f.functietitel <> ''`);
  fr.forEach((f: any) => urls.push([`/freelancer/${f.slug}`, new Date(f.bijgewerkt).toISOString()]));
  const bd = await q(`select slug from bedrijven where status = 'actief'`);
  bd.forEach((b: any) => urls.push([`/bedrijf/${b.slug}`]));
  const combi = await q(`select f.vakgebied, lower(f.regio) as regio from freelancers f join accounts a on a.id = f.id where a.status = 'actief' and f.vakgebied is not null group by 1, 2`);
  const set = new Set<string>();
  for (const c of combi) for (const r of REGIOS) if (c.regio.includes(r.naam.toLowerCase()) && VAKGEBIEDEN.some(v => v.slug === c.vakgebied)) set.add(`/freelancers-zoeken/${c.vakgebied}/${r.slug}`);
  set.forEach(u => urls.push([u]));
  // Landingspagina's met opdrachten per vakgebied/regio (alleen als er genoeg open opdrachten zijn)
  for (const t of await landingTellingen()) if (t.n >= MIN_LANDING) urls.push([t.pad, new Date(t.laatst).toISOString()]);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `<url><loc>${SITE}${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
