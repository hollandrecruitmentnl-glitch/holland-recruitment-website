import 'server-only';
import { layout, SITE, verstuurVeilig } from './mail';
import { esc } from './util';

const v = (s: string) => esc(s);

export const mails = {
  bevestigEmail: (aan: string, voornaam: string, rol: string, url: string, code: string) => verstuurVeilig(rol === 'bedrijf' ? {
    aan, onderwerp: `Bevestig uw e-mailadres (code ${code})`,
    html: layout({
      u: true, preheader: `Uw code: ${code}`, titel: `Welkom, ${v(voornaam)}. Bevestig uw e-mailadres.`,
      intro: `Uw account is aangemaakt. Vul deze code in op de website, of klik op de knop:<br><span style="display:inline-block;margin-top:12px;font-size:30px;font-weight:700;letter-spacing:6px">${code}</span>`,
      blok: { kop: 'Uw account', rijen: [['Account', 'Bedrijf'], ['E-mailadres', aan]] },
      stappen: ['Bevestig uw e-mailadres met de code of de knop.', 'Vul uw bedrijfsprofiel aan, zodat freelancers weten wie u bent.', 'Zoek een freelancer of plaats een opdracht.'],
      knop: { tekst: 'Bevestig e-mailadres', url }, klein: 'De code en de link zijn 24 uur geldig. Heeft u dit account niet aangemaakt? Dan kunt u deze e-mail negeren.',
      reden: 'U ontvangt deze e-mail omdat met dit adres een account is aangemaakt bij Holland Recruitment.',
    }),
  } : {
    aan, onderwerp: `Bevestig je e-mailadres (code ${code})`,
    html: layout({
      preheader: `Je code: ${code}`, titel: `Welkom, ${v(voornaam)}. Bevestig je e-mailadres.`,
      intro: `Je account is aangemaakt. Vul deze code in op de website, of klik op de knop:<br><span style="display:inline-block;margin-top:12px;font-size:30px;font-weight:700;letter-spacing:6px">${code}</span>`,
      blok: { kop: 'Je account', rijen: [['Account', 'Freelancer'], ['E-mailadres', aan]] },
      stappen: ['Bevestig je e-mailadres met de code of de knop.', 'Vul je profiel aan met je cv en werkervaring.', 'Bekijk opdrachten en reageer in één scherm.'],
      knop: { tekst: 'Bevestig e-mailadres', url }, klein: 'De code en de link zijn 24 uur geldig. Heb jij dit account niet aangemaakt? Dan kun je deze e-mail negeren.',
      reden: 'Je ontvangt deze e-mail omdat met dit adres een account is aangemaakt bij Holland Recruitment.',
    }),
  }),

  /** `u`: de ontvanger is een bedrijf (u-vorm). */
  nieuwBericht: (aan: string, van: string, over: string, tekst: string, gesprekUrl: string, u = false) => verstuurVeilig({
    aan, onderwerp: `Nieuw bericht van ${van}`,
    html: layout(u ? {
      u, preheader: over ? `Over: ${over}` : 'U heeft een nieuw bericht.', titel: 'U heeft een nieuw bericht',
      intro: `${v(van)} stuurde u een bericht${over ? ` over ${v(over)}` : ''}.`, citaat: tekst.slice(0, 280),
      knop: { tekst: 'Lees en beantwoord', url: gesprekUrl }, klein: 'U krijgt hooguit één e-mail per gesprek per uur. Dit stelt u in bij Instellingen.',
    } : {
      preheader: over ? `Over: ${over}` : 'Je hebt een nieuw bericht.', titel: 'Je hebt een nieuw bericht',
      intro: `${v(van)} stuurde je een bericht${over ? ` over ${v(over)}` : ''}.`, citaat: tekst.slice(0, 280),
      knop: { tekst: 'Lees en beantwoord', url: gesprekUrl }, klein: 'Je krijgt hooguit één e-mail per gesprek per uur. Dit stel je in bij Instellingen.',
    }),
  }),

  nieuweReactie: (aan: string, naam: string, opdracht: string, rijen: [string, string][], termijn: string, url: string) => verstuurVeilig({
    aan, onderwerp: `Nieuwe reactie op ${opdracht}`,
    html: layout({
      u: true, preheader: `${naam} reageerde op uw opdracht.`, titel: 'Nieuwe reactie op uw opdracht', intro: `${v(naam)} reageerde op ${v(opdracht)}.`,
      blok: { kop: 'Over de reactie', rijen }, stappen: ['Bekijk het profiel, de motivatie en het cv.', `Zet ${v(naam.split(' ')[0])} op de shortlist of start een gesprek.`, `Reageer ${termijn}, zoals in uw opdracht staat.`],
      knop: { tekst: 'Bekijk reactie', url }, klein: 'U ontvangt deze e-mail omdat uw bedrijf de opdracht plaatste. Collega’s in uw team krijgen hem ook.',
    }),
  }),

  opdrachtLive: (aan: string, titel: string, tot: string, termijn: string, url: string) => verstuurVeilig({
    aan, onderwerp: 'Uw opdracht staat live',
    html: layout({
      u: true, preheader: `${titel} is nu zichtbaar voor freelancers.`, titel: 'Uw opdracht staat live',
      intro: `We hebben ${v(titel)} gecontroleerd. Freelancers kunnen hem nu vinden en erop reageren.`,
      blok: { kop: 'Uw opdracht', rijen: [['Opdracht', titel], ['Reageren kan tot', tot], ['Uw reactietermijn', termijn]] },
      stappen: ['Freelancers vinden uw opdracht bij Opdrachten zoeken.', 'Elke reactie krijgt u per e-mail en in uw overzicht.', 'Gevonden wie u zocht? Sluit de opdracht; de anderen krijgen automatisch bericht.'],
      knop: { tekst: 'Bekijk uw opdracht', url }, klein: 'Iets aanpassen? Dat kan bij Mijn opdrachten.',
    }),
  }),

  opdrachtAfgewezen: (aan: string, titel: string, reden: string, url: string) => verstuurVeilig({
    aan, onderwerp: `Uw opdracht ${titel} is niet geplaatst`,
    html: layout({
      u: true, preheader: 'We hebben uw opdracht gecontroleerd.', titel: 'Uw opdracht is niet geplaatst',
      intro: `We hebben ${v(titel)} gecontroleerd en kunnen hem zo niet plaatsen.`, blok: { kop: 'Reden', rijen: [['Toelichting', reden]] },
      stappen: ['Lees de reden hierboven.', 'Pas uw opdracht aan bij Mijn opdrachten.', 'Dien hem opnieuw in; we controleren hem dan opnieuw.'],
      knop: { tekst: 'Opdracht aanpassen', url }, klein: 'Vragen? Beantwoord deze e-mail, dan helpen we u verder.', team: 'sales',
    }),
  }),

  opdrachtVerwijderd: (aan: string, titel: string, reden: string) => verstuurVeilig({
    aan, onderwerp: `Uw opdracht ${titel} is offline gehaald`,
    html: layout({
      u: true, preheader: 'Uw opdracht is niet meer zichtbaar.', titel: 'Uw opdracht is offline gehaald',
      intro: `We hebben ${v(titel)} van het platform gehaald.`, blok: { kop: 'Reden', rijen: [['Toelichting', reden]] },
      klein: 'Bent u het hier niet mee eens? Beantwoord deze e-mail, dan kijken we er opnieuw naar.', team: 'sales',
    }),
  }),

  opdrachtIngevuld: (aan: string, titel: string, bedrijf: string) => verstuurVeilig({
    aan, onderwerp: `Update over ${titel}`,
    html: layout({
      preheader: 'Deze opdracht is ingevuld.', titel: 'Deze opdracht is ingevuld',
      intro: `Bedankt voor je reactie op ${v(titel)}. ${v(bedrijf)} heeft iemand gevonden. We wensen je veel succes met je volgende opdracht.`,
      stappen: ['Bekijk vergelijkbare opdrachten in jouw vakgebied.', 'Houd je beschikbaarheid actueel, dan vinden bedrijven jou ook.'],
      knop: { tekst: 'Bekijk opdrachten', url: `${SITE}/opdrachten` }, klein: 'Dit bericht is automatisch verstuurd toen het bedrijf de opdracht sloot.',
    }),
  }),

  wachtwoordReset: (aan: string, url: string) => verstuurVeilig({
    aan, onderwerp: 'Stel een nieuw wachtwoord in',
    html: layout({
      preheader: 'De link is één uur geldig.', titel: 'Nieuw wachtwoord instellen',
      intro: 'We kregen een verzoek om het wachtwoord van dit account te herstellen. Kies met de knop hieronder een nieuw wachtwoord.',
      knop: { tekst: 'Kies een nieuw wachtwoord', url }, klein: 'De link is één uur geldig. Niet zelf aangevraagd? Dan hoeft er niets te gebeuren; het wachtwoord blijft hetzelfde.',
      reden: 'Deze e-mail is verstuurd omdat voor dit adres een nieuw wachtwoord is aangevraagd bij Holland Recruitment.',
    }),
  }),

  /** `herinnering`: één herinnering een week na de uitnodiging, met een nieuwe link. */
  uitnodiging: (aan: string, voornaam: string, url: string, p: { functie: string; vakgebied: string; regio: string; cv: boolean }, test = false, herinnering = false) => verstuurVeilig({
    aan, onderwerp: `${test ? '[TEST] ' : ''}${herinnering ? 'Herinnering: je profiel staat nog klaar' : 'Je profiel staat klaar'} op het platform van Holland Recruitment`,
    html: layout({
      preheader: herinnering ? 'Je profiel is nog niet geactiveerd. Dat kost twee minuten.' : 'Activeer je profiel en word gevonden door bedrijven.', titel: `${v(voornaam || 'Hallo')}, je profiel staat ${herinnering ? 'nog ' : ''}klaar`,
      intro: `${herinnering ? 'Vorige week stuurden we je een uitnodiging, maar je profiel is nog niet geactiveerd. Hieronder vind je een nieuwe link. ' : ''}Je hebt je eerder bij Holland Recruitment aangemeld als freelance professional. Op ons nieuwe platform zoeken bedrijven zelf naar freelancers en nemen ze direct contact op. Op basis van je aanmelding hebben we een profiel voor je klaargezet${p.cv ? ', inclusief je cv' : ''}. Het is nog niet zichtbaar: dat bepaal jij.`,
      blok: { kop: 'Je klaargezette profiel', rijen: [['Functie', v(p.functie || '–')], ['Vakgebied', v(p.vakgebied || 'Nog kiezen')], ['Regio', v(p.regio || '–')], ['Cv', p.cv ? 'Toegevoegd (alleen zichtbaar na contact, tenzij je dat anders kiest)' : 'Nog niet toegevoegd']] },
      stappen: ['Kies een wachtwoord.', 'Controleer je profiel en kies wat zichtbaar is.', 'Activeer je profiel. Bedrijven kunnen je dan vinden en je een bericht sturen.'],
      knop: { tekst: 'Profiel activeren', url },
      klein: herinnering
        ? 'De link is 14 dagen geldig. Dit is de enige herinnering die we sturen. Wil je geen profiel op het platform? Dan hoef je niets te doen: we verwijderen het klaargezette profiel 30 dagen na de eerste uitnodiging automatisch. Je aanmelding in ons netwerk blijft gewoon bestaan.'
        : `De link is ${14} dagen geldig. Het platform is de eerste 6 maanden helemaal gratis. Wil je geen profiel op het platform? Dan hoef je niets te doen: we verwijderen het klaargezette profiel na 30 dagen automatisch. Je aanmelding in ons netwerk blijft gewoon bestaan.`,
      reden: 'Je ontvangt deze e-mail omdat je je bij Holland Recruitment hebt aangemeld als freelance professional.',
    }),
  }),

  inactiefAccount: (aan: string, voornaam: string, url: string, u = false) => verstuurVeilig(u ? {
    aan, onderwerp: 'Uw account wordt over 30 dagen verwijderd',
    html: layout({
      u, preheader: 'Log in om uw account te behouden.', titel: `${v(voornaam)}, gebruikt u uw account nog?`,
      intro: 'U heeft al 24 maanden niet ingelogd op het platform van Holland Recruitment. We bewaren gegevens niet langer dan nodig, daarom verwijderen we uw account over 30 dagen, inclusief uw berichten. Bent u de laatste in uw team, dan verdwijnen ook het bedrijfsprofiel en de opdrachten.',
      stappen: ['Wilt u uw account houden? Log dan binnen 30 dagen één keer in.', 'Doet u niets, dan verwijderen we uw account automatisch.'],
      knop: { tekst: 'Inloggen en account behouden', url },
      reden: 'U ontvangt deze e-mail omdat u een account heeft op het platform van Holland Recruitment.',
    }),
  } : {
    aan, onderwerp: 'Je account wordt over 30 dagen verwijderd',
    html: layout({
      preheader: 'Log in om je account te behouden.', titel: `${v(voornaam)}, gebruik je je account nog?`,
      intro: 'Je hebt al 24 maanden niet ingelogd op het platform van Holland Recruitment. We bewaren gegevens niet langer dan nodig, daarom verwijderen we je account over 30 dagen, inclusief je profiel, cv en berichten.',
      stappen: ['Wil je je account houden? Log dan binnen 30 dagen één keer in.', 'Doe je niets, dan verwijderen we je account automatisch.'],
      knop: { tekst: 'Inloggen en account behouden', url },
      reden: 'Je ontvangt deze e-mail omdat je een account hebt op het platform van Holland Recruitment.',
    }),
  }),

  geblokkeerd: (aan: string, reden: string, u = false) => verstuurVeilig(u ? {
    aan, onderwerp: 'Uw account is geblokkeerd',
    html: layout({
      u, preheader: 'U kunt tijdelijk niet inloggen.', titel: 'Uw account is geblokkeerd',
      intro: 'We hebben uw account op het platform van Holland Recruitment geblokkeerd. U kunt niet meer inloggen en uw opdrachten zijn niet zichtbaar.',
      blok: { kop: 'Reden', rijen: [['Toelichting', reden]] },
      stappen: ['Lees de reden hierboven.', 'Bent u het er niet mee eens? Beantwoord deze e-mail met uw toelichting.', 'We reageren binnen vijf werkdagen op uw bezwaar.'],
      klein: 'Bezwaar maken kan door deze e-mail te beantwoorden.',
    }),
  } : {
    aan, onderwerp: 'Je account is geblokkeerd',
    html: layout({
      preheader: 'Je kunt tijdelijk niet inloggen.', titel: 'Je account is geblokkeerd',
      intro: 'We hebben je account op het platform van Holland Recruitment geblokkeerd. Je kunt niet meer inloggen en je profiel of opdrachten zijn niet zichtbaar.',
      blok: { kop: 'Reden', rijen: [['Toelichting', reden]] },
      stappen: ['Lees de reden hierboven.', 'Ben je het er niet mee eens? Beantwoord deze e-mail met je toelichting.', 'We reageren binnen vijf werkdagen op je bezwaar.'],
      klein: 'Bezwaar maken kan door deze e-mail te beantwoorden.',
    }),
  }),

  meldingAfgehandeld: (aan: string) => verstuurVeilig({
    aan, onderwerp: 'Melding afgehandeld',
    html: layout({
      preheader: 'Bedankt voor de melding.', titel: 'De melding is afgehandeld',
      intro: 'Bedankt voor de melding. We hebben ernaar gekeken en de nodige stappen gezet. Om privacyredenen delen we geen details over het besluit.',
      knop: { tekst: 'Naar berichten', url: `${SITE}/mijn/berichten` },
      reden: 'Deze e-mail is verstuurd omdat er via dit account een melding is gedaan op het platform van Holland Recruitment.',
    }),
  }),

  teamUitnodiging: (aan: string, bedrijf: string, door: string, url: string) => verstuurVeilig({
    aan, onderwerp: `${door} nodigt u uit voor ${bedrijf} op Holland Recruitment`,
    html: layout({
      u: true, preheader: 'Werk samen aan opdrachten en gesprekken.', titel: `U bent uitgenodigd voor ${v(bedrijf)}`,
      intro: `${v(door)} nodigt u uit om samen met uw collega’s opdrachten, reacties en gesprekken te beheren.`,
      stappen: ['Klik op de knop en maak uw account aan.', 'U ziet direct alle opdrachten en gesprekken van uw team.'],
      knop: { tekst: 'Uitnodiging accepteren', url }, klein: 'De uitnodiging is 7 dagen geldig.', team: 'sales',
      reden: 'U ontvangt deze e-mail omdat een collega u heeft uitgenodigd.',
    }),
  }),

  bemiddelingBevestiging: (aan: string, naam: string) => verstuurVeilig({
    aan, onderwerp: 'We hebben uw aanvraag voor bemiddeling ontvangen', team: 'sales',
    html: layout({
      u: true, team: 'sales', preheader: 'Een recruiter belt u binnen één werkdag.', titel: `Bedankt${naam ? ', ' + v(naam.split(' ')[0]) : ''}`,
      intro: 'We hebben uw aanvraag voor bemiddeling ontvangen. Een recruiter van Holland Recruitment <b>belt u binnen één werkdag</b> om de opdracht, uw wensen en uw eisen door te nemen.',
      stappen: ['We bellen u voor een korte intake.', 'We selecteren en spreken passende professionals.', 'U ontvangt een beperkte selectie en kiest zelf wie u spreekt.'],
      knop: { tekst: 'Naar uw overzicht', url: `${SITE}/mijn` },
    }),
  }),

  /** `u`: bewaarde zoekopdracht van een bedrijf (freelancers zoeken). */
  bewaardeZoekopdracht: (aan: string, naam: string, aantal: number, url: string, items: string[], u = false) => verstuurVeilig({
    aan, onderwerp: `${aantal} nieuwe resultaten voor “${naam}”`,
    html: layout({
      u, preheader: `Nieuwe resultaten voor ${u ? 'uw' : 'je'} bewaarde zoekopdracht.`, titel: `Nieuw voor “${v(naam)}”`,
      intro: `Er ${aantal === 1 ? 'is 1 nieuw resultaat' : `zijn ${aantal} nieuwe resultaten`} sinds de vorige e-mail.`,
      blok: { kop: 'Nieuw', rijen: items.slice(0, 6).map((t, i) => [String(i + 1), t] as [string, string]) },
      knop: { tekst: 'Bekijk resultaten', url }, klein: u ? 'Uw bewaarde zoekopdrachten beheert u bij Instellingen.' : 'Je bewaarde zoekopdrachten beheer je bij Instellingen.',
    }),
  }),

  intern: (team: 'info' | 'sales', onderwerp: string, rijen: [string, string][], url: string) => verstuurVeilig({
    aan: team === 'sales' ? (process.env.MELDING_SALES || 'sales@holland-recruitment.nl') : (process.env.MELDING_INFO || 'info@holland-recruitment.nl'),
    onderwerp, team,
    html: layout({ team, preheader: onderwerp, titel: v(onderwerp), intro: 'Melding vanuit het platform.', blok: { kop: 'Details', rijen }, knop: { tekst: 'Open in beheer', url }, reden: 'Interne melding van het platform.' }),
  }),
};

export const mailsExtra = {
  opdrachtGewijzigd: (aan: string, titel: string, url: string) => verstuurVeilig({
    aan, onderwerp: `De opdracht ${titel} is aangepast`,
    html: layout({
      preheader: 'Bekijk wat er is veranderd.', titel: 'Een opdracht waarop je reageerde is aangepast',
      intro: `Het bedrijf heeft ${v(titel)} aangepast. Je reactie blijft gewoon staan.`,
      knop: { tekst: 'Bekijk de opdracht', url }, klein: 'Past de opdracht niet meer bij je? Laat het het bedrijf weten via een bericht.',
    }),
  }),
};
