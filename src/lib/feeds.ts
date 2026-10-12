import 'server-only';
import { q, one } from './db';
import { slugify, kort } from './util';

type Extern = { bron: 'adzuna' | 'jooble' | 'feed'; bron_id: string; titel: string; omschrijving: string; url: string; aanbieder: string | null; locatie: string; vakgebied: string | null; tarief_min: number | null; tarief_max: number | null; geplaatst: Date; werkvorm: string | null };

const FREELANCE = /\b(freelance|freelancer|zzp|zzp'er|interim|zelfstandige?|opdracht|contract|inhuur|detachering)\b/i;
const VAST = /\b(vast contract|vaste baan|in loondienst|cao)\b/i;
const strip = (s: string) => String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const TAGS: Record<string, string> = {
  'it-jobs': 'it-software', 'engineering-jobs': 'engineering', 'accounting-finance-jobs': 'finance-control', 'pr-advertising-marketing-jobs': 'marketing-communicatie',
  'hr-jobs': 'hr-recruitment', 'logistics-warehouse-jobs': 'logistiek-supply-chain', 'sales-jobs': 'sales-accountmanagement', 'consultancy-jobs': 'management-interim',
  'legal-jobs': 'juridisch-compliance', 'healthcare-nursing-jobs': 'zorg-welzijn', 'teaching-jobs': 'onderwijs-training', 'admin-jobs': 'administratie-support',
  'trade-construction-jobs': 'bouw-infra', 'manufacturing-jobs': 'techniek-onderhoud', 'maintenance-jobs': 'techniek-onderhoud', 'energy-oil-gas-jobs': 'techniek-onderhoud',
  'scientific-qa-jobs': 'hse-kwaliteit', 'creative-design-jobs': 'design-creatief', 'customer-services-jobs': 'administratie-support', 'property-jobs': 'bouw-infra',
};
const WOORDEN: [RegExp, string][] = [
  [/developer|software|devops|cloud|it[- ]|ict|security|netwerk/i, 'it-software'], [/data|analist|analytics|bi[- ]|power bi/i, 'data-analytics'],
  [/controller|finance|financ|accountant|boekhoud|fiscal/i, 'finance-control'], [/marketing|communicatie|content|seo|sea|campagne/i, 'marketing-communicatie'],
  [/project ?manager|projectleider|programma/i, 'projectmanagement'], [/engineer|ontwerp|constructeur/i, 'engineering'],
  [/monteur|technicus|onderhoud|maintenance|operator|e&i|elektro|werkvoorbereider/i, 'techniek-onderhoud'], [/hr|recruit|p&o/i, 'hr-recruitment'],
  [/inkoop|buyer|procurement/i, 'inkoop'], [/jurist|juridisch|compliance|legal/i, 'juridisch-compliance'], [/hse|veiligheid|kwaliteit|qa/i, 'hse-kwaliteit'],
  [/beleid|gemeente|overheid|provincie/i, 'overheid-beleid'], [/interim manager|directeur|manager/i, 'management-interim'], [/logistiek|supply chain|planner/i, 'logistiek-supply-chain'],
  [/sales|accountmanager|business development/i, 'sales-accountmanagement'], [/bouw|infra|uitvoerder|calculator/i, 'bouw-infra'], [/design|ux|ui|grafisch/i, 'design-creatief'],
];
const raadVakgebied = (t: string) => WOORDEN.find(([r]) => r.test(t))?.[1] ?? null;
const werkvorm = (t: string) => (/\bremote\b|thuiswerk/i.test(t) ? 'remote' : /hybride|hybrid/i.test(t) ? 'hybride' : null);

async function adzuna(): Promise<Extern[]> {
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) throw new Error('ADZUNA_APP_ID/ADZUNA_APP_KEY ontbreken');
  const out: Extern[] = [];
  const zoek = ['freelance', 'zzp', 'interim'];
  for (const what of zoek) {
    for (let p = 1; p <= 4; p++) {
      const u = new URL(`https://api.adzuna.com/v1/api/jobs/nl/search/${p}`);
      u.search = new URLSearchParams({ app_id: id, app_key: key, results_per_page: '50', what, max_days_old: '21', sort_by: 'date', 'content-type': 'application/json' }).toString();
      const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`Adzuna ${r.status}`);
      const j: any = await r.json();
      for (const x of j.results || []) {
        const titel = strip(x.title), oms = strip(x.description);
        if (!FREELANCE.test(`${titel} ${oms}`) && x.contract_type !== 'contract') continue;
        if (VAST.test(titel)) continue;
        const uurloon = (n: number | undefined) => (n && !x.salary_is_predicted && n < 400 ? Math.round(n) : null); // alleen echte uurtarieven tonen
        out.push({ bron: 'adzuna', bron_id: String(x.id), titel, omschrijving: oms, url: x.redirect_url, aanbieder: x.company?.display_name || null, locatie: x.location?.display_name || '',
          vakgebied: TAGS[x.category?.tag] || raadVakgebied(titel), tarief_min: uurloon(x.salary_min), tarief_max: uurloon(x.salary_max), geplaatst: new Date(x.created), werkvorm: werkvorm(`${titel} ${oms}`) });
      }
      if ((j.results || []).length < 50) break;
    }
  }
  return out;
}

