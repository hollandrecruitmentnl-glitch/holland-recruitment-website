import 'server-only';
import { q, one } from './db';
import { slugify, kort } from './util';

type Extern = { bron: 'adzuna' | 'jooble' | 'feed' | 'remotive' | 'remoteok' | 'jobicy'; bron_id: string; titel: string; omschrijving: string; url: string; aanbieder: string | null; locatie: string; vakgebied: string | null; tarief_min: number | null; tarief_max: number | null; geplaatst: Date; werkvorm: string | null };

const FREELANCE = /\b(freelance|freelancer|zzp|zzp'er|interim|zelfstandige?|opdracht|contract|inhuur|detachering)\b/i;
const VAST = /\b(vast contract|vaste baan|in loondienst|cao)\b/i;
const herstel = (s: string) => (/Ã.|Â./.test(s) ? (() => { try { return Buffer.from(s, 'latin1').toString('utf8'); } catch { return s; } })() : s);
const strip = (s: string) => herstel(String(s || '')).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

const TAGS: Record<string, string> = {
  'it-jobs': 'it-software', 'engineering-jobs': 'engineering', 'accounting-finance-jobs': 'finance-control', 'pr-advertising-marketing-jobs': 'marketing-communicatie',
  'hr-jobs': 'hr-recruitment', 'logistics-warehouse-jobs': 'logistiek-supply-chain', 'sales-jobs': 'sales-accountmanagement', 'consultancy-jobs': 'management-interim',
  'legal-jobs': 'juridisch-compliance', 'healthcare-nursing-jobs': 'zorg-welzijn', 'teaching-jobs': 'onderwijs-training', 'admin-jobs': 'administratie-support',
  'trade-construction-jobs': 'bouw-infra', 'manufacturing-jobs': 'techniek-onderhoud', 'maintenance-jobs': 'techniek-onderhoud', 'energy-oil-gas-jobs': 'techniek-onderhoud',
  'scientific-qa-jobs': 'hse-kwaliteit', 'creative-design-jobs': 'design-creatief', 'customer-services-jobs': 'administratie-support', 'property-jobs': 'bouw-infra',
};
const WOORDEN: [RegExp, string][] = [
  [/developer|software|devops|cloud|it[- ]|ict|security|netwerk/i, 'it-software'], [/data|analist|analytics|bi[- ]|power bi/i, 'data-analytics'],
  [/controller|finance|financ|accountant|boekhoud|fiscal/i, 'finance-control'], [/marketing|communicatie|content|seo|sea|campagne|copywriter|writer|editor/i, 'marketing-communicatie'],
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

const NL_PLAATS = /nederland|netherlands|holland|amsterdam|rotterdam|den haag|'s-gravenhage|utrecht|eindhoven|groningen|tilburg|almere|breda|nijmegen|arnhem|haarlem|zwolle|leiden|dordrecht|delft|amersfoort|den bosch|'s-hertogenbosch|maastricht|leeuwarden|enschede|apeldoorn|zoetermeer|schiedam|vlaardingen|spijkenisse|middelburg|assen|lelystad|venlo|hengelo|deventer|alkmaar|hilversum|emmen|helmond|gouda|purmerend|roosendaal|oss|zaandam|amstelveen|hoofddorp|schiphol|botlek|pernis|europoort|maasvlakte|noord-holland|zuid-holland|noord-brabant|gelderland|overijssel|limburg|friesland|drenthe|flevoland|zeeland|^remote$|thuiswerk/i;

let diag = '';
async function jooble(): Promise<Extern[]> {
  let ontvangen = 0, nl = 0; const voorbeeld: string[] = [];
  const key = process.env.JOOBLE_KEY;
  if (!key) throw new Error('JOOBLE_KEY ontbreekt');
  const hosts = process.env.JOOBLE_HOST ? [process.env.JOOBLE_HOST] : ['nl.jooble.org', 'jooble.org'];
  const out: Extern[] = [];
  let host = '';
  for (const keywords of ['freelance', 'zzp', 'interim']) {
    for (let page = 1; page <= 3; page++) {
      let j: any = null;
      for (const h of host ? [host] : hosts) {
        const r = await fetch(`https://${h}/api/${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, location: 'Nederland', page: String(page) }), signal: AbortSignal.timeout(15000) });
        if (r.ok) { j = await r.json(); host = h; break; }
        if (h === hosts[hosts.length - 1]) throw new Error(`Jooble ${r.status}`);
      }
      for (const x of j?.jobs || []) {
        const titel = strip(x.title), oms = strip(x.snippet), loc = strip(x.location);
        ontvangen++; if (voorbeeld.length < 4) voorbeeld.push(loc);
        if (!NL_PLAATS.test(loc) || /,\s?[A-Z]{2}$|\b(USA|United States|TX|Texas|Colorado)\b/.test(loc)) continue; // alleen Nederland (let op: Nederland, Texas)
        nl++;
        if (!FREELANCE.test(`${titel} ${oms} ${x.type || ''}`) || VAST.test(titel)) continue;
        out.push({ bron: 'jooble', bron_id: String(x.id), titel, omschrijving: oms, url: x.link, aanbieder: strip(x.company || x.source) || null, locatie: loc,
          vakgebied: raadVakgebied(titel), tarief_min: null, tarief_max: null, geplaatst: x.updated ? new Date(x.updated) : new Date(), werkvorm: werkvorm(`${titel} ${oms}`) });
      }
      if ((j?.jobs || []).length < 20) break;
    }
  }
  diag = `info: host ${host}, ontvangen ${ontvangen}, in NL ${nl}, freelance ${out.length}; plaatsen bv. ${voorbeeld.join(' | ')}`.slice(0, 290);
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


// ---------- Remote-bronnen zonder sleutel (bronvermelding + link naar origineel verplicht) ----------
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; HollandRecruitmentPlatform/1.0; +https://www.holland-recruitment.nl)', Accept: 'application/json' };
const EU = /worldwide|anywhere|europe|emea|netherlands|nederland|cet|gmt|global|remote/i;
const FREELANCE_EN = /\b(freelance|freelancer|contract|contractor|interim|part[- ]time contract)\b/i;

/** Remotive: max. 4 calls per dag; alleen contract/freelance; geen doorplaatsing naar Google Jobs e.d. */
async function remotive(): Promise<Extern[]> {
  const r = await fetch('https://remotive.com/api/remote-jobs?limit=500', { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Remotive ${r.status}`);
  const j: any = await r.json();
  return (j.jobs || []).filter((x: any) => ['contract', 'freelance'].includes(x.job_type) && EU.test(x.candidate_required_location || ''))
    .map((x: any): Extern => ({ bron: 'remotive', bron_id: String(x.id), titel: strip(x.title), omschrijving: strip(x.description).slice(0, 1200), url: x.url, aanbieder: x.company_name || null,
      locatie: `Remote (${strip(x.candidate_required_location || 'wereldwijd')})`.slice(0, 80), vakgebied: raadVakgebied(`${x.title} ${x.category}`), tarief_min: null, tarief_max: null, geplaatst: new Date(x.publication_date), werkvorm: 'remote' }));
}

/** Remote OK: link terug zonder nofollow en noem "Remote OK" als bron. */
async function remoteok(): Promise<Extern[]> {
  const r = await fetch('https://remoteok.com/api', { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Remote OK ${r.status}`);
  const j: any[] = await r.json();
  return j.filter(x => x && x.id && x.position).filter(x => FREELANCE_EN.test(`${x.position} ${(x.tags || []).join(' ')}`) && (!x.location || EU.test(x.location)))
    .map((x): Extern => ({ bron: 'remoteok', bron_id: String(x.id), titel: strip(x.position), omschrijving: strip(x.description).slice(0, 1200), url: x.url || `https://remoteok.com/remote-jobs/${x.slug}`, aanbieder: x.company || null,
      locatie: `Remote${x.location ? ` (${strip(x.location)})` : ''}`.slice(0, 80), vakgebied: raadVakgebied(`${x.position} ${(x.tags || []).join(' ')}`), tarief_min: null, tarief_max: null, geplaatst: new Date(x.date), werkvorm: 'remote' }));
}

/** Jobicy: remote opdrachten voor Nederland/Europa, alleen Contract/Freelance; link naar de Jobicy-URL. */
async function jobicy(): Promise<Extern[]> {
  const out: Extern[] = [];
  for (const geo of ['netherlands', 'europe']) {
    const r = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=200&geo=${geo}`, { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`Jobicy ${r.status}`);
    const j: any = await r.json();
    for (const x of j.jobs || []) {
      const types: string[] = x.jobType || [];
      if (!types.some(t => /contract|freelance/i.test(t)) && !FREELANCE_EN.test(x.jobTitle)) continue;
      out.push({ bron: 'jobicy', bron_id: String(x.id), titel: strip(x.jobTitle), omschrijving: strip(x.jobExcerpt || x.jobDescription).slice(0, 1200), url: x.url, aanbieder: x.companyName || null,
        locatie: `Remote (${strip(x.jobGeo || 'Europa')})`.slice(0, 80), vakgebied: raadVakgebied(`${x.jobTitle} ${(x.jobIndustry || []).join(' ')}`),
        tarief_min: x.salaryPeriod === 'hourly' && x.salaryCurrency === 'EUR' ? Math.round(x.salaryMin) || null : null, tarief_max: x.salaryPeriod === 'hourly' && x.salaryCurrency === 'EUR' ? Math.round(x.salaryMax) || null : null,
        geplaatst: new Date(x.pubDate), werkvorm: 'remote' });
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
    const dagen = bron === 'jobicy' ? 10 : bron === 'remotive' ? 4 : 2;
    const verlopen = await q(`update opdrachten set status = 'verlopen' where bron = $1 and status = 'live' and laatst_gecontroleerd < now() - make_interval(days => $2) returning id`, [bron, dagen]);
    await q(`update feed_runs set klaar = now(), nieuw = $2, bijgewerkt = $3, verlopen = $4, fout = $5 where id = $1`, [run!.id, nieuw, bij, verlopen.length, bron === 'jooble' && diag ? diag : null]);
  } catch (e) {
    await q(`update feed_runs set klaar = now(), fout = $2 where id = $1`, [run!.id, (e as Error).message.slice(0, 300)]);
  }
}

export async function draaiFeeds() {
  if (process.env.ADZUNA_APP_ID) await importeer('adzuna', adzuna);
  if (process.env.JOOBLE_KEY) await importeer('jooble', jooble);
  if (process.env.PARTNER_FEEDS) await importeer('feed', partners);
  await importeer('remotive', remotive);
  await importeer('remoteok', remoteok);
  await importeer('jobicy', jobicy);
  // Oude externe opdrachten na 60 dagen opruimen
  await q(`delete from opdrachten where bron <> 'direct' and status = 'verlopen' and laatst_gecontroleerd < now() - interval '60 days'`);
}
