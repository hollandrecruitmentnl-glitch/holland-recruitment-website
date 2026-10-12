import 'server-only';
import { q, one } from '../db';

export type OpdrachtKaart = {
  id: string; slug: string; titel: string; bron: string; aanbieder: string | null; bedrijf_naam: string | null; bedrijf_slug: string | null;
  locatie: string; werkvorm: string | null; vakgebied: string | null; tarief_min: number | null; tarief_max: number | null; tarief_in_overleg: boolean;
  uren_min: number | null; uren_max: number | null; geplaatst_op: string; reageren_tot: string | null; omschrijving: string; start_asap: boolean; start_datum: string | null;
  bemiddeling: boolean;
};

export type ZoekOpdrachten = { q?: string; locatie?: string; vakgebied?: string[]; werkvorm?: string[]; bron?: string; sorteer?: string; pagina?: number; perPagina?: number; bedrijfId?: string; sinds?: string };

export async function zoekOpdrachten(z: ZoekOpdrachten) {
  const params: unknown[] = [];
  const where = [`o.status = 'live'`, `(o.bedrijf_id is null or b.status = 'actief')`, `(o.reageren_tot is null or o.reageren_tot >= current_date)`];
  if (z.q) { params.push(`%${z.q.toLowerCase()}%`); const i = params.length; where.push(`(lower(o.titel) like $${i} or lower(o.omschrijving) like $${i} or exists (select 1 from unnest(o.vaardigheden) v where lower(v) like $${i}))`); }
  if (z.locatie) { params.push(`%${z.locatie.toLowerCase()}%`); where.push(`(lower(o.locatie) like $${params.length} or o.werkvorm = 'remote')`); }
  if (z.vakgebied?.length) { params.push(z.vakgebied); where.push(`o.vakgebied = any($${params.length})`); }
  if (z.werkvorm?.length) { params.push(z.werkvorm); where.push(`o.werkvorm = any($${params.length})`); }
  if (z.bron === 'direct') where.push(`o.bron = 'direct'`);
  if (z.bron === 'extern') where.push(`o.bron <> 'direct'`);
  if (z.bedrijfId) { params.push(z.bedrijfId); where.push(`o.bedrijf_id = $${params.length}`); }
  if (z.sinds) { params.push(z.sinds); where.push(`o.geplaatst_op > $${params.length}`); }
  const per = z.perPagina ?? 20, pag = Math.max(1, z.pagina ?? 1);
  let order = 'o.geplaatst_op desc';
  if (z.sorteer === 'relevant' && z.q) { params.push(`%${z.q.toLowerCase()}%`); order = `(lower(o.titel) like $${params.length}) desc, (o.bron = 'direct') desc, o.geplaatst_op desc`; }
  else if (z.sorteer === 'relevant') order = `(o.bron = 'direct') desc, o.geplaatst_op desc`;
  const rows = await q<OpdrachtKaart & { totaal: string }>(`
    select o.id, o.slug, o.titel, o.bron, o.aanbieder, b.naam as bedrijf_naam, b.slug as bedrijf_slug, o.locatie, o.werkvorm, o.vakgebied,
      o.tarief_min, o.tarief_max, o.tarief_in_overleg, o.uren_min, o.uren_max, o.geplaatst_op, o.reageren_tot::text, left(o.omschrijving, 400) as omschrijving,
      o.start_asap, o.start_datum::text, o.bemiddeling, count(*) over() as totaal
    from opdrachten o left join bedrijven b on b.id = o.bedrijf_id
    where ${where.join(' and ')} order by ${order} limit ${per} offset ${(pag - 1) * per}`, params);
  return { items: rows, totaal: rows[0] ? Number(rows[0].totaal) : 0, pagina: pag, perPagina: per };
}

export async function opdrachtDetail(slug: string) {
  return one(`select o.*, o.reageren_tot::text as reageren_tot, o.start_datum::text as start_datum,
      b.naam as bedrijf_naam, b.slug as bedrijf_slug, b.plaats as bedrijf_plaats, b.logo_pad as bedrijf_logo, b.status as bedrijf_status,
      (select count(*) from reacties r where r.opdracht_id = o.id)::int as aantal_reacties
    from opdrachten o left join bedrijven b on b.id = o.bedrijf_id where o.slug = $1`, [slug]);
}

export async function tellingen() {
  return one<{ direct: number; extern: number }>(`select count(*) filter (where bron='direct')::int as direct, count(*) filter (where bron<>'direct')::int as extern
    from opdrachten where status='live' and (reageren_tot is null or reageren_tot >= current_date)`);
}

export function tariefTekst(o: { tarief_min: number | null; tarief_max: number | null; tarief_in_overleg: boolean }): string {
  if (o.tarief_in_overleg) return 'Tarief in overleg';
  if (o.tarief_min && o.tarief_max) return o.tarief_min === o.tarief_max ? `€ ${o.tarief_min} per uur` : `€ ${o.tarief_min}–${o.tarief_max} per uur`;
  if (o.tarief_max) return `Tot € ${o.tarief_max} per uur`;
  if (o.tarief_min) return `Vanaf € ${o.tarief_min} per uur`;
  return 'Tarief niet vermeld';
}
export function urenTekst(o: { uren_min: number | null; uren_max: number | null }): string {
  if (o.uren_min && o.uren_max) return o.uren_min === o.uren_max ? `${o.uren_min} uur per week` : `${o.uren_min}–${o.uren_max} uur per week`;
  if (o.uren_max) return `Tot ${o.uren_max} uur per week`;
  if (o.uren_min) return `Vanaf ${o.uren_min} uur per week`;
  return 'Uren niet vermeld';
}