async function jooble(): Promise<Extern[]> {
  const key = process.env.JOOBLE_KEY;
  if (!key) throw new Error('JOOBLE_KEY ontbreekt');
  const host = process.env.JOOBLE_HOST || 'nl.jooble.org';
  const out: Extern[] = [];
  for (const keywords of ['freelance', 'zzp', 'interim']) {
    for (let page = 1; page <= 3; page++) {
      const r = await fetch(`https://${host}/api/${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, location: 'Nederland', page: String(page) }), signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`Jooble ${r.status}`);
      const j: any = await r.json();
      for (const x of j.jobs || []) {
        const titel = strip(x.title), oms = strip(x.snippet);
        if (!FREELANCE.test(`${titel} ${oms} ${x.type || ''}`) || VAST.test(titel)) continue;
        out.push({ bron: 'jooble', bron_id: String(x.id), titel, omschrijving: oms, url: x.link, aanbieder: x.company || x.source || null, locatie: x.location || '',
          vakgebied: raadVakgebied(titel), tarief_min: null, tarief_max: null, geplaatst: x.updated ? new Date(x.updated) : new Date(), werkvorm: werkvorm(`${titel} ${oms}`) });
      }
      if ((j.jobs || []).length < 20) break;
    }
  }
  return out;
}

/** Partnerfeeds (JSON) met toestemming: PARTNER_FEEDS='[{"naam":"…","url":"…"}]' — verwacht een array met id,titel,omschrijving,url,locatie. */
async function partners(): Promise<Extern[]> {
  const cfg = process.env.PARTNER_FEEDS; if (!cfg) return [];
  const out: Extern[] = [];
  for (const f of JSON.parse(cfg) as { naam: string; url: string }[]) {
    const r = await fetch(f.url, { signal: AbortSignal.timeout(15000) }); if (!r.ok) continue;
    const j: any = await r.json();
    for (const x of Array.isArray(j) ? j : j.items || []) {
      if (!x.id || !x.titel || !x.url) continue;
      out.push({ bron: 'feed', bron_id: `${slugify(f.naam)}:${x.id}`, titel: strip(x.titel), omschrijving: strip(x.omschrijving || ''), url: x.url, aanbieder: x.aanbieder || f.naam, locatie: x.locatie || '',
        vakgebied: x.vakgebied || raadVakgebied(x.titel), tarief_min: x.tarief_min ?? null, tarief_max: x.tarief_max ?? null, geplaatst: x.geplaatst ? new Date(x.geplaatst) : new Date(), werkvorm: x.werkvorm || werkvorm(x.titel) });
    }
  }
  return out;
}

async function importeer(bron: string, ophalen: () => Promise<Extern[]>) {
  const run = await one<{ id: number; gestart: string }>(`insert into feed_runs (bron) values ($1) returning id, gestart`, [bron]);
  try {
    const items = await ophalen();
    let nieuw = 0, bij = 0;
    const gezien = new Set<string>();
    for (const x of items) {
      if (gezien.has(x.bron_id) || !/^https?:\/\//.test(x.url)) continue; gezien.add(x.bron_id);
      const r = await one<{ ins: boolean }>(`
        insert into opdrachten (slug, bron, bron_id, aanbieder, externe_url, laatst_gecontroleerd, titel, vakgebied, omschrijving, locatie, werkvorm, tarief_min, tarief_max, status, geplaatst_op)
        values ($1,$2,$3,$4,$5,now(),$6,$7,$8,$9,$10,$11,$12,'live',$13)
        on conflict (bron, bron_id) where bron_id is not null do update set laatst_gecontroleerd = now(), externe_url = excluded.externe_url, titel = excluded.titel,
          omschrijving = excluded.omschrijving, status = case when opdrachten.status = 'verlopen' then 'live' else opdrachten.status end
        returning (xmax = 0) as ins`,
        [`${slugify(x.titel)}-${kort()}`, x.bron, x.bron_id, x.aanbieder?.slice(0, 120) ?? null, x.url, x.titel.slice(0, 200), x.vakgebied, x.omschrijving.slice(0, 1200), x.locatie.slice(0, 80), x.werkvorm,
          x.tarief_min, x.tarief_max && x.tarief_min && x.tarief_max < x.tarief_min ? null : x.tarief_max, isNaN(x.geplaatst.getTime()) ? new Date() : x.geplaatst]);
      if (r?.ins) nieuw++; else bij++;
    }
    // Wat de bron niet meer levert (2 dagen niet gezien) → verlopen
    const verlopen = await q(`update opdrachten set status = 'verlopen' where bron = $1 and status = 'live' and laatst_gecontroleerd < now() - interval '2 days' returning id`, [bron]);
    await q(`update feed_runs set klaar = now(), nieuw = $2, bijgewerkt = $3, verlopen = $4 where id = $1`, [run!.id, nieuw, bij, verlopen.length]);
  } catch (e) {
    await q(`update feed_runs set klaar = now(), fout = $2 where id = $1`, [run!.id, (e as Error).message.slice(0, 300)]);
  }
}

export async function draaiFeeds() {
  if (process.env.ADZUNA_APP_ID) await importeer('adzuna', adzuna);
  if (process.env.JOOBLE_KEY) await importeer('jooble', jooble);
  if (process.env.PARTNER_FEEDS) await importeer('feed', partners);
  // Oude externe opdrachten na 60 dagen opruimen
  await q(`delete from opdrachten where bron <> 'direct' and status = 'verlopen' and laatst_gecontroleerd < now() - interval '60 days'`);
}
