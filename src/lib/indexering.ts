import 'server-only';
import { createSign } from 'node:crypto';
import { after } from 'next/server';
import { getVercelOidcToken } from '@vercel/oidc';
import { q } from './db';
import { SITE } from './mail';

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

/**
 * Twee manieren om bij Google in te loggen:
 * 1. Zonder sleutel (aanbevolen): Vercel OIDC → Google Workload Identity Federation → serviceaccount.
 *    Env (geen geheimen): GCP_PROJECT_NUMBER, GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID, GCP_SERVICE_ACCOUNT_EMAIL.
 * 2. Met sleutelbestand (alleen als de organisatie dat toestaat): GOOGLE_INDEXING_KEY.
 */
const SCOPE = 'https://www.googleapis.com/auth/indexing';
type GoogleKey = { client_email: string; private_key: string };
function googleKey(): GoogleKey | null {
  const raw = process.env.GOOGLE_INDEXING_KEY;
  if (!raw) return null;
  try {
    const txt = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const k = JSON.parse(txt);
    if (!k.client_email || !k.private_key) return null;
    return { client_email: k.client_email, private_key: String(k.private_key).replace(/\\n/g, '\n') };
  } catch { return null; }
}
function federatie() {
  const { GCP_PROJECT_NUMBER: nr, GCP_WORKLOAD_IDENTITY_POOL_ID: pool, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: prov, GCP_SERVICE_ACCOUNT_EMAIL: sa } = process.env;
  return nr && pool && prov && sa ? { audience: `//iam.googleapis.com/projects/${nr}/locations/global/workloadIdentityPools/${pool}/providers/${prov}`, sa } : null;
}
export const googleManier = (): 'federatie' | 'sleutel' | null => (federatie() ? 'federatie' : googleKey() ? 'sleutel' : null);

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

let token: { waarde: string; tot: number } | null = null;
async function tokenViaSleutel(k: GoogleKey) {
  const nu = Math.floor(Date.now() / 1000);
  const kop = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: k.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: nu, exp: nu + 3600 }));
  const handtekening = b64url(createSign('RSA-SHA256').update(`${kop}.${claims}`).sign(k.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${kop}.${claims}.${handtekening}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`token ${r.status} ${j.error || ''}`.trim());
  return { waarde: j.access_token as string, tot: Date.now() + (j.expires_in ?? 3600) * 1000 };
}
async function tokenViaFederatie(f: { audience: string; sa: string }) {
  const oidc = await getVercelOidcToken();
  // 1. Vercel-token inwisselen bij Google STS
  const sts = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grantType: 'urn:ietf:params:oauth:grant-type:token-exchange', audience: f.audience, scope: 'https://www.googleapis.com/auth/cloud-platform',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token', subjectToken: oidc, subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt' }),
  });
  const s = await sts.json().catch(() => ({}));
  if (!sts.ok || !s.access_token) throw new Error(`sts ${sts.status} ${s.error_description || s.error || ''}`.trim());
  // 2. Kortlevend token van het serviceaccount (alleen indexing-scope)
  const r = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(f.sa)}:generateAccessToken`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify({ scope: [SCOPE], lifetime: '3600s' }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.accessToken) throw new Error(`impersonatie ${r.status} ${j?.error?.message || ''}`.trim());
  return { waarde: j.accessToken as string, tot: j.expireTime ? Date.parse(j.expireTime) : Date.now() + 3600_000 };
}
async function googleToken(): Promise<string> {
  if (token && token.tot > Date.now() + 60_000) return token.waarde;
  const f = federatie(), k = googleKey();
  if (f) token = await tokenViaFederatie(f);
  else if (k) token = await tokenViaSleutel(k);
  else throw new Error('geen Google-koppeling');
  return token.waarde;
}

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
    token = null;
    const t = await googleToken();
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
