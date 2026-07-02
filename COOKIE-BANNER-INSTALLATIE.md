# Cookie-banner installatie

**Datum**: 2 juli 2026
**Bestand**: `cookie-banner.js` (staat naast dit doc in Live site/)

## Wat het doet

- Toont bij eerste bezoek een banner onderin scherm (met dark backdrop)
- 3 knop-opties: `Alleen essentieel` / `Voorkeuren` / `Accepteer alles`
- Voorkeuren-panel opent 3 toggles: Essentieel (locked-on), Analytics, Marketing
- Keuze wordt opgeslagen in localStorage (`hr-cookie-consent`)
- Alleen bij `analytics: true` worden GA4 en Microsoft Clarity scripts geladen
- Werkt op mobiel (banner wordt full-width, knoppen stapelen)
- Toegankelijk: keyboard navigation, ARIA labels, role="dialog"

## Wat er nog moet gebeuren (Can-actie)

### 1. GA4 + Clarity IDs invullen

Open `cookie-banner.js` en pas deze 2 regels aan:

```js
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';
const CLARITY_PROJECT_ID = 'XXXXXXXXXX';
```

- Voor GA4: Google Analytics account aanmaken op analytics.google.com, property `holland-recruitment.nl`, measurement-ID kopiëren (formaat `G-ABC123DEF4`)
- Voor Clarity: aanmaken op clarity.microsoft.com, project-ID kopiëren (formaat `abc123def4`)

Zolang de IDs `XXXX` bevatten, worden de scripts NIET geladen — banner werkt wel gewoon.

### 2. Script toevoegen aan alle HTML-pagina's

Voeg deze regel toe vlak vóór de sluitende `</body>` op elke pagina in Live site/:

```html
<script src="/cookie-banner.js" defer></script>
```

Handmatig: open elk .html-bestand, plak de regel toe onderaan. Of via bash:

```bash
cd "/Users/muhammedcan/Documents/Claude/Projects/Holland Recruitment/2 - Website/Live site"

# Voeg script toe aan alle .html files (voor </body>)
for f in *.html; do
  if ! grep -q "cookie-banner.js" "$f"; then
    sed -i.bak 's|</body>|<script src="/cookie-banner.js" defer></script>\n</body>|' "$f"
  fi
done

# Verwijder .bak files na verificatie
find . -name "*.html.bak" -delete
```

### 3. Privacyverklaring-link check

De banner linkt naar `/privacyverklaring.html`. Check of die pagina bestaat en up-to-date is:

```bash
ls "/Users/muhammedcan/Documents/Claude/Projects/Holland Recruitment/2 - Website/Live site/privacyverklaring.html"
```

Als niet bestaat: maak 'm aan (of pas de link in cookie-banner.js aan naar bestaande pagina zoals `/privacy.html`).

### 4. Deploy

Upload de nieuwe `cookie-banner.js` + gewijzigde .html-pagina's naar productie (Strato/waar de site draait).

### 5. Testen

- Open holland-recruitment.nl in incognito → banner moet direct verschijnen
- Klik "Alleen essentieel" → banner verdwijnt, GA4/Clarity NIET geladen
- Ververs pagina → banner verschijnt NIET meer (keuze bewaard)
- Reset: open browser-console, typ `HRCookies.reset()` → banner komt terug
- Test met "Accepteer alles" → GA4/Clarity scripts worden geladen (check Network tab)

### 6. Herinneringslink toevoegen aan footer (optioneel maar aanbevolen)

Voor gebruikers die achteraf hun keuze willen wijzigen — voeg toe aan footer:

```html
<a href="#" onclick="event.preventDefault(); HRCookies.open()">Cookie-voorkeuren wijzigen</a>
```

## Compliance-check

Wat deze banner dekt onder AVG:
- ✅ Toestemming vooraf voor niet-essentiële cookies (art 6.1a AVG)
- ✅ Vrije keuze (niet gedwongen)
- ✅ Granulair: analytics en marketing apart aan/uit
- ✅ Even makkelijk weigeren als accepteren (3 knoppen op één niveau)
- ✅ Intrekbaar (voorkeuren-link in footer)
- ✅ Info over doel (in privacyverklaring)
- ✅ Werkt zonder dat scripts vooraf laden

## Waarom deze aanpak

**Design keuzes:**
- Banner ipv full-screen modal → minder aggressief, maar backdrop = niet weg te scrollen tot geklikt
- Bottom-center → conventie, mensen weten waar te zoeken
- 3 knoppen op één niveau (essentieel / voorkeuren / accepteer) → AP-richtlijn: gelijkwaardig
- Toggle-icons → visueel duidelijker dan checkbox
- Brand-kleuren → matches rest van site

**Wat het NIET is:**
- Geen cookie-wall (site werkt zonder acceptatie)
- Geen "essentieel = ook analytics" trick (analytics is opt-in only)
- Geen pre-checked toggles (start altijd uit voor niet-essentieel)
- Geen tracking vóór consent
