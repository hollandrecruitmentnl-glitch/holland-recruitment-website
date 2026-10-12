import 'server-only';
import { q, one } from '../db';
import type { Account } from '../auth';

/** SQL-fragment: gesprekken waar het account deelnemer is. $1 = account id, $2 = bedrijf id */
const deelname = `(g.freelancer_id = $1 or g.bedrijf_id = $2)`;

export async function ongelezenAantal(a: Account): Promise<number> {
  const r = await one<{ n: number }>(`
    select count(distinct g.id)::int as n from gesprekken g
    join berichten b on b.gesprek_id = g.id and (b.afzender_id is distinct from $1) and b.systeem = false
    left join gelezen gl on gl.gesprek_id = g.id and gl.account_id = $1
    where ${deelname} and (gl.tot is null or b.aangemaakt > gl.tot)
      and not exists (select 1 from blokkades bk where bk.gesprek_id = g.id and bk.blokkeerder_id = $1)`, [a.id, a.bedrijf_id]);
  return r?.n ?? 0;
}

export async function gesprekkenLijst(a: Account) {
  return q(`
    select g.id, g.statuslabel, g.laatste_bericht, g.opdracht_id, o.titel as opdracht_titel, o.slug as opdracht_slug,
      fa.voornaam as f_voornaam, fa.achternaam as f_achternaam, f.slug as f_slug, f.functietitel as f_functie, f.foto_pad as f_foto,
      b.naam as b_naam, b.slug as b_slug, b.logo_pad as b_logo,
      (select tekst from berichten m where m.gesprek_id = g.id order by m.aangemaakt desc limit 1) as laatste_tekst,
      (select bijlage_naam from berichten m where m.gesprek_id = g.id order by m.aangemaakt desc limit 1) as laatste_bijlage,
      exists (select 1 from berichten m left join gelezen gl on gl.gesprek_id = g.id and gl.account_id = $1
              where m.gesprek_id = g.id and m.afzender_id is distinct from $1 and m.systeem = false and (gl.tot is null or m.aangemaakt > gl.tot)) as ongelezen,
      exists (select 1 from blokkades bk where bk.gesprek_id = g.id) as geblokkeerd
    from gesprekken g join freelancers f on f.id = g.freelancer_id join accounts fa on fa.id = f.id
    join bedrijven b on b.id = g.bedrijf_id left join opdrachten o on o.id = g.opdracht_id
    where ${deelname} and not exists (select 1 from blokkades bk where bk.gesprek_id = g.id and bk.blokkeerder_id = $1)
      and exists (select 1 from berichten m where m.gesprek_id = g.id)
    order by g.laatste_bericht desc limit 200`, [a.id, a.bedrijf_id]);
}

export async function gesprekVoor(a: Account, id: string) {
  return one(`
    select g.*, o.titel as opdracht_titel, o.slug as opdracht_slug, fa.voornaam as f_voornaam, fa.achternaam as f_achternaam,
      f.slug as f_slug, f.functietitel as f_functie, f.foto_pad as f_foto, b.naam as b_naam, b.slug as b_slug, b.logo_pad as b_logo,
      exists (select 1 from blokkades bk where bk.gesprek_id = g.id) as geblokkeerd,
      exists (select 1 from blokkades bk where bk.gesprek_id = g.id and bk.blokkeerder_id = $1) as door_mij_geblokkeerd
    from gesprekken g join freelancers f on f.id = g.freelancer_id join accounts fa on fa.id = f.id
    join bedrijven b on b.id = g.bedrijf_id left join opdrachten o on o.id = g.opdracht_id
    where g.id = $3 and ${deelname}`, [a.id, a.bedrijf_id, id]);
}

export async function berichtenVan(gesprekId: string, naId?: string) {
  return q(`select m.id, m.afzender_id, m.systeem, m.tekst, m.bijlage_naam, m.bijlage_grootte, (m.bijlage_pad is not null) as heeft_bijlage, m.aangemaakt,
      a.voornaam, a.rol from berichten m left join accounts a on a.id = m.afzender_id
    where m.gesprek_id = $1 ${naId ? 'and m.aangemaakt > (select aangemaakt from berichten where id = $2)' : ''}
    order by m.aangemaakt asc limit 500`, naId ? [gesprekId, naId] : [gesprekId]);
}

/** Wanneer de andere partij het laatst las (voor "Gelezen"). */
export async function andereGelezenTot(gesprekId: string, a: Account): Promise<string | null> {
  const r = await one<{ tot: string }>(`select max(tot) as tot from gelezen where gesprek_id = $1 and account_id <> $2
    and account_id not in (select account_id from bedrijf_leden where bedrijf_id = $3)`, [gesprekId, a.id, a.bedrijf_id]);
  return r?.tot ?? null;
}

export async function markeerGelezen(gesprekId: string, accountId: string) {
  await q(`insert into gelezen (gesprek_id, account_id, tot) values ($1,$2,now()) on conflict (gesprek_id, account_id) do update set tot = now()`, [gesprekId, accountId]);
}
