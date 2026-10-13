import 'server-only';
import { cache } from 'react';
import { q, one } from '../db';
import type { Account } from '../auth';

export type FreelancerKaart = {
  id: string; slug: string; voornaam: string; achternaam: string; functietitel: string; regio: string; vakgebied: string | null;
  uurtarief: number | null; tarief_zichtbaar: boolean; beschikbaarheid: string; beschikbaar_vanaf: string | null; beschikbaar_tot: string | null;
  jaren_ervaring: number | null; vaardigheden: string[]; foto_pad: string | null; uren_per_week: number | null; werkvormen: string[];
};

export type ZoekFreelancers = { q?: string; regio?: string; vakgebied?: string[]; vaardigheid?: string[]; maxTarief?: number | null; beschikbaar?: string; pagina?: number; perPagina?: number };

/** Bedrijf-id van de kijker als die een bedrijf is (voor "na contact"). */
const contactSql = (alias: string, p: string) => `(
  exists (select 1 from gesprekken g join berichten b on b.gesprek_id = g.id and b.afzender_id = ${alias}.id
          where g.freelancer_id = ${alias}.id and g.bedrijf_id = ${p})
  or exists (select 1 from reacties r join opdrachten o on o.id = r.opdracht_id where r.freelancer_id = ${alias}.id and o.bedrijf_id = ${p}))`;

function zichtbaarSql(veld: 'tarief' | 'werkervaring' | 'cv', alias: string, kijker: Account | null, params: unknown[]): string {
  const kol = `${alias}.zichtbaar_${veld}`;
  if (kijker?.rol === 'beheer') return 'true';
  const self = kijker ? (params.push(kijker.id), `${alias}.id = $${params.length}`) : 'false';
  let contact = 'false';
  if (kijker?.bedrijf_id) { params.push(kijker.bedrijf_id); contact = contactSql(alias, `$${params.length}`); }
  return `(${self} or ${kol} = 'publiek' or (${kol} = 'na_contact' and ${contact}))`;
}

export async function zoekFreelancers(z: ZoekFreelancers, kijker: Account | null) {
  const params: unknown[] = [];
  const where: string[] = [`a.status = 'actief'`, `f.functietitel <> ''`];
  if (z.q) {
    params.push(`%${z.q.toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(f.functietitel) like $${i} or lower(a.voornaam || ' ' || a.achternaam) like $${i} or lower(f.introductie) like $${i} or exists (select 1 from unnest(f.vaardigheden) v where lower(v) like $${i}))`);
  }
  if (z.regio) { params.push(`%${z.regio.toLowerCase()}%`); where.push(`lower(f.regio) like $${params.length}`); }
  if (z.vakgebied?.length) { params.push(z.vakgebied); where.push(`f.vakgebied = any($${params.length})`); }
  if (z.vaardigheid?.length) { params.push(z.vaardigheid.map(s => s.toLowerCase())); where.push(`(select count(*) from unnest(f.vaardigheden) v where lower(v) = any($${params.length})) = ${z.vaardigheid.length}`); }
  const tariefZichtbaar = zichtbaarSql('tarief', 'f', kijker, params);
  if (z.maxTarief) { params.push(z.maxTarief); where.push(`f.uurtarief is not null and f.uurtarief <= $${params.length} and ${tariefZichtbaar}`); }
  if (z.beschikbaar === 'nu') where.push(`f.beschikbaarheid = 'nu'`);
  if (z.beschikbaar === 'maand') where.push(`(f.beschikbaarheid = 'nu' or (f.beschikbaarheid in ('vanaf','periode') and f.beschikbaar_vanaf <= current_date + 31))`);
  const per = z.perPagina ?? 20, pag = Math.max(1, z.pagina ?? 1);
  let rank = 'f.bijgewerkt desc';
  if (z.q) { params.push(`%${z.q.toLowerCase()}%`); rank = `(lower(f.functietitel) like $${params.length}) desc, ${rank}`; }
  const sql = `select f.id, f.slug, a.voornaam, a.achternaam, f.functietitel, f.regio, f.vakgebied,
      case when ${tariefZichtbaar} then f.uurtarief end as uurtarief, (${tariefZichtbaar}) as tarief_zichtbaar,
      f.beschikbaarheid, f.beschikbaar_vanaf::text, f.beschikbaar_tot::text, f.jaren_ervaring, f.vaardigheden, f.foto_pad, f.uren_per_week, f.werkvormen,
      count(*) over() as totaal
    from freelancers f join accounts a on a.id = f.id
    where ${where.join(' and ')}
    order by (f.beschikbaarheid = 'niet') asc, ${rank}
    limit ${per} offset ${(pag - 1) * per}`;
  const rows = await q<FreelancerKaart & { totaal: string }>(sql, params);
  return { items: rows, totaal: rows[0] ? Number(rows[0].totaal) : 0, pagina: pag, perPagina: per };
}

