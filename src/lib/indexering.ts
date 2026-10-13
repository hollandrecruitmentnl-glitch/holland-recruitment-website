import 'server-only';
import { after } from 'next/server';
import { q } from './db';
import { SITE } from './mail';
import { googleManier, googleToken as gToken, SCOPES } from './google';
export { googleManier };

/**
 * Zoekmachines direct laten weten dat een eigen opdracht nieuw, gewijzigd of weg is.
 * - Google Indexing API: officieel bedoeld voor pagina's met JobPosting (onze eigen opdrachten).
 * - IndexNow: Bing, Yandex, Seznam e.a.
 * Werkt alleen op het echte domein (www); op de preview wordt niets gemeld.
 * Synchroniseert de gewenste stand met wat al gemeld is (tabel `indexering`), zodat niets dubbel of te laat gaat.
 */
const WWW = 'https://www.holland-recruitment.nl';
const INDEXNOW_KEY = '68715e21ed860bafed0d61ea7dfdfee9'; // openbaar sleutelbestand op www (zelfde als de website)

export const indexeringActief = () => SITE === WWW || process.env.INDEXERING_FORCEER === '1';

const googleToken = (vers = false) => gToken([SCOPES.indexing], vers);

async function meldGoogle(url: string, type: 'URL_UPDATED' | 'URL_DELETED'): Promise<string> {
  try {
    const t = await googleToken();
    const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ url, type }),
    });
    if (r.ok) return 'ok';
    const j = await r.json().catch(() => ({}));
    return `fout ${r.status}${j?.error?.message ? `: ${String(j.error.message).slice(0, 120)}` : ''}`;
  } catch (e: any) { return `fout: ${String(e?.message || e).slice(0, 160)}`; }
}

/** Test de Google-koppeling zonder iets te melden (voor de knop in beheer). */
export async function testGoogleKoppeling(): Promise<string> {
  if (!googleManier()) return 'Geen Google-koppeling ingesteld.';
  try {
    const t = await googleToken(true);
    // Metadata opvragen van de homepage: bewijst dat het token geldig is voor de Indexing API.
    const r = await fetch(`https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(WWW + '/')}`, { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok || r.status === 404) return `Werkt (${googleManier()}). Google accepteert de koppeling.`;
    const j = await r.json().catch(() => ({}));
    return `Token ok, maar Indexing API gaf ${r.status}: ${String(j?.error?.message || '').slice(0, 160)}`;
  } catch (e: any) { return `Fout: ${String(e?.message || e).slice(0, 200)}`; }
}

async function meldIndexNow(urls: string[]): Promise<string> {
  if (!urls.length) return '';
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(WWW).host, key: INDEXNOW_KEY, keyLocation: `${WWW}/${INDEXNOW_KEY}.txt`, urlList: urls }),
    });
    return r.ok || r.status === 202 ? 'ok' : `fout ${r.status}`;
  } catch (e: any) { return `fout: ${String(e?.message || e).slice(0, 120)}`; }
}

/** Welke eigen opdrachten moeten (opnieuw) gemeld worden? */
async function teMelden() {
  return q<{ pad: string; gewenst: 'URL_UPDATED' | 'URL_DELETED' }>(`
    with stand as (
      select '/opdrachten/' || o.slug as pad, o.bijgewerkt,
        case when o.status = 'live' and (o.reageren_tot is null or o.reageren_tot >= current_date) and b.status = 'actief'
             then 'URL_UPDATED' else 'URL_DELETED' end as gewenst
      from opdrachten o join bedrijven b on b.id = o.bedrijf_id where o.bron = 'direct' and o.geplaatst_op is not null)
    select s.pad, s.gewenst from stand s left join indexering i on i.pad = s.pad
    where (s.gewenst = 'URL_UPDATED' and (i.pad is null or i.type <> 'URL_UPDATED' or s.bijgewerkt > i.gemeld_op))
       or (s.gewenst = 'URL_DELETED' and i.type = 'URL_UPDATED')
    limit 150`);
}

/** Meld alle wijzigingen sinds de vorige keer. Veilig om vaak aan te roepen. */
export async function synchroniseerIndexering(): Promise<{ gemeld: number; status: string }> {
  if (!indexeringActief()) return { gemeld: 0, status: 'uit (geen www)' };
  const lijst = await teMelden();
  if (!lijst.length) return { gemeld: 0, status: 'niets te melden' };
  const droog = process.env.INDEXERING_DROOG === '1'; // test: niets versturen
  const google = googleManier();
  const inNow = droog ? 'droog' : await meldIndexNow(lijst.map(l => WWW + l.pad));
  for (const l of lijst) {
    const g = droog ? 'droog' : google ? await meldGoogle(WWW + l.pad, l.gewenst) : 'geen koppeling';
    await q(`insert into indexering (pad, type, gemeld_op, google, indexnow) values ($1,$2,now(),$3,$4)
      on conflict (pad) do update set type = excluded.type, gemeld_op = now(), google = excluded.google, indexnow = excluded.indexnow`, [l.pad, l.gewenst, g, inNow]);
  }
  return { gemeld: lijst.length, status: `Google: ${google ?? 'geen koppeling'} · IndexNow: ${inNow}` };
}

/** Voor in server actions: na het antwoord, zonder de gebruiker te laten wachten. */
export function indexeringNaAfloop() {
  if (!indexeringActief()) return;
  try { after(async () => { await synchroniseerIndexering().catch(() => {}); }); }
  catch { /* buiten request-context: de dagelijkse cron pakt het op */ }
}
