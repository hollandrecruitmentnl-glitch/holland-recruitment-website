import 'server-only';
import { q, one } from './db';
import { mails } from './emails';
import { SITE } from './mail';
import { limiet } from './ratelimit';
import { BRON_NAAM } from './constants';
import { adzunaGebruik } from './feeds';

/**
 * Bewaking van de nachtelijke opdrachten-update. Meldt per e-mail (info@) als:
 * - de update de afgelopen 26 uur niet heeft gedraaid, of een bron is vastgelopen/mislukt;
 * - er in totaal niets is opgehaald, of er geen enkele nieuwe opdracht live is gegaan;
 * - er nog maar weinig externe opdrachten live staan.
 * Maximaal één melding per dag.
 */
export type Bevinding = { ernst: 'fout' | 'let_op'; tekst: string };

export async function controleerFeeds(): Promise<{ ok: boolean; bevindingen: Bevinding[]; laatsteRun: string | null; nieuw: number; live: number }> {
  const actief = [
    ...(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY ? ['adzuna'] : []), ...(process.env.JOOBLE_KEY ? ['jooble'] : []), ...(process.env.PARTNER_FEEDS ? ['feed'] : []),
    'remotive', 'remoteok', 'jobicy',
  ];
  const runs = await q<{ bron: string; gestart: string; klaar: string | null; nieuw: number; bijgewerkt: number; fout: string | null }>(
    `select distinct on (bron) bron, gestart::text, klaar::text, nieuw, bijgewerkt, fout from feed_runs where gestart > now() - interval '26 hours' order by bron, gestart desc`);
  const live = (await one<{ n: number }>(`select count(*)::int as n from opdrachten where bron <> 'direct' and status = 'live'`))?.n ?? 0;
  const laatste = (await one<{ t: string | null }>(`select max(gestart)::text as t from feed_runs`))?.t ?? null;
  const b: Bevinding[] = [];
  const naam = (x: string) => BRON_NAAM[x] || x;
  if (!runs.length) b.push({ ernst: 'fout', tekst: `De nachtelijke update van de opdrachten heeft de afgelopen 26 uur niet gedraaid${laatste ? ` (laatste keer: ${new Date(laatste).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })})` : ''}.` });
  const adz = actief.includes('adzuna') ? await adzunaGebruik().catch(() => null) : null;
  if (adz && adz.totaal >= adz.max) b.push({ ernst: 'let_op', tekst: `Adzuna: het proefbudget is op (${adz.totaal} van ${adz.max} verzoeken). Kies een betaald account of zet Adzuna uit.` });
  for (const bron of actief) {
    const r = runs.find(x => x.bron === bron);
    if (!r && bron === 'adzuna' && adz && adz.over <= 0) continue; // budget voor vandaag/totaal op: bewust niet gedraaid
    if (!r) { if (runs.length) b.push({ ernst: 'fout', tekst: `${naam(bron)}: niet gedraaid.` }); continue; }
    if (!r.klaar && Date.now() - Date.parse(r.gestart) > 3600_000) b.push({ ernst: 'fout', tekst: `${naam(bron)}: vastgelopen (niet afgerond).` });
    if (r.fout && !r.fout.startsWith('info:')) b.push({ ernst: 'fout', tekst: `${naam(bron)}: fout — ${r.fout.slice(0, 160)}` });
    else if (r.klaar && r.nieuw + r.bijgewerkt === 0 && ['jooble', 'adzuna'].includes(bron)) b.push({ ernst: 'let_op', tekst: `${naam(bron)}: leverde 0 opdrachten.` });
  }
  // Nieuw = alle runs van de afgelopen 26 uur samen (dus ook als er daarna nog handmatig is opgehaald)
  const nieuw = (await one<{ n: number }>(`select coalesce(sum(nieuw), 0)::int as n from feed_runs where gestart > now() - interval '26 hours'`))?.n ?? 0;
  if (runs.length && runs.reduce((s, r) => s + r.nieuw + r.bijgewerkt, 0) === 0) b.push({ ernst: 'fout', tekst: 'Er zijn in totaal 0 opdrachten opgehaald.' });
  else if (runs.length && nieuw === 0) b.push({ ernst: 'let_op', tekst: 'De afgelopen 24 uur zijn er geen nieuwe opdrachten bijgekomen. Dit is geen fout: de bronnen leverden alleen opdrachten die al op het platform stonden (die zijn bijgewerkt).' });
  if (live < 15) b.push({ ernst: 'let_op', tekst: `Er staan nog maar ${live} externe opdrachten live.` });
  return { ok: b.length === 0, bevindingen: b, laatsteRun: laatste, nieuw, live };
}

/** Controleer en mail bij problemen (max. 1× per dag). */
export async function bewaakFeeds(): Promise<{ ok: boolean; gemaild: boolean; bevindingen: Bevinding[] }> {
  const c = await controleerFeeds();
  if (c.ok) return { ok: true, gemaild: false, bevindingen: [] };
  const dag = new Date().toISOString().slice(0, 10);
  if (!(await limiet(`alert:feeds:${dag}`, 1, 86400))) return { ok: false, gemaild: false, bevindingen: c.bevindingen };
  const fout = c.bevindingen.some(x => x.ernst === 'fout');
  await mails.intern('info', fout ? 'Let op: de opdrachten zijn vannacht niet goed bijgewerkt' : 'Opdrachten-update: controleer even',
    [...c.bevindingen.map((x, i) => [`${i + 1}. ${x.ernst === 'fout' ? 'Fout' : 'Let op'}`, x.tekst] as [string, string]),
      ['Nieuwe opdrachten vannacht', String(c.nieuw)], ['Externe opdrachten live', String(c.live)]],
    `${SITE}/beheer/feeds`);
  return { ok: false, gemaild: true, bevindingen: c.bevindingen };
}