export async function freelancerProfiel(slug: string, kijker: Account | null) {
  const params: unknown[] = [slug];
  const t = zichtbaarSql('tarief', 'f', kijker, params);
  const w = zichtbaarSql('werkervaring', 'f', kijker, params);
  const c = zichtbaarSql('cv', 'f', kijker, params);
  const p = await one(`select f.*, f.beschikbaar_vanaf::text as beschikbaar_vanaf, f.beschikbaar_tot::text as beschikbaar_tot,
      a.voornaam, a.achternaam, a.status, a.laatst_actief, a.aangemaakt,
      (${t}) as toon_tarief, (${w}) as toon_werkervaring, (${c}) as toon_cv
    from freelancers f join accounts a on a.id = f.id where f.slug = $1`, params);
  if (!p) return null;
  if (p.status !== 'actief' && kijker?.rol !== 'beheer' && kijker?.id !== p.id) return null;
  if (!p.toon_tarief) p.uurtarief = null;
  const werk = p.toon_werkervaring ? await q(`select * from werkervaring where freelancer_id = $1 order by huidig desc, coalesce(tot, 9999) desc, van desc`, [p.id]) : [];
  return { ...p, werkervaring: werk };
}

export type ProfielStap = { klaar: boolean; label: string; taak: string };
export function volledigheid(f: any, werkAantal: number): { pct: number; volgende: string | null; stappen: ProfielStap[] } {
  const stappen: ProfielStap[] = [
    { klaar: !!f.functietitel, label: 'Functietitel', taak: 'Vul je functietitel in' },
    { klaar: !!f.regio, label: 'Regio', taak: 'Vul je regio in' },
    { klaar: !!f.vakgebied, label: 'Vakgebied', taak: 'Kies je vakgebied' },
    { klaar: (f.introductie || '').length >= 80, label: 'Introductie', taak: 'Schrijf een introductie van minimaal 80 tekens' },
    { klaar: f.uurtarief != null, label: 'Uurtarief', taak: 'Vul je uurtarief in' },
    { klaar: (f.vaardigheden || []).length >= 3, label: 'Vaardigheden', taak: 'Voeg minimaal drie vaardigheden toe' },
    { klaar: werkAantal >= 1, label: 'Werkervaring', taak: 'Voeg je werkervaring toe' },
    { klaar: !!f.cv_pad, label: 'Cv', taak: 'Upload je cv' },
    { klaar: !!f.foto_pad, label: 'Foto', taak: 'Voeg een foto toe' },
    { klaar: (f.certificeringen || []).length + (f.sectoren || []).length >= 1, label: 'Certificeringen of sectoren', taak: 'Voeg certificeringen of sectorervaring toe' },
  ];
  const klaar = stappen.filter(s => s.klaar).length;
  return { pct: Math.round((klaar / stappen.length) * 100), volgende: stappen.find(s => !s.klaar)?.taak ?? null, stappen };
}

/** Volledigheid op basis van id (voor header en overzicht). */
export const profielVolledigheid = cache(async (id: string) => {
  const f = await one(`select * from freelancers where id = $1`, [id]);
  if (!f) return { pct: 100, volgende: null, stappen: [] as ProfielStap[] };
  const werk = await one<{ n: number }>('select count(*)::int as n from werkervaring where freelancer_id = $1', [id]);
  return volledigheid(f, werk?.n ?? 0);
});

export async function uitgelichteFreelancers(kijker: Account | null) {
  return (await zoekFreelancers({ beschikbaar: 'nu', perPagina: 3 }, kijker)).items;
}
