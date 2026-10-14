/**
 * Navigatie per rol.
 * - Uitgelogd: beide doelgroepen (publieke site; NN/g raadt doelgroepmenu's af zolang de rol onbekend is).
 * - Ingelogd als bedrijf of freelancer: alleen wat bij die rol hoort.
 */
export type Link = [href: string, label: string];

/** Bemiddeling is altijd direct bereikbaar (eigen menu-item); registratie via de knop "Gratis account". */
export const BEMIDDELING_URL = '/professional-aanvragen';
export const REG_BEDRIJF = '/registreren?rol=bedrijf&terug=%2Fmijn%2Fopdrachten%2Fnieuw';
export const REG_FREELANCER = '/registreren?rol=freelancer';

export const PUBLIEK_BEDRIJVEN: Link[] = [
  ['/freelancers-zoeken', 'Freelancers zoeken'], [REG_BEDRIJF, 'Gratis opdracht plaatsen'], [BEMIDDELING_URL, 'Laat ons zoeken (bemiddeling)'],
  ['/freelancer-inhuren', 'Freelancer inhuren'], ['/interim-professional-inhuren', 'Interim professional inhuren'], ['/expertises', 'Expertises'],
  ['/werkwijze', 'Onze werkwijze'], ['/voor-bedrijven', 'Alles voor bedrijven'],
];
export const PUBLIEK_FREELANCERS: Link[] = [
  ['/opdrachten', 'Opdrachten zoeken'], [REG_FREELANCER, 'Gratis profiel maken'], ['/bedrijven', 'Bedrijven'],
  ['/freelancers/hoe-werkt-het', 'Hoe werkt het?'], ['/freelancers/veelgestelde-vragen', 'Veelgestelde vragen'], ['/freelancers', 'Alles voor freelancers'],
];
export const EXPERTISES: Link[] = [
  ['/expertises', 'Alle expertises'], ['/expertises/sales-business-development', 'Sales & Business Development'], ['/expertises/marketing-digital', 'Marketing & Digital'],
  ['/expertises/it-data', 'IT & Data'], ['/expertises/finance', 'Finance'], ['/expertises/engineering-technical', 'Engineering & Technical'],
  ['/expertises/petrochemie-industrie', 'Petrochemie & Industrie'], ['/expertises/operations-projectmanagement', 'Operations & Project Management'],
  ['/expertises/zorg-welzijn', 'Zorg & Welzijn'], ['/expertises/onderwijs', 'Onderwijs'], ['/expertises/transport-logistiek', 'Transport & Logistiek'],
];

/** Hoofdmenu (desktop) voor ingelogde gebruikers. */
export const HOOFD: Record<'bedrijf' | 'freelancer', Link[]> = {
  bedrijf: [['/mijn', 'Overzicht'], ['/freelancers-zoeken', 'Freelancers zoeken'], ['/mijn/opdrachten', 'Mijn opdrachten'], ['/bemiddeling', 'Bemiddeling']],
  freelancer: [['/mijn', 'Overzicht'], ['/opdrachten', 'Opdrachten'], ['/bedrijven', 'Bedrijven'], ['/mijn/reacties', 'Mijn reacties'], ['/mijn/profiel', 'Mijn profiel']],
};

/** Volledige lijst voor het mobiele menu en het accountmenu. */
export const OMGEVING: Record<'bedrijf' | 'freelancer', Link[]> = {
  bedrijf: [
    ['/mijn', 'Overzicht'], ['/freelancers-zoeken', 'Freelancers zoeken'], ['/mijn/opdrachten', 'Mijn opdrachten'], ['/mijn/opdrachten/nieuw', 'Opdracht plaatsen'],
    ['/mijn/berichten', 'Berichten'], ['/mijn/bedrijf', 'Bedrijfsprofiel'], ['/mijn/instellingen', 'Instellingen'],
  ],
  freelancer: [
    ['/mijn', 'Overzicht'], ['/opdrachten', 'Opdrachten zoeken'], ['/bedrijven', 'Bedrijven'], ['/mijn/reacties', 'Mijn reacties'],
    ['/mijn/berichten', 'Berichten'], ['/mijn/profiel', 'Mijn profiel'], ['/mijn/instellingen', 'Instellingen'],
  ],
};

/** Hulp en uitleg die bij de rol past. */
export const HULP: Record<'bedrijf' | 'freelancer', Link[]> = {
  bedrijf: [['/bemiddeling', 'Laat ons bemiddelen'], ['/werkwijze', 'Onze werkwijze'], ['/expertises', 'Expertises'], ['/kennisbank', 'Kennisbank'], ['/contact', 'Contact']],
  freelancer: [['/freelancers/hoe-werkt-het', 'Hoe werkt het?'], ['/freelancers/veelgestelde-vragen', 'Veelgestelde vragen'], ['/kennisbank', 'Kennisbank'], ['/contact', 'Contact']],
};

export const isRol = (r?: string | null): r is 'bedrijf' | 'freelancer' => r === 'bedrijf' || r === 'freelancer';

/** Regio's in de footer (zoals op de website). */
export const REGIO_FOOTER: Link[] = [['/freelancer-inhuren/rotterdam', 'Rotterdam'], ['/freelancer-inhuren/amsterdam', 'Amsterdam'], ['/freelancer-inhuren/utrecht', 'Utrecht'],
  ['/freelancer-inhuren/den-haag', 'Den Haag'], ['/freelancer-inhuren/eindhoven', 'Eindhoven'], ['/freelancer-inhuren/breda', 'Breda'], ['/freelancer-inhuren/tilburg', 'Tilburg'],
  ['/freelancer-inhuren/arnhem', 'Arnhem'], ['/freelancer-inhuren/groningen', 'Groningen']];
