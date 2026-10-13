import 'server-only';
import { createSign } from 'node:crypto';
import { getVercelOidcToken } from '@vercel/oidc';

/**
 * Toegang tot Google-API's als serviceaccount `hr-indexing`.
 * 1. Zonder sleutel (aanbevolen): Vercel OIDC → Google Workload Identity Federation → serviceaccount.
 *    Env (geen geheimen): GCP_PROJECT_NUMBER, GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID, GCP_SERVICE_ACCOUNT_EMAIL.
 * 2. Met sleutelbestand (alleen als de organisatie dat toestaat): GOOGLE_INDEXING_KEY.
 * Werkt alleen op de productie-omgeving van Vercel (voorwaarde in de identity pool).
 */
export const SCOPES = {
  indexing: 'https://www.googleapis.com/auth/indexing',
  sheets: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  drive: 'https://www.googleapis.com/auth/drive.readonly',
} as const;

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

async function viaSleutel(k: GoogleKey, scopes: string[]) {
  const nu = Math.floor(Date.now() / 1000);
  const kop = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: k.client_email, scope: scopes.join(' '), aud: 'https://oauth2.googleapis.com/token', iat: nu, exp: nu + 3600 }));
  const handtekening = b64url(createSign('RSA-SHA256').update(`${kop}.${claims}`).sign(k.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${kop}.${claims}.${handtekening}` }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`token ${r.status} ${j.error || ''}`.trim());
  return { waarde: j.access_token as string, tot: Date.now() + (j.expires_in ?? 3600) * 1000 };
}
async function viaFederatie(f: { audience: string; sa: string }, scopes: string[]) {
  const oidc = await getVercelOidcToken();
  const sts = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grantType: 'urn:ietf:params:oauth:grant-type:token-exchange', audience: f.audience, scope: 'https://www.googleapis.com/auth/cloud-platform',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token', subjectToken: oidc, subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt' }),
  });
  const s = await sts.json().catch(() => ({}));
  if (!sts.ok || !s.access_token) throw new Error(`sts ${sts.status} ${s.error_description || s.error || ''}`.trim());
  const r = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(f.sa)}:generateAccessToken`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify({ scope: scopes, lifetime: '3600s' }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.accessToken) throw new Error(`impersonatie ${r.status} ${j?.error?.message || ''}`.trim());
  return { waarde: j.accessToken as string, tot: j.expireTime ? Date.parse(j.expireTime) : Date.now() + 3600_000 };
}

const cachePerScope = new Map<string, { waarde: string; tot: number }>();
/** Kortlevend toegangstoken (1 uur) voor de gevraagde scopes. */
export async function googleToken(scopes: string[], vers = false): Promise<string> {
  const sleutel = scopes.slice().sort().join(' ');
  const c = cachePerScope.get(sleutel);
  if (!vers && c && c.tot > Date.now() + 60_000) return c.waarde;
  const f = federatie(), k = googleKey();
  const t = f ? await viaFederatie(f, scopes) : k ? await viaSleutel(k, scopes) : null;
  if (!t) throw new Error('geen Google-koppeling');
  cachePerScope.set(sleutel, t);
  return t.waarde;
}
