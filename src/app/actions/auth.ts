'use server';
import { redirect } from 'next/navigation';
import { q, one, tx } from '@/lib/db';
import { beeindigSessie, checkWachtwoord, dummyCheck, clientIp, hashWachtwoord, huidigAccount, maakSessie } from '@/lib/auth';
import { limiet } from '@/lib/ratelimit';
import { controleerKvk } from '@/lib/kvk';
import { mails } from '@/lib/emails';
import { SITE } from '@/lib/mail';
import { GRATIS_MAILDIENSTEN, VAKGEBIEDEN } from '@/lib/constants';
import { kort, randomToken, sha256, slugify, str } from '@/lib/util';
import { logboek } from '@/lib/log';
import { stuurUitnodiging } from '@/lib/uitnodigen';

export type FormState = { fouten?: Record<string, string>; melding?: string; ok?: boolean; waarden?: Record<string, string> } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const veiligTerug = (t: string) => (t.startsWith('/') && !t.startsWith('//') ? t : '');
/** Voegt een queryparameter toe vóór een eventuele #hash. */
const metParam = (url: string, k: string, v: string) => { const [pad, hash] = url.split('#'); return `${pad}${pad.includes('?') ? '&' : '?'}${k}=${encodeURIComponent(v)}${hash ? '#' + hash : ''}`; };

function waarden(fd: FormData, velden: string[]) {
  return Object.fromEntries(velden.map(v => [v, str(fd.get(v), 2000)]));
}

async function maakBevestigToken(accountId: string): Promise<string> {
  const t = randomToken();
  await q(`insert into tokens (token_hash, account_id, soort, verloopt) values ($1,$2,'email_bevestigen', now() + interval '24 hours')`, [sha256(t), accountId]);
  return `${SITE}/bevestigen?token=${t}`;
}

