'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { vereis, hashWachtwoord, maakSessie, beeindigSessie } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { mails } from '@/lib/emails';
import { SITE } from '@/lib/mail';
import { sha256, str } from '@/lib/util';
import { logboek } from '@/lib/log';
import { limiet } from '@/lib/ratelimit';
import { vakgebiedNaam } from '@/lib/constants';
import { klaarzetten, verstuurUitnodigingen } from '@/lib/uitnodigen';
import type { FormState } from './auth';

const melding = (s: string) => `/beheer/uitnodigen?melding=${encodeURIComponent(s)}`;

export async function klaarzettenActie() {
  const a = await vereis('beheer');
  let tekst: string;
  try {
    const r = await klaarzetten(a.id);
    tekst = `${r.klaargezet} profielen klaargezet, ${r.cv} cv's gekopieerd. Er is nog geen e-mail verstuurd.${r.fouten.length ? ` Let op: ${r.fouten.slice(0, 5).join('; ')}` : ''}`;
  } catch (e: any) { tekst = `Klaarzetten mislukt: ${String(e?.message || e).slice(0, 200)}`; }
  revalidatePath('/beheer/uitnodigen');
  redirect(melding(tekst));
}

/** Voorbeeld van de uitnodiging naar het e-mailadres van de beheerder. De knop opent een voorbeeldpagina, geen echt account. */
export async function testmailActie() {
  const a = await vereis('beheer');
  const v = await one(`select a.voornaam, f.functietitel, f.vakgebied, f.regio, f.cv_pad from accounts a join freelancers f on f.id = a.id where a.status = 'uitgenodigd' order by a.aangemaakt limit 1`);
  await mails.uitnodiging(a.email, v?.voornaam || 'Sanne', `${SITE}/uitnodiging/voorbeeld`,
    { functie: v?.functietitel || 'Projectmanager', vakgebied: vakgebiedNaam(v?.vakgebied) || 'Projectmanagement', regio: v?.regio || 'Rotterdam', cv: v ? !!v.cv_pad : true }, true);
  await logboek(a.id, 'uitnodiging_testmail', 'account', a.id);
  redirect(melding(`Testmail verstuurd naar ${a.email}. De knop in de testmail opent een voorbeeldpagina.`));
}

export async function versturenActie() {
  const a = await vereis('beheer');
  const r = await verstuurUitnodigingen(a.id);
  revalidatePath('/beheer/uitnodigen');
  redirect(melding(`${r.verstuurd} uitnodigingen verstuurd.${r.resterend ? ` Nog ${r.resterend} te gaan: klik nogmaals.` : ''}`));
}

/** Freelancer activeert het klaargezette profiel via de link uit de e-mail. */
export async function activeren(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd.get('token'));
  const pw = String(fd.get('wachtwoord') ?? '');
  const cv = str(fd.get('zichtbaar_cv'));
  const google = fd.get('vindbaar_google') === 'ja';
  const f: Record<string, string> = {};
  if (!(await limiet(`activeer:${sha256(token).slice(0, 16)}`, 10, 3600))) return { fouten: { algemeen: 'Te veel pogingen. Probeer het over een uur opnieuw.' } };
  if (pw.length < 8) f.wachtwoord = 'Kies een wachtwoord van minimaal 8 tekens.';
  if (pw.length > 200) f.wachtwoord = 'Dit wachtwoord is te lang.';
  if (fd.get('voorwaarden') !== 'ja') f.voorwaarden = 'Ga akkoord met de gebruiksvoorwaarden om je profiel te activeren.';
  if (!['publiek', 'na_contact', 'verborgen'].includes(cv)) f.zichtbaar_cv = 'Kies wie je cv mag zien.';
  if (Object.keys(f).length) return { fouten: f };
  const t = await one<{ account_id: string }>(`select t.account_id from tokens t join accounts a on a.id = t.account_id
    where t.token_hash = $1 and t.soort = 'uitnodiging' and t.gebruikt is null and t.verloopt > now() and a.status = 'uitgenodigd'`, [sha256(token)]);
  if (!t) return { fouten: { algemeen: 'Deze link is verlopen of al gebruikt. Vraag via "Wachtwoord vergeten" een nieuwe link aan.' } };
  await q(`update accounts set wachtwoord_hash = $1, status = 'actief', email_bevestigd = true, laatst_actief = now() where id = $2`, [await hashWachtwoord(pw), t.account_id]);
  await q(`update freelancers set zichtbaar_cv = $1, vindbaar_google = $2, bijgewerkt = now() where id = $3`, [cv, google, t.account_id]);
  await q(`update tokens set gebruikt = now() where account_id = $1 and soort = 'uitnodiging' and gebruikt is null`, [t.account_id]);
  await logboek(t.account_id, 'uitnodiging_geactiveerd', 'account', t.account_id, { zichtbaar_cv: cv, vindbaar_google: google });
  await beeindigSessie();
  await maakSessie(t.account_id);
  redirect('/mijn/profiel?welkom=1');
}
