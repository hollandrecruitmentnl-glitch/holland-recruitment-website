export const VAKGEBIEDEN: { slug: string; naam: string }[] = [
  ['it-software','IT en software'],['techniek-onderhoud','Techniek en onderhoud'],['engineering','Engineering'],
  ['marketing-communicatie','Marketing en communicatie'],['finance-control','Finance en control'],['projectmanagement','Projectmanagement'],
  ['data-analytics','Data en analytics'],['hr-recruitment','HR en recruitment'],['logistiek-supply-chain','Logistiek en supply chain'],
  ['bouw-infra','Bouw en infra'],['sales-accountmanagement','Sales en accountmanagement'],['hse-kwaliteit','HSE en kwaliteit'],
  ['juridisch-compliance','Juridisch en compliance'],['inkoop','Inkoop'],['design-creatief','Design en creatief'],
  ['zorg-welzijn','Zorg en welzijn'],['onderwijs-training','Onderwijs en training'],['overheid-beleid','Overheid en beleid'],
  ['management-interim','Management en interim'],['administratie-support','Administratie en support'],
].map(([slug, naam]) => ({ slug, naam }));
export const vakgebiedNaam = (slug?: string | null) => VAKGEBIEDEN.find(v => v.slug === slug)?.naam ?? '';
/** Naam midden in een zin: kleine letters, maar afkortingen (IT, HR, HSE) blijven hoofdletters. */
export const vakKlein = (naam: string) => naam.split(' ').map(w => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');

// Regio's voor zoeken en SEO-landingspagina's (provinciehoofdsteden + grote steden + provincies)
export const REGIOS: { slug: string; naam: string }[] = [
  'Rotterdam','Amsterdam','Den Haag','Utrecht','Eindhoven','Groningen','Tilburg','Almere','Breda','Nijmegen',
  'Arnhem','Haarlem','Zwolle','Leiden','Dordrecht','Delft','Amersfoort','Den Bosch','Maastricht','Leeuwarden',
  'Enschede','Apeldoorn','Zoetermeer','Schiedam','Vlaardingen','Spijkenisse','Middelburg','Assen','Lelystad','Venlo',
].map(naam => ({ naam, slug: naam.toLowerCase().replace(/\s+/g, '-') }));
export const regioNaam = (slug?: string | null) => REGIOS.find(r => r.slug === slug)?.naam ?? '';

export const WERKVORMEN = [
  { v: 'op_locatie', l: 'Op locatie' }, { v: 'hybride', l: 'Hybride' }, { v: 'remote', l: 'Remote' },
] as const;
export const werkvormNaam = (v?: string | null) => WERKVORMEN.find(w => w.v === v)?.l ?? '';

export const BESCHIKBAARHEID: Record<string, string> = {
  nu: 'Beschikbaar', vanaf: 'Beschikbaar vanaf', periode: 'Beschikbaar in periode', niet: 'Niet beschikbaar',
};
export const ZICHTBAARHEID = [
  { v: 'publiek', l: 'Publiek' }, { v: 'na_contact', l: 'Na contact' }, { v: 'verborgen', l: 'Verborgen' },
] as const;
export const GESPREK_LABELS: Record<string, string> = {
  geen: 'Geen status', in_gesprek: 'In gesprek', kennismaking: 'Kennismaking gepland',
  samenwerken: 'We gaan samenwerken', geen_match: 'Geen match',
};
export const REACTIE_STATUS: Record<string, string> = {
  verstuurd: 'Verstuurd', gelezen: 'Gelezen', in_gesprek: 'In gesprek',
  samenwerking: 'Samenwerking gestart', geen_match: 'Geen match', opdracht_gesloten: 'Opdracht gesloten',
};
export const OPDRACHT_STATUS: Record<string, string> = {
  concept: 'Concept', in_controle: 'In controle', live: 'Live', gesloten: 'Gesloten',
  afgewezen: 'Afgewezen', verwijderd: 'Verwijderd', verlopen: 'Verlopen',
};
export const REACTIETERMIJN: Record<string, string> = {
  '2_werkdagen': 'binnen 2 werkdagen', '5_werkdagen': 'binnen 5 werkdagen', '2_weken': 'binnen 2 weken',
};
export const PERSPECTIEF: Record<string, string> = {
  verlenging: 'Verlenging mogelijk', vervolg: 'Vervolgopdrachten', langdurig: 'Langdurige samenwerking', vast: 'Overname in vaste dienst bespreekbaar',
};
export const BEMIDDELING_STATUS: Record<string, string> = {
  nieuw: 'Nieuw', gebeld: 'Gebeld', voorgesteld: 'Kandidaten voorgesteld', geplaatst: 'Geplaatst', gestopt: 'Gestopt',
};
export const BRON_NAAM: Record<string, string> = {
  direct: 'Direct geplaatst', adzuna: 'Adzuna', jooble: 'Jooble', careerjet: 'Careerjet', feed: 'Partnerfeed', remotive: 'Remotive', remoteok: 'Remote OK', jobicy: 'Jobicy',
};
export const GRATIS_MAILDIENSTEN = ['gmail.com','googlemail.com','hotmail.com','hotmail.nl','outlook.com','outlook.nl','live.nl','live.com','yahoo.com','yahoo.nl','icloud.com','me.com','ziggo.nl','kpnmail.nl','planet.nl','home.nl','msn.com','aol.com','proton.me','protonmail.com','gmx.com','gmx.net'];
export const BRANCHES = ['Petrochemie en industrie','Energie','Haven en logistiek','IT en software','Financiële dienstverlening','Zakelijke dienstverlening','Bouw en infra','Overheid','Zorg','Onderwijs','Handel en retail','Productie','Food','Overig'];
export const GROOTTES = ['1–10','11–50','51–200','201–500','501–1000','1000+'];

export const BRON_SITE: Record<string, string> = { adzuna: 'https://www.adzuna.nl', jooble: 'https://nl.jooble.org', careerjet: 'https://www.careerjet.nl', remotive: 'https://remotive.com', remoteok: 'https://remoteok.com', jobicy: 'https://jobicy.com' };

/** V37: de logostrook 'Bedrijven op ons platform' verschijnt pas vanaf dit aantal bedrijven (minder oogt leeg). */
export const LOGO_STROOK_MIN = 10;
/** V37: organisaties waarmee Holland Recruitment eerder heeft samengewerkt (opgave Can, 16-10-2026). Namen als tekst tot er toestemming is voor hun logo. */
export const EERDERE_SAMENWERKINGEN = ['Albeda', 'Zadkine'];
