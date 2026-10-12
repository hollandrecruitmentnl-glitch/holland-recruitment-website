import 'server-only';
import { q, one } from '../db';

export async function zoekBedrijven(z: { q?: string; branche?: string; plaats?: string; pagina?: number }) {
  const params: unknown[] = [];
  const where = [`b.status = 'actief'`];
  if (z.q) { params.push(`%${z.q.toLowerCase()}%`); where.push(`lower(b.naam) like $${params.length}`); }
  if (z.branche) { params.push(z.branche); where.push(`b.branche = $${params.length}`); }
  if (z.plaats) { params.push(`%${z.plaats.toLowerCase()}%`); where.push(`lower(b.plaats) like $${params.length}`); }
  const pag = Math.max(1, z.pagina ?? 1);
  const rows = await q(`select b.id, b.slug, b.naam, b.branche, b.plaats, b.grootte, b.logo_pad, left(b.omschrijving, 220) as omschrijving,
      (select count(*) from opdrachten o where o.bedrijf_id = b.id and o.status = 'live')::int as open_opdrachten, count(*) over() as totaal
    from bedrijven b where ${where.join(' and ')} order by open_opdrachten desc, b.naam limit 24 offset ${(pag - 1) * 24}`, params);
  return { items: rows, totaal: rows[0] ? Number(rows[0].totaal) : 0, pagina: pag, perPagina: 24 };
}

export async function bedrijfPagina(slug: string) {
  const b = await one(`select * from bedrijven where slug = $1`, [slug]);
  if (!b) return null;
  return b;
}
