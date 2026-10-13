/**
 * Navigatie per rol.
 * - Uitgelogd: beide doelgroepen (publieke site; NN/g raadt doelgroepmenu's af zolang de rol onbekend is).
 * - Ingelogd als bedrijf of freelancer: alleen wat bij die rol hoort.
 */
export type Link = [href: string, label: string];

export const PUBLIEK_BEDRIJVEN: Link[] = [
  ['/freelancers-zoeken', 'Freelancers zoeken'], ['/voor-bedrijven', 'Overzicht voor bedrijven'], ['/freelancer-inhuren', 'Freelancer inhuren'],
  ['/interim-professional-inhuren', 'Interim professional inhuren'], ['/bemiddeling', 'Laat ons bemiddelen'], ['/werkwijze', 'Onze werkwijze'],
];
export const PUBLIEK_FREELANCERS: Link[] = [
  ['/opdrachten', 'Freelance opdrachten'], ['/bedrijven', 'Bedrijven'], ['/registreren?rol=freelancer', 'Profiel aanmaken'],
  ['/freelancers/hoe-werkt-het', 'Hoe werkt het?'], ['/freelancers/veelgestelde-vragen', 'Veelgestelde vragen'],
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