export async function registreren(_: FormState, fd: FormData): Promise<FormState> {
  const rol = str(fd.get('rol'));
  const w = waarden(fd, ['rol', 'voornaam', 'achternaam', 'email', 'functietitel', 'vakgebied', 'regio', 'contactnaam', 'bedrijfsnaam', 'kvk', 'website', 'plaats', 'terug', 'uitnodiging']);
  const pw = String(fd.get('wachtwoord') ?? '');
  const f: Record<string, string> = {};
  if (str(fd.get('website_hp'))) return { fouten: { algemeen: 'Er ging iets mis. Probeer het opnieuw.' }, waarden: w };
  if (!(await limiet(`reg:${await clientIp()}`, 8, 3600))) return { fouten: { algemeen: 'Te veel pogingen. Probeer het over een uur opnieuw.' }, waarden: w };
  if (rol !== 'freelancer' && rol !== 'bedrijf') return { fouten: { rol: 'Kies of je freelancer of bedrijf bent.' }, waarden: w };
  const email = w.email.toLowerCase();
  if (!EMAIL.test(email)) f.email = 'Vul een geldig e-mailadres in, bijvoorbeeld naam@bedrijf.nl.';
  if (pw.length < 8) f.wachtwoord = 'Kies een wachtwoord van minimaal 8 tekens.';
  if (pw.length > 200) f.wachtwoord = 'Dit wachtwoord is te lang.';

  let voornaam = w.voornaam, achternaam = w.achternaam;
  if (rol === 'freelancer') {
    if (!voornaam) f.voornaam = 'Vul je voornaam in.';
    if (!achternaam) f.achternaam = 'Vul je achternaam in.';
    if (!w.functietitel) f.functietitel = 'Vul je functietitel in, bijvoorbeeld Maintenance Engineer.';
    if (!VAKGEBIEDEN.some(v => v.slug === w.vakgebied)) f.vakgebied = 'Kies je vakgebied.';
    if (!w.regio) f.regio = 'Vul je regio in, bijvoorbeeld Rotterdam.';
  } else {
    const parts = w.contactnaam.split(/\s+/).filter(Boolean);
    if (parts.length < 2) f.contactnaam = 'Vul uw voor- en achternaam in.';
    voornaam = parts[0] || ''; achternaam = parts.slice(1).join(' ');
    const domein = email.split('@')[1] || '';
    if (!f.email && GRATIS_MAILDIENSTEN.includes(domein)) f.email = 'Gebruik uw zakelijke e-mailadres. Adressen van gratis maildiensten zoals Gmail of Hotmail kunnen niet.';
    if (!w.uitnodiging) {
      if (!w.bedrijfsnaam) f.bedrijfsnaam = 'Vul de naam van uw bedrijf in.';
      if (!/^\d{8}$/.test(w.kvk)) f.kvk = 'Een KvK-nummer heeft 8 cijfers.';
      if (!w.plaats) f.plaats = 'Vul de vestigingsplaats in.';
      if (w.website && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(w.website)) f.website = 'Vul een geldig webadres in, bijvoorbeeld www.bedrijf.nl.';
    }
  }
  const bestaand = !f.email ? await one<{ id: string; status: string }>('select id, status from accounts where lower(email) = $1', [email]) : null;
  if (bestaand?.status === 'uitgenodigd') {
    if (await limiet(`reset:${email}`, 3, 3600)) await stuurUitnodiging(bestaand.id);
    return { fouten: { algemeen: 'Er staat al een profiel voor je klaar op basis van je eerdere aanmelding. We hebben je een e-mail gestuurd met een link om het te activeren.' }, waarden: w };
  }
  if (bestaand) f.email = 'Er bestaat al een account met dit e-mailadres. Log in of kies "Wachtwoord vergeten".';
  let uitnodiging: any = null;
  if (rol === 'bedrijf' && w.uitnodiging) {
    uitnodiging = await one(`select * from bedrijf_uitnodigingen where token_hash = $1 and geaccepteerd is null and aangemaakt > now() - interval '7 days'`, [sha256(w.uitnodiging)]);
    if (!uitnodiging) f.algemeen = 'Deze uitnodiging is verlopen of al gebruikt. Vraag uw collega om een nieuwe uitnodiging.';
  }
  if (rol === 'bedrijf' && !uitnodiging && !f.kvk) {
    if (await one('select 1 from bedrijven where kvk = $1', [w.kvk])) f.kvk = 'Dit bedrijf heeft al een account. Vraag een collega om u uit te nodigen via Bedrijfsprofiel › Team.';
  }
  let kvkRes: Awaited<ReturnType<typeof controleerKvk>> | null = null;
  if (rol === 'bedrijf' && !uitnodiging && !f.kvk) {
    kvkRes = await controleerKvk(w.kvk);
    if (!kvkRes.ok) f.kvk = kvkRes.fout;
  }
  if (Object.keys(f).length) return { fouten: f, waarden: w };

  const hash = await hashWachtwoord(pw);
  const id = await tx(async c => {
    const acc = (await c.query(`insert into accounts (rol, email, wachtwoord_hash, voornaam, achternaam) values ($1,$2,$3,$4,$5) returning id`,
      [rol, email, hash, voornaam, achternaam])).rows[0].id as string;
    if (rol === 'freelancer') {
      await c.query(`insert into freelancers (id, slug, functietitel, vakgebied, regio, ook_bemiddeld) values ($1,$2,$3,$4,$5,$6)`,
        [acc, `${slugify(voornaam + ' ' + achternaam)}-${kort()}`, w.functietitel.slice(0, 80), w.vakgebied, w.regio.slice(0, 60), fd.get('ook_bemiddeld') === 'on']);
    } else if (uitnodiging) {
      await c.query(`insert into bedrijf_leden (bedrijf_id, account_id, rol) values ($1,$2,'lid')`, [uitnodiging.bedrijf_id, acc]);
      await c.query(`update bedrijf_uitnodigingen set geaccepteerd = now() where id = $1`, [uitnodiging.id]);
    } else {
      const kvk = kvkRes as { ok: true; gecontroleerd: boolean };
      let site = w.website; if (site && !/^https?:\/\//.test(site)) site = 'https://' + site;
      const b = (await c.query(`insert into bedrijven (slug, naam, kvk, kvk_controle_op, kvk_controle_resultaat, website, plaats) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [`${slugify(w.bedrijfsnaam)}-${kort()}`, w.bedrijfsnaam.slice(0, 120), w.kvk, kvk.gecontroleerd ? new Date() : null, kvk.gecontroleerd ? 'actief' : 'niet gecontroleerd', site || null, w.plaats.slice(0, 60)])).rows[0].id;
      await c.query(`insert into bedrijf_leden (bedrijf_id, account_id, rol) values ($1,$2,'eigenaar')`, [b, acc]);
    }
    return acc;
  });
  await logboek(id, 'account_aangemaakt', 'account', id, { rol });
  await mails.bevestigEmail(email, voornaam, rol, await maakBevestigToken(id));
  await maakSessie(id);
  redirect(metParam(veiligTerug(w.terug) || '/mijn', 'welkom', rol));
}

export async function inloggen(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd.get('email')).toLowerCase();
  const pw = String(fd.get('wachtwoord') ?? '');
  const terug = veiligTerug(str(fd.get('terug')));
  const w = { email, terug };
  const ip = await clientIp();
  if (!(await limiet(`login:${ip}`, 20, 900)) || !(await limiet(`login:${email}`, 8, 900)))
    return { fouten: { algemeen: 'Te veel inlogpogingen. Wacht een kwartier en probeer het opnieuw.' }, waarden: w };
  const a = await one<{ id: string; wachtwoord_hash: string; status: string; rol: string }>('select id, wachtwoord_hash, status, rol from accounts where lower(email) = $1', [email]);
  const ok = a ? await checkWachtwoord(pw, a.wachtwoord_hash) : await dummyCheck(pw);
  if (a?.status === 'uitgenodigd') return { fouten: { algemeen: 'Je profiel staat klaar, maar is nog niet geactiveerd. Gebruik de link uit je uitnodiging, of vraag via "Wachtwoord vergeten" een nieuwe link aan.' }, waarden: w };
  if (!a || !ok) return { fouten: { algemeen: 'Dit e-mailadres en wachtwoord horen niet bij elkaar. Controleer ze of kies "Wachtwoord vergeten".' }, waarden: w };
  if (a.status === 'geblokkeerd') redirect('/geblokkeerd');
  await maakSessie(a.id);
  redirect(terug || (a.rol === 'beheer' ? '/beheer' : '/mijn'));
}

export async function uitloggen() {
  await beeindigSessie();
  redirect('/');
}

export async function wachtwoordVergeten(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd.get('email')).toLowerCase();
  if (!EMAIL.test(email)) return { fouten: { email: 'Vul een geldig e-mailadres in.' }, waarden: { email } };
  if (await limiet(`reset:${await clientIp()}`, 6, 3600) && await limiet(`reset:${email}`, 3, 3600)) {
    const u = await one<{ id: string }>('select id from accounts where lower(email) = $1 and status = \'uitgenodigd\'', [email]);
    if (u) await stuurUitnodiging(u.id); // klaargezet profiel: nieuwe activatielink
    const a = await one<{ id: string }>('select id from accounts where lower(email) = $1 and status = \'actief\'', [email]);
    if (a) {
      const t = randomToken();
      await q(`insert into tokens (token_hash, account_id, soort, verloopt) values ($1,$2,'wachtwoord_reset', now() + interval '1 hour')`, [sha256(t), a.id]);
      await mails.wachtwoordReset(email, `${SITE}/wachtwoord-vergeten/nieuw?token=${t}`);
    }
  }
  // Neutraal: verraadt niet of het adres bestaat.
  return { ok: true, waarden: { email } };
}

export async function nieuwWachtwoord(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd.get('token'));
  const pw = String(fd.get('wachtwoord') ?? ''), pw2 = String(fd.get('wachtwoord2') ?? '');
  const f: Record<string, string> = {};
  if (pw.length < 8) f.wachtwoord = 'Kies een wachtwoord van minimaal 8 tekens.';
  else if (pw !== pw2) f.wachtwoord2 = 'De twee wachtwoorden zijn niet gelijk.';
  if (Object.keys(f).length) return { fouten: f };
  const t = await one<{ account_id: string }>(`select account_id from tokens where token_hash = $1 and soort = 'wachtwoord_reset' and gebruikt is null and verloopt > now()`, [sha256(token)]);
  if (!t) return { fouten: { algemeen: 'Deze link is verlopen of al gebruikt. Vraag een nieuwe link aan.' } };
  await q('update accounts set wachtwoord_hash = $1 where id = $2', [await hashWachtwoord(pw), t.account_id]);
  await q('update tokens set gebruikt = now() where token_hash = $1', [sha256(token)]);
  await q('delete from sessies where account_id = $1', [t.account_id]);
  await logboek(t.account_id, 'wachtwoord_gewijzigd', 'account', t.account_id);
  await maakSessie(t.account_id);
  redirect('/mijn?wachtwoord=1');
}

export async function bevestigingOpnieuw() {
  const a = await huidigAccount();
  if (!a || a.email_bevestigd) return;
  if (!(await limiet(`bevestig:${a.id}`, 3, 3600))) return;
  await mails.bevestigEmail(a.email, a.voornaam, a.rol, await maakBevestigToken(a.id));
}
