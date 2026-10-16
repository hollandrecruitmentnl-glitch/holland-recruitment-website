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

/**
 * Logostrook "Bedrijven op ons platform" (home). Alleen bedrijven die:
 * actief zijn, een logo hebben, het tonen niet hebben uitgezet, niet door beheer verborgen zijn,
 * en minstens één actief teamlid met een bevestigd e-mailadres hebben (voorkomt nep-accounts met andermans logo).
 */
export async function logoStrook(max = 18) {
  return q<{ id: string; slug: string; naam: string; logo_pad: string }>(`select b.id, b.slug, b.naam, b.logo_pad from bedrijven b
    where b.status = 'actief' and b.logo_pad is not null and b.logo_tonen and not b.logo_verborgen
      and exists (select 1 from bedrijf_leden bl join accounts ac on ac.id = bl.account_id where bl.bedrijf_id = b.id and ac.email_bevestigd and ac.status = 'actief')
    order by b.aangemaakt desc limit ${Math.max(1, Math.min(48, max))}`);
}
