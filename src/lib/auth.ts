import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { q, one } from './db';
import { randomToken, sha256 } from './util';

export const COOKIE = 'hr_sessie';
const DAGEN = 30;

export type Rol = 'freelancer' | 'bedrijf' | 'beheer';
export type Account = {
  id: string; rol: Rol; email: string; email_bevestigd: boolean; voornaam: string; achternaam: string;
  telefoon: string | null; status: 'actief' | 'geblokkeerd'; blok_reden: string | null; meldingen: Record<string, boolean>;
  bedrijf_id: string | null; bedrijf_naam: string | null; bedrijf_slug: string | null; freelancer_slug: string | null;
};

export const hashWachtwoord = (pw: string) => bcrypt.hash(pw, 11);
export const checkWachtwoord = (pw: string, hash: string) => bcrypt.compare(pw, hash);
let dummy: string | null = null;
/** Vergelijk tegen een nep-hash zodat een onbekend e-mailadres even lang duurt. */
export const dummyCheck = async (pw: string) => { dummy ??= await bcrypt.hash('niet-bestaand-account', 11); await bcrypt.compare(pw, dummy); return false; };

export async function maakSessie(accountId: string) {
  const token = randomToken();
  const verloopt = new Date(Date.now() + DAGEN * 86400_000);
  await q('insert into sessies (token_hash, account_id, verloopt) values ($1,$2,$3)', [sha256(token), accountId, verloopt]);
  await q('update accounts set laatst_actief = now() where id = $1', [accountId]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: verloopt,
  });
}

export async function beeindigSessie() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) await q('delete from sessies where token_hash = $1', [sha256(t)]);
  jar.delete(COOKIE);
}

export const huidigAccount = cache(async (): Promise<Account | null> => {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const a = await one<Account>(`
    select a.id, a.rol, a.email, a.email_bevestigd, a.voornaam, a.achternaam, a.telefoon, a.status, a.blok_reden, a.meldingen,
           bl.bedrijf_id, b.naam as bedrijf_naam, b.slug as bedrijf_slug, f.slug as freelancer_slug
    from sessies s join accounts a on a.id = s.account_id
    left join bedrijf_leden bl on bl.account_id = a.id
    left join bedrijven b on b.id = bl.bedrijf_id
    left join freelancers f on f.id = a.id
    where s.token_hash = $1 and s.verloopt > now()`, [sha256(t)]);
  if (a) q('update accounts set laatst_actief = now() where id = $1 and (laatst_actief is null or laatst_actief < now() - interval \'5 minutes\')', [a.id]).catch(() => {});
  return a;
});

/** Vereist een ingelogd, actief account (optioneel met rol). Stuurt anders door. */
export async function vereis(rol?: Rol | Rol[], terug?: string): Promise<Account> {
  const a = await huidigAccount();
  if (!a) redirect('/inloggen' + (terug ? `?terug=${encodeURIComponent(terug)}` : ''));
  if (a.status === 'geblokkeerd') redirect('/geblokkeerd');
  if (rol) {
    const rollen = Array.isArray(rol) ? rol : [rol];
    if (!rollen.includes(a.rol)) redirect('/geen-toegang');
  }
  return a;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'onbekend';
}
