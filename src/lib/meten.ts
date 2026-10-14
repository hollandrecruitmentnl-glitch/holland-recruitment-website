'use client';
/**
 * Conversies naar GA4, alleen als de bezoeker analytics-cookies heeft geaccepteerd (cookiebalk, sleutel hr-cookie-consent).
 * Zonder toestemming gebeurt er niets. GA4 zelf wordt door /cookie-banner.js geladen; tot dat klaar is wachten we maximaal 6 s.
 */
type Params = Record<string, string | number>;

function toestemming(): boolean {
  try { const c = JSON.parse(localStorage.getItem('hr-cookie-consent') || 'null'); return !!c?.analytics; } catch { return false; }
}

export function meet(naam: string, params: Params = {}) {
  if (typeof window === 'undefined' || !toestemming()) return;
  const w = window as any;
  let pogingen = 0;
  const stuur = () => {
    if (typeof w.gtag === 'function') { w.gtag('event', naam, params); return; }
    if (++pogingen < 24) setTimeout(stuur, 250);
  };
  stuur();
}

/** Toast-meldingen (?melding=… / ?welkom=…) die een conversie zijn. */
export function meetMelding(key: string, waarde: string | null) {
  switch (key) {
    case 'welkom': meet('sign_up', { method: 'platform', rol: waarde && waarde !== '1' ? waarde : 'onbekend' }); break;
    case 'ingediend': case 'live': meet('opdracht_geplaatst', { modus: 'zelf' }); break;
    case 'bemiddeling': meet('opdracht_geplaatst', { modus: 'bemiddeling' }); meet('generate_lead', { form: 'opdracht_bemiddeling' }); break;
    case 'verstuurd': meet('gesprek_gestart'); break;
  }
}
