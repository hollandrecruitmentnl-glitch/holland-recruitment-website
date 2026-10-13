import 'server-only';
import { layout, SITE, verstuurVeilig } from './mail';
import { esc } from './util';

const v = (s: string) => esc(s);

export const mails = {
  bevestigEmail: (aan: string, voornaam: string, rol: string, url: string) => verstuurVeilig({
    aan, onderwerp: 'Bevestig je e-mailadres',
    html: layout({
      preheader: 'Eén klik en je account is compleet.', titel: `Welkom, ${v(voornaam)}. Bevestig je e-mailadres.`,
      intro: 'Je account is aangemaakt. Bevestig je e-mailadres, dan kun je ook berichten sturen.',
      blok: { kop: 'Je account', rijen: [['Account', rol === 'bedrijf' ? 'Bedrijf' : 'Freelancer'], ['E-mailadres', aan]] },
      stappen: rol === 'bedrijf'
        ? ['Bevestig je e-mailadres met de knop hieronder.', 'Vul je bedrijfsprofiel aan, zodat freelancers weten wie je bent.', 'Zoek een freelancer of plaats een opdracht.']
        : ['Bevestig je e-mailadres met de knop hieronder.', 'Vul je profiel aan met je cv en werkervaring.', 'Bekijk opdrachten en reageer in één scherm.'],
      knop: { tekst: 'Bevestig e-mailadres', url }, klein: 'De link is 24 uur geldig. Heb jij dit account niet aangemaakt? Dan kun je deze e-mail negeren.',
      reden: 'Je ontvangt deze e-mail omdat met dit adres een account is aangemaakt bij Holland Recruitment.',
    }),
  }),

  nieuwBericht: (aan: string, van: string, over: string, tekst: string, gesprekUrl: string) => verstuurVeilig({
    aan, onderwerp: `Nieuw bericht van ${van}`,
    html: layout({
      preheader: over ? `Over: ${over}` : 'Je hebt een nieuw bericht.', titel: 'Je hebt een nieuw bericht',
      intro: `${v(van)} stuurde je een bericht${over ? ` over ${v(over)}` : ''}.`, citaat: tekst.slice(0, 280),
      knop: { tekst: 'Lees en beantwoord', url: gesprekUrl }, klein: 'Je krijgt hooguit één e-mail per gesprek per uur. Dit stel je in bij Instellingen.',
    }),
  }),

  nieuweReactie: (aan: string, naam: string, opdracht: string, rijen: [string, string][], termijn: string, url: string) => verstuurVeilig({
    aan, onderwerp: `Nieuwe reactie op ${opdracht}`,
    html: layout({
      preheader: `${naam} reageerde op je opdracht.`, titel: 'Nieuwe reactie op je opdracht', intro: `${v(naam)} reageerde op ${v(opdracht)}.`,
      blok: { kop: 'Over de reactie', rijen }, stappen: ['Bekijk het profiel, de motivatie en het cv.', `Zet ${v(naam.split(' ')[0])} op de shortlist of start een gesprek.`, `Reageer ${termijn}, zoals in je opdracht staat.`],
      knop: { tekst: 'Bekijk reactie', url }, klein: 'Je ontvangt deze e-mail omdat je bedrijf de opdracht plaatste. Collega’s in je team krijgen hem ook.',
    }),
  }),

  opdrachtLive: (aan: string, titel: string, tot: string, termijn: string, url: string) => verstuurVeilig({
    aan, onderwerp: 'Je opdracht staat live',
    html: layout({
      preheader: `${titel} is nu zichtbaar voor freelancers.`, titel: 'Je opdracht staat live',
      intro: `We hebben ${v(titel)} gecontroleerd. Freelancers kunnen hem nu vinden en erop reageren.`,
      blok: { kop: 'Je opdracht', rijen: [['Opdracht', titel], ['Reageren kan tot', tot], ['Jouw reactietermijn', termijn]] },
      stappen: ['Freelancers vinden je opdracht bij Opdrachten zoeken.', 'Elke reactie krijg je per e-mail en in je overzicht.', 'Gevonden wie je zocht? Sluit de opdracht; de anderen krijgen automatisch bericht.'],
      knop: { tekst: 'Bekijk je opdracht', url }, klein: 'Iets aanpassen? Dat kan bij Mijn opdrachten.',
    }),
  }),

  opdrachtAfgewezen: (aan: string, titel: string, reden: string, url: string) => verstuurVeilig({
    aan, onderwerp: `Je opdracht ${titel} is niet geplaatst`,
    html: layout({
      preheader: 'We hebben je opdracht gecontroleerd.', titel: 'Je opdracht is niet geplaatst',
      intro: `We hebben ${v(titel)} gecontroleerd en kunnen hem zo niet plaatsen.`, blok: { kop: 'Reden', rijen: [['Toelichting', reden]] },
      stappen: ['Lees de reden hierboven.', 'Pas je opdracht aan bij Mijn opdrachten.', 'Dien hem opnieuw in; we controleren hem dan opnieuw.'],
      knop: { tekst: 'Opdracht aanpassen', url }, klein: 'Vragen? Beantwoord deze e-mail, dan helpen we je verder.', team: 'sales',
    }),
  }),

  opdrachtVerwijderd: (aan: string, titel: string, reden: string) => verstuurVeilig({
    aan, onderwerp: `Je opdracht ${titel} is offline gehaald`,
    html: layout({
      preheader: 'Je opdracht is niet meer zichtbaar.', titel: 'Je opdracht is offline gehaald',
      intro: `We hebben ${v(titel)} van het platform gehaald.`, blok: { kop: 'Reden', rijen: [['Toelichting', reden]] },
      klein: 'Ben je het hier niet mee eens? Beantwoord deze e-mail, dan kijken we er opnieuw naar.', team: 'sales',
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
      intro: 'We kregen een verzoek om het wachtwoord van je account te herstellen. Kies met de knop hieronder een nieuw wachtwoord.',
      knop: { tekst: 'Kies een nieuw wachtwoord', url }, klein: 'De link is één uur geldig. Heb jij dit niet aangevraagd? Dan hoef je niets te doen; je wachtwoord blijft hetzelfde.',
    }),
  }),

  inactiefAccount: (aan: string, voornaam: string, url: string) => verstuurVeilig({
    aan, onderwerp: 'Je account wordt over 30 dagen verwijderd',
    html: layout({
      preheader: 'Log in om je account te behouden.', titel: `${v(voornaam)}, gebruik je je account nog?`,
      intro: 'Je hebt al 24 maanden niet ingelogd op het platform van Holland Recruitment. We bewaren gegevens niet langer dan nodig, daarom verwijderen we je account over 30 dagen, inclusief je profiel, cv en berichten.',
      stappen: ['Wil je je account houden? Log dan binnen 30 dagen één keer in.', 'Doe je niets, dan verwijderen we je account automatisch.'],
      knop: { tekst: 'Inloggen en account behouden', url },
      reden: 'Je ontvangt deze e-mail omdat je een account hebt op het platform van Holland Recruitment.',
    }),
  }),

  geblokkeerd: (aan: string, reden: string) => verstuurVeilig({
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
    aan, onderwerp: 'Je melding is afgehandeld',
    html: layout({
      preheader: 'Bedankt voor je melding.', titel: 'Je melding is afgehandeld',
      intro: 'Bedankt dat je ons iets hebt gemeld. We hebben ernaar gekeken en de nodige stappen gezet. Om privacyredenen delen we geen details over het besluit.',
      knop: { tekst: 'Naar je berichten', url: `${SITE}/mijn/berichten` },
    }),
  }),

  teamUitnodiging: (aan: string, bedrijf: string, door: string, url: string) => verstuurVeilig({
    aan, onderwerp: `${door} nodigt je uit voor ${bedrijf} op Holland Recruitment`,
    html: layout({
      preheader: 'Werk samen aan opdrachten en gesprekken.', titel: `Je bent uitgenodigd voor ${v(bedrijf)}`,
      intro: `${v(door)} nodigt je uit om samen met je collega’s opdrachten, reacties en gesprekken te beheren.`,
      stappen: ['Klik op de knop en maak je account aan.', 'Je ziet direct alle opdrachten en gesprekken van je team.'],
      knop: { tekst: 'Uitnodiging accepteren', url }, klein: 'De uitnodiging is 7 dagen geldig.', team: 'sales',
      reden: 'Je ontvangt deze e-mail omdat een collega je heeft uitgenodigd.',
    }),
  }),

  bemiddelingBevestiging: (aan: string, naam: string) => verstuurVeilig({
    aan, onderwerp: 'We hebben je aanvraag voor bemiddeling ontvangen', team: 'sales',
    html: layout({
      team: 'sales', preheader: 'Een recruiter belt je binnen één werkdag.', titel: `Bedankt${naam ? ', ' + v(naam.split(' ')[0]) : ''}`,
      intro: 'We hebben je aanvraag voor bemiddeling ontvangen. Een recruiter van Holland Recruitment <b>belt je binnen één werkdag</b> om de opdracht, je wensen en je eisen door te nemen.',
      stappen: ['We bellen je voor een korte intake.', 'We selecteren en spreken passende professionals.', 'Je ontvangt een beperkte selectie en kiest zelf wie je spreekt.'],
      knop: { tekst: 'Naar je overzicht', url: `${SITE}/mijn` },
    }),
  }),

  bewaardeZoekopdracht: (aan: string, naam: string, aantal: number, url: string, items: string[]) => verstuurVeilig({
    aan, onderwerp: `${aantal} nieuwe resultaten voor “${naam}”`,
    html: layout({
      preheader: 'Nieuwe resultaten voor je bewaarde zoekopdracht.', titel: `Nieuw voor “${v(naam)}”`,
      intro: `Er ${aantal === 1 ? 'is 1 nieuw resultaat' : `zijn ${aantal} nieuwe resultaten`} sinds de vorige e-mail.`,
      blok: { kop: 'Nieuw', rijen: items.slice(0, 6).map((t, i) => [String(i + 1), t] as [string, string]) },
      knop: { tekst: 'Bekijk resultaten', url }, klein: 'Je bewaarde zoekopdrachten beheer je bij Instellingen.',
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
