import 'server-only';
import { q, one } from './db';
import { slugify, kort } from './util';

type Extern = { bron: 'adzuna' | 'jooble' | 'feed' | 'remotive' | 'remoteok' | 'jobicy'; bron_id: string; titel: string; omschrijving: string; url: string; aanbieder: string | null; locatie: string; vakgebied: string | null; tarief_min: number | null; tarief_max: number | null; geplaatst: Date; werkvorm: string | null; nl?: boolean };

const FREELANCE = /\b(freelance|freelancer|zzp|zzp'er|interim|zelfstandige?|opdracht|contract|inhuur|detachering)\b/i;
const VAST = /\b(vast contract|vaste baan|in loondienst|cao)\b/i;
/** V39b: Jooble levert met de bredere zoektermen ook gewone vacatures. Alleen opdrachten met een duidelijk freelance-signaal
 *  (niet alleen 'contract', 'opdracht' of 'detachering', want die staan ook in vacatures, bv. "Contract Manager"). */
const STERK_FREELANCE = /\b(freelance|freelancer|freelancers|zzp|zzper|zzp'er|interim|zelfstandige|zelfstandig (?:professional|ondernemer)|inhuur)\b/i;
/** Stages, werkstudenten en vacatures in fte zijn geen opdrachten. */
const GEEN_OPDRACHT = /\b(intern|internship|stage|stagiair|stagiaire|trainee|werkstudent|afstudeer\w*)\b|\d[.,]?\d*\s?fte\b|naar (?:een )?vaste? (?:kracht|baan|dienst)|\bvan (?:zzp|freelance\w*) naar\b|^inschrijven\b/i;
/** Wereldwijde klik- en vertaalklussen (AI-training, 'review lead') horen niet bij ons aanbod. */
const GIG_TITEL = /(english to |review lead|ai trainer|annotat|\brater\b|grabaci[oó]n|tareas cotidianas|recording (?:daily|everyday) tasks|data collection)/i;
const GIG_AANBIEDER = /(jobgether|invisible technologies|outlier|mindrift|dataannotation)/i;
/**
 * V39d (wens Can, 16-10: "STRENG ALLEEN freelance, interim, zzp, zelfstandige of inhuur"), geldt voor ALLE externe bronnen:
 * het signaal moet in de titel staan, of de tekst moet de opdracht zelf expliciet zo noemen.
 * "We werken ook met freelancers" of alleen het jobtype 'contract' is niet genoeg.
 */
const TITEL_SIGNAAL = /\b(freelance\w*|zzp\w*|interim|zelfstandige|inhuur|self[- ]employed|contractor)\b/i;
const TEKST_SIGNAAL = /\b((freelance|zzp|interim)[- ]?(opdracht|basis|functie|rol|positie|project|professional|assignment|contract)|als (zzp'?er|zzper|freelancer|zelfstandige|interim\w*)|op (zzp|freelance|interim)[- ]?basis|inhuuropdracht|freelance (role|position|project|assignment)|independent contractor|self[- ]employed)\b/i;
export const echtFreelance = (titel: string, tekst: string) => TITEL_SIGNAAL.test(titel) || TEKST_SIGNAAL.test(tekst);
/**
 * V41 (Can, 16-10: "Nederlandse projecten is voor elke source een plicht"): de opdracht moet in Nederland zijn.
 * Remote mag alleen als de bron het expliciet aan Nederland koppelt (bv. "Remote (Netherlands)"); "Remote (Europa/wereldwijd)" niet.
 */
const NIET_NL = /\b(USA|United States|TX|Texas|Colorado|Michigan|Belgi[eë]|Belgium|Vlaanderen|Deutschland|Germany|Duitsland)\b/i; // (geen ', XX'-regel: die raakt ook ', NL')
const inNederland = (loc: string) => (NL_PLAATS.test(loc) || /\bnetherlands\b|\bnederland\b/i.test(loc)) && !NIET_NL.test(loc);
/** Teksten die op een baan in loondienst wijzen (niet passend bij freelance/interim). */
const WERKNEMER = /\b(jouw nieuwe werkgever|je nieuwe werkgever|dienstverband|vast contract|vaste baan|in loondienst|cao|salaris|uitzendbureau|uitzendkracht)\b/i;
/** Remote-opdrachten die aan een ander land dan Nederland gebonden zijn. */
const ANDER_LAND = /\b(uk|united kingdom|england|ireland|italy|italia|spain|españa|germany|deutschland|france|poland|portugal|romania|greece|sweden|norway|denmark|finland|czech|austria|switzerland|usa|united states|us only|canada|brazil|mexico|latam|india|australia|apac|south africa)\b/i;
const alleenAnderLand = (...t: (string | undefined)[]) => { const s = t.filter(Boolean).join(' '); return ANDER_LAND.test(s) && !/netherlands|nederland/i.test(s); };
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

/**
 * V40 — Adzuna-proefaccount (Can, 16-10-2026): 25 verzoeken in totaal, max 2 per dag, alleen Nederland, alleen de beste opdrachten.
 * Teller staat in `instellingen` (adzuna_calls_totaal en adzuna_calls_<datum>), niet in rate_limits (die wordt na 2 dagen opgeschoond).
 * Na een betaald account: ADZUNA_PER_DAG en ADZUNA_TOTAAL in Vercel ophogen.
 */
const ADZ_PER_DAG = () => Number(process.env.ADZUNA_PER_DAG || 2);
const ADZ_TOTAAL = () => Number(process.env.ADZUNA_TOTAAL || 25);
const vandaagNL = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
export async function adzunaGebruik() {
  const r = await one<{ dag: number; totaal: number }>(`select
      coalesce((select (waarde)::text::int from instellingen where sleutel = $1), 0) as dag,
      coalesce((select (waarde)::text::int from instellingen where sleutel = 'adzuna_calls_totaal'), 0) as totaal`, [`adzuna_calls_${vandaagNL()}`]);
  const dag = r?.dag ?? 0, totaal = r?.totaal ?? 0, perDag = ADZ_PER_DAG(), max = ADZ_TOTAAL();
  return { dag, totaal, perDag, max, over: Math.max(0, Math.min(perDag - dag, max - totaal)) };
}
/** Telt een verzoek vóórdat het verstuurd wordt, zodat we nooit boven het budget uitkomen. */
async function telAdzunaVerzoek() {
  await q(`insert into instellingen (sleutel, waarde) values ($1, '1'::jsonb), ('adzuna_calls_totaal', '1'::jsonb)
    on conflict (sleutel) do update set waarde = to_jsonb((instellingen.waarde)::text::int + 1)`, [`adzuna_calls_${vandaagNL()}`]);
}

async function adzuna(): Promise<Extern[]> {
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) throw new Error('ADZUNA_APP_ID/ADZUNA_APP_KEY ontbreken');
  const out: Extern[] = [];
  let verzoeken = 0, ontvangen = 0, nl = 0;
  // V41b: alleen op de TITEL zoeken (title_only), één woord per verzoek, wisselend per dag. Met what_or zocht Adzuna in de
  // hele advertentietekst: op 16-10 gaf dat 100 resultaten waarvan 0 met freelance/zzp/interim in titel of fragment.
  const ROTATIE = [['interim', 'freelance'], ['zzp', 'interim'], ['freelance', 'zzp']];
  const dagNr = Math.floor(Date.parse(vandaagNL()) / 86400000);
  for (const woord of ROTATIE[dagNr % ROTATIE.length]) {
    const g = await adzunaGebruik();
    if (g.over <= 0) break;
    const u = new URL('https://api.adzuna.com/v1/api/jobs/nl/search/1');
    u.search = new URLSearchParams({ app_id: id, app_key: key, results_per_page: '50', title_only: woord,
      what_exclude: 'stage stagiair stagiaire werkstudent trainee', max_days_old: '7', sort_by: 'date', 'content-type': 'application/json' }).toString();
    await telAdzunaVerzoek(); verzoeken++;
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`Adzuna ${r.status}`);
    const j: any = await r.json();
    for (const x of j.results || []) {
      ontvangen++;
      const titel = strip(x.title), oms = strip(x.description);
      const loc = [x.location?.display_name, ...(x.location?.area || [])].filter(Boolean).join(' ');
      if (!NL_PLAATS.test(loc) && !/\bnl\b/i.test(loc)) continue; // alleen Nederland
      nl++;
      if (VAST.test(titel) || WERKNEMER.test(`${titel} ${oms}`)) continue;
      const uurloon = (n: number | undefined) => (n && !x.salary_is_predicted && n < 400 ? Math.round(n) : null); // alleen echte uurtarieven tonen
      out.push({ bron: 'adzuna', nl: /nederland|netherlands/i.test(String(x.location?.area?.[0] || '')), bron_id: String(x.id), titel, omschrijving: oms, url: x.redirect_url, aanbieder: x.company?.display_name || null, locatie: x.location?.display_name || '',
        vakgebied: TAGS[x.category?.tag] || raadVakgebied(titel), tarief_min: uurloon(x.salary_min), tarief_max: uurloon(x.salary_max), geplaatst: new Date(x.created), werkvorm: werkvorm(`${titel} ${oms}`) });
    }
  }
  const g = await adzunaGebruik();
  const uniek = out.filter(x => echtFreelance(x.titel, x.omschrijving)).length;
  diag = `info: titel bevat ${ROTATIE[dagNr % ROTATIE.length].join(' / ')}; ${verzoeken} verzoek(en), ontvangen ${ontvangen}, in NL ${nl}, freelance ${uniek}; proefbudget ${g.totaal} van ${g.max} gebruikt (vandaag ${g.dag} van ${g.perDag})`;
  return out;
}

const NL_PLAATS = /nederland|netherlands|holland|amsterdam|rotterdam|den haag|'s-gravenhage|utrecht|eindhoven|groningen|tilburg|almere|breda|nijmegen|arnhem|haarlem|zwolle|leiden|dordrecht|delft|amersfoort|den bosch|'s-hertogenbosch|maastricht|leeuwarden|enschede|apeldoorn|zoetermeer|schiedam|vlaardingen|spijkenisse|middelburg|assen|lelystad|venlo|hengelo|deventer|alkmaar|hilversum|emmen|helmond|gouda|purmerend|roosendaal|oss|zaandam|amstelveen|hoofddorp|schiphol|botlek|pernis|europoort|maasvlakte|noord-holland|zuid-holland|noord-brabant|gelderland|overijssel|limburg|friesland|drenthe|flevoland|zeeland|^remote$|thuiswerk/i;

let diag = '';
/**
 * V39: met alleen 'freelance', 'zzp' en 'interim' gaf Jooble elke dag dezelfde ~35 opdrachten (16-10: 0 nieuw).
 * Daarom ook gerichte zoektermen per vakgebied. Elke zoekterm max. 3 pagina's; de filters (Nederland, freelance, geen loondienst) blijven gelijk.
 */
const JOOBLE_ZOEK = ['freelance', 'zzp', 'interim', 'zzp opdracht', 'freelance opdracht', 'interim manager', 'freelance developer', 'zzp ict', 'freelance consultant',
  'interim controller', 'zzp finance', 'freelance projectmanager', 'interim hr', 'freelance marketing', 'freelance engineer', 'zzp monteur', 'zzp verpleegkundige',
  'zzp begeleider', 'zzp docent', 'zzp chauffeur', 'interim inkoper', 'freelance data'];

async function jooble(): Promise<Extern[]> {
  let ontvangen = 0, nl = 0, mislukt = 0, verzoeken = 0; const voorbeeld: string[] = [];
  const key = process.env.JOOBLE_KEY;
  if (!key) throw new Error('JOOBLE_KEY ontbreekt');
  const hosts = process.env.JOOBLE_HOST ? [process.env.JOOBLE_HOST] : ['nl.jooble.org', 'jooble.org'];
  const out: Extern[] = [];
  const vraag = (h: string, keywords: string, page: number) => { verzoeken++; return fetch(`https://${h}/api/${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, location: 'Nederland', page: String(page) }), signal: AbortSignal.timeout(15000) }); };
  const verwerk = (j: any) => {
    const jobs = j?.jobs || [];
    for (const x of jobs) {
      const titel = strip(x.title), oms = strip(x.snippet), loc = strip(x.location);
      ontvangen++; if (voorbeeld.length < 4) voorbeeld.push(loc);
      if (!NL_PLAATS.test(loc) || /,\s?[A-Z]{2}$|\b(USA|United States|TX|Texas|Colorado)\b/.test(loc)) continue; // alleen Nederland (let op: Nederland, Texas)
      nl++;
      if (!STERK_FREELANCE.test(`${titel} ${oms} ${x.type || ''}`) || VAST.test(titel) || WERKNEMER.test(`${titel} ${oms}`) || GEEN_OPDRACHT.test(titel)
        || GIG_TITEL.test(titel) || GIG_AANBIEDER.test(String(x.company || x.source || ''))) continue;
      out.push({ bron: 'jooble', bron_id: String(x.id), titel, omschrijving: oms, url: x.link, aanbieder: strip(x.company || x.source) || null, locatie: loc,
        vakgebied: raadVakgebied(titel), tarief_min: null, tarief_max: null, geplaatst: x.updated ? new Date(x.updated) : new Date(), werkvorm: werkvorm(`${titel} ${oms}`) });
    }
    return jobs.length;
  };
  // 1. Host bepalen met de eerste zoekterm (faalt die op alle hosts, dan is de bron echt stuk → fout in de bewaking)
  let host = '', eerste: any = null;
  for (const h of hosts) {
    const r = await vraag(h, JOOBLE_ZOEK[0], 1);
    if (r.ok) { host = h; eerste = await r.json(); break; }
    if (h === hosts[hosts.length - 1]) throw new Error(`Jooble ${r.status}`);
  }
  const zoek = async (keywords: string, startJ?: any) => {
    for (let page = 1; page <= 3; page++) {
      let j = page === 1 && startJ ? startJ : null;
      if (!j) {
        try { const r = await vraag(host, keywords, page); if (!r.ok) { mislukt++; return; } j = await r.json(); }
        catch { mislukt++; return; }
      }
      if (verwerk(j) < 20) return;
    }
  };
  await zoek(JOOBLE_ZOEK[0], eerste);
  // 2. Overige zoektermen in groepjes van 4 tegelijk (houdt de nachtelijke run kort)
  const rest = JOOBLE_ZOEK.slice(1);
  for (let i = 0; i < rest.length; i += 4) await Promise.all(rest.slice(i, i + 4).map(k => zoek(k)));
  const uniek = new Set(out.map(x => x.bron_id)).size;
  diag = `info: host ${host}, ${JOOBLE_ZOEK.length} zoektermen, ${verzoeken} verzoeken${mislukt ? ` (${mislukt} mislukt)` : ''}, ontvangen ${ontvangen}, in NL ${nl}, freelance ${uniek}; plaatsen bv. ${voorbeeld.join(' | ')}`.slice(0, 290);
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
const EU = /worldwide|anywhere|europe|emea|netherlands|nederland|\bcet\b|global/i;
const FREELANCE_EN = /\b(freelance|freelancer|contract|contractor|interim|part[- ]time contract)\b/i;

/** Remotive: max. 4 calls per dag; alleen contract/freelance; geen doorplaatsing naar Google Jobs e.d. */
async function remotive(): Promise<Extern[]> {
  const r = await fetch('https://remotive.com/api/remote-jobs?limit=500', { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Remotive ${r.status}`);
  const j: any = await r.json();
  return (j.jobs || []).filter((x: any) => ['contract', 'freelance'].includes(x.job_type) && EU.test(x.candidate_required_location || '') && !alleenAnderLand(x.candidate_required_location, x.title))
    .map((x: any): Extern => ({ bron: 'remotive', bron_id: String(x.id), titel: strip(x.title), omschrijving: strip(x.description).slice(0, 1200), url: x.url, aanbieder: x.company_name || null,
      locatie: `Remote (${strip(x.candidate_required_location || 'wereldwijd')})`.slice(0, 80), vakgebied: raadVakgebied(`${x.title} ${x.category}`), tarief_min: null, tarief_max: null, geplaatst: new Date(x.publication_date), werkvorm: 'remote' }));
}

/** Remote OK: link terug zonder nofollow en noem "Remote OK" als bron. */
async function remoteok(): Promise<Extern[]> {
  const r = await fetch('https://remoteok.com/api', { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Remote OK ${r.status}`);
  const j: any[] = await r.json();
  return j.filter(x => x && x.id && x.position).filter(x => FREELANCE_EN.test(`${x.position} ${(x.tags || []).join(' ')}`) && (!x.location || EU.test(x.location)) && !alleenAnderLand(x.location, x.position))
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
      if (alleenAnderLand(x.jobGeo, x.jobTitle)) continue; // bv. 'Remote (UK)' of '(Remote in Italy)'
      out.push({ bron: 'jobicy', bron_id: String(x.id), titel: strip(x.jobTitle), omschrijving: strip(x.jobExcerpt || x.jobDescription).slice(0, 1200), url: x.url, aanbieder: x.companyName || null,
        locatie: `Remote (${strip(x.jobGeo || 'Europa')})`.slice(0, 80), vakgebied: raadVakgebied(`${x.jobTitle} ${(x.jobIndustry || []).join(' ')}`),
        tarief_min: x.salaryPeriod === 'hourly' && x.salaryCurrency === 'EUR' ? Math.round(x.salaryMin) || null : null, tarief_max: x.salaryPeriod === 'hourly' && x.salaryCurrency === 'EUR' ? Math.round(x.salaryMax) || null : null,
        geplaatst: new Date(x.pubDate), werkvorm: 'remote' });
    }
  }
  return out;
}

async function importeer(bron: string, ophalen: () => Promise<Extern[]>) {
  diag = '';
  const run = await one<{ id: number; gestart: string }>(`insert into feed_runs (bron) values ($1) returning id, gestart`, [bron]);
  try {
    const items = await ophalen();
    let nieuw = 0, bij = 0;
    const gezien = new Set<string>();
    for (const x of items) {
      if (gezien.has(x.bron_id) || !/^https?:\/\//.test(x.url)) continue; gezien.add(x.bron_id);
      if (!echtFreelance(x.titel, x.omschrijving)) continue; // V39d: streng, voor alle bronnen
      if (!(x.nl || inNederland(x.locatie)) || NIET_NL.test(x.locatie)) continue; // V41: alleen opdrachten in Nederland, voor alle bronnen
      if (['remotive', 'remoteok', 'jobicy'].includes(x.bron) && !/\b(netherlands|nederland)\b/i.test(x.locatie)) continue; // remote: alleen als expliciet Nederland
      if (GIG_TITEL.test(x.titel) || GIG_AANBIEDER.test(x.aanbieder || '') || GEEN_OPDRACHT.test(x.titel)) continue; // ook voor de remote-bronnen
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
    const dagen = bron === 'jobicy' || bron === 'adzuna' ? 10 : bron === 'remotive' ? 4 : 2; // adzuna: we halen alleen de nieuwste op
    const verlopen = await q(`update opdrachten set status = 'verlopen' where bron = $1 and status = 'live' and laatst_gecontroleerd < now() - make_interval(days => $2) returning id`, [bron, dagen]);
    await q(`update feed_runs set klaar = now(), nieuw = $2, bijgewerkt = $3, verlopen = $4, fout = $5 where id = $1`, [run!.id, nieuw, bij, verlopen.length, diag || null]);
  } catch (e) {
    await q(`update feed_runs set klaar = now(), fout = $2 where id = $1`, [run!.id, (e as Error).message.slice(0, 300)]);
  }
}

export async function draaiFeeds() {
  // Adzuna alleen als er nog proefbudget is (anders geen run, dus ook geen valse melding "niet gedraaid")
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY && (await adzunaGebruik()).over > 0) await importeer('adzuna', adzuna);
  if (process.env.JOOBLE_KEY) await importeer('jooble', jooble);
  if (process.env.PARTNER_FEEDS) await importeer('feed', partners);
  await importeer('remotive', remotive);
  await importeer('remoteok', remoteok);
  await importeer('jobicy', jobicy);
  // Oude externe opdrachten na 60 dagen opruimen
  await q(`delete from opdrachten where bron <> 'direct' and status = 'verlopen' and laatst_gecontroleerd < now() - interval '60 days'`);
}
