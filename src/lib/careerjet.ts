import 'server-only';
import { headers } from 'next/headers';

export type CjResultaat = { titel: string; bedrijf: string; locatie: string; omschrijving: string; url: string; datum: string; salaris: string };

/**
 * Careerjet-publisher-API: alleen LIVE tonen bij een zoekopdracht (niet opslaan), met het IP en de user-agent
 * van de bezoeker. Links gaan via Careerjet (tracking-redirect). Zonder CAREERJET_KEY: niets.
 */
export async function careerjetZoek(q: string, locatie: string, paginaUrl: string): Promise<CjResultaat[]> {
  const key = process.env.CAREERJET_KEY;
  if (!key) return [];
  const h = await headers();
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || '';
  const ua = h.get('user-agent') || '';
  if (!ip || !ua) return [];
  const p = new URLSearchParams({
    locale_code: 'nl_NL', keywords: `${q ? q + ' ' : ''}freelance`.trim(), location: locatie || 'Nederland', sort: 'date',
    page_size: '10', page: '1', user_ip: ip, user_agent: ua, url: paginaUrl,
  });
  try {
    const r = await fetch(`https://search.api.careerjet.net/v4/query?${p}`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${key}:`).toString('base64'), Referer: paginaUrl },
      signal: AbortSignal.timeout(2500), cache: 'no-store',
    });
    if (!r.ok) return [];
    const j: any = await r.json();
    const strip = (s: string) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return (j.jobs || []).slice(0, 10).map((x: any) => ({
      titel: strip(x.title), bedrijf: strip(x.company), locatie: strip(x.locations), omschrijving: strip(x.description).slice(0, 220),
      url: x.url, datum: x.date || '', salaris: strip(x.salary),
    })).filter((x: CjResultaat) => x.titel && /^https?:\/\//.test(x.url));
  } catch { return []; }
}
