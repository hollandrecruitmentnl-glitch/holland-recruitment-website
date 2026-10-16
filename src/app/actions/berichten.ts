'use server';
import { revalidatePath } from 'next/cache';
import { huidigAccount, type Account } from '@/lib/auth';
import { q, one, tx } from '@/lib/db';
import { limiet } from '@/lib/ratelimit';
import { mails } from '@/lib/emails';
import { SITE } from '@/lib/mail';
import { controleer, nieuwPad, opslaan } from '@/lib/storage';
import { GESPREK_LABELS } from '@/lib/constants';
import { markeerGelezen } from '@/lib/data/berichten';

function magBerichten(a: Account | null): string | null {
  if (!a) return 'Log in om een bericht te sturen.';
  if (a.status !== 'actief') return 'Dit account is geblokkeerd.';
  if (a.rol === 'beheer') return 'Beheer kan geen berichten sturen.';
  if (!a.email_bevestigd) return a.rol === 'bedrijf' ? 'Bevestig eerst uw e-mailadres: vul de code uit de e-mail in bovenaan de pagina. Geen e-mail? Kijk ook in uw spam of vraag een nieuwe code aan.' : 'Bevestig eerst je e-mailadres: vul de code uit de e-mail in bovenaan de pagina. Geen e-mail? Kijk ook in je spam of vraag een nieuwe code aan.';
  return null;
}

async function notificeer(gesprekId: string, afzender: Account, tekst: string) {
  const g = await one(`select g.*, o.titel as opdracht_titel, b.naam as b_naam from gesprekken g join bedrijven b on b.id = g.bedrijf_id left join opdrachten o on o.id = g.opdracht_id where g.id = $1`, [gesprekId]);
  if (!g) return;
  // ontvangers: freelancer of alle bedrijfsleden
  const ontvangers = afzender.rol === 'bedrijf'
    ? await q(`select a.id, a.email, a.meldingen, a.laatst_actief from accounts a where a.id = $1 and a.status = 'actief'`, [g.freelancer_id])
    : await q(`select a.id, a.email, a.meldingen, a.laatst_actief from bedrijf_leden bl join accounts a on a.id = bl.account_id where bl.bedrijf_id = $1 and a.status = 'actief'`, [g.bedrijf_id]);
  const van = afzender.rol === 'bedrijf' ? `${afzender.voornaam} ${afzender.achternaam} van ${g.b_naam}` : `${afzender.voornaam} ${afzender.achternaam}`;
  for (const o of ontvangers) {
    if (o.meldingen?.nieuw_bericht === false) continue;
    // Alleen geen e-mail als de ontvanger dit gesprek op dit moment open heeft (het venster ververst elke 5 s).
    const kijktMee = await one(`select 1 from gelezen where gesprek_id = $1 and account_id = $2 and tot > now() - interval '20 seconds'`, [gesprekId, o.id]);
    if (kijktMee) continue;
    if (!(await limiet(`mail:gesprek:${gesprekId}:${o.id}`, 1, 3600))) continue; // max. 1 e-mail per gesprek per uur
    await mails.nieuwBericht(o.email, van, g.opdracht_titel || '', tekst, `${SITE}/mijn/berichten/${gesprekId}`, afzender.rol !== 'bedrijf');
  }
}

export async function startGesprek(doel: 'freelancer' | 'bedrijf', doelId: string, tekst: string, opdrachtId?: string): Promise<{ fout?: string; gesprek?: string }> {
  const a = await huidigAccount();
  const fout = magBerichten(a); if (fout) return { fout };
  tekst = String(tekst || '').trim().slice(0, 4000);
  if (tekst.length < 2) return { fout: 'Schrijf eerst een bericht.' };
  if (!(await limiet(`start:${a!.id}`, 30, 86400))) return { fout: 'Vandaag zijn er al veel nieuwe gesprekken gestart. Probeer het morgen opnieuw.' };
  let freelancerId: string, bedrijfId: string;
  if (a!.rol === 'bedrijf' && doel === 'freelancer' && a!.bedrijf_id) { freelancerId = doelId; bedrijfId = a!.bedrijf_id; }
  else if (a!.rol === 'freelancer' && doel === 'bedrijf') { freelancerId = a!.id; bedrijfId = doelId; }
  else return { fout: a!.rol === 'freelancer' ? 'Als freelancer kun je bedrijven een bericht sturen, geen andere freelancers.' : 'Dit kan niet met dit account.' };
  const ok = await one(`select (select status from accounts where id = $1) as f, (select status from bedrijven where id = $2) as b`, [freelancerId, bedrijfId]);
  if (ok?.f !== 'actief' || ok?.b !== 'actief') return { fout: 'Dit profiel is niet beschikbaar.' };
  if (opdrachtId && !(await one(`select 1 from opdrachten where id = $1 and (bedrijf_id = $2)`, [opdrachtId, bedrijfId]))) opdrachtId = undefined;
  const id = await tx(async c => {
    let g = (await c.query(`select id from gesprekken where freelancer_id = $1 and bedrijf_id = $2 and opdracht_id is not distinct from $3`, [freelancerId, bedrijfId, opdrachtId ?? null])).rows[0];
    if (!g) g = (await c.query(`insert into gesprekken (freelancer_id, bedrijf_id, gestart_door, opdracht_id) values ($1,$2,$3,$4) returning id`, [freelancerId, bedrijfId, a!.id, opdrachtId ?? null])).rows[0];
    const geblokt = (await c.query(`select 1 from blokkades where gesprek_id = $1`, [g.id])).rows[0];
    if (geblokt) return null;
    await c.query(`insert into berichten (gesprek_id, afzender_id, tekst) values ($1,$2,$3)`, [g.id, a!.id, tekst]);
    await c.query(`update gesprekken set laatste_bericht = now() where id = $1`, [g.id]);
    return g.id as string;
  });
  if (!id) return { fout: 'Dit gesprek kan niet worden voortgezet.' };
  await markeerGelezen(id, a!.id);
  await notificeer(id, a!, tekst);
  revalidatePath('/mijn/berichten');
  return { gesprek: id };
}

async function eigenGesprek(a: Account, gesprekId: string) {
  return one(`select g.*, exists (select 1 from blokkades bk where bk.gesprek_id = g.id) as geblokkeerd from gesprekken g where g.id = $1 and (g.freelancer_id = $2 or g.bedrijf_id = $3)`, [gesprekId, a.id, a.bedrijf_id]);
}

export type VerstuurResultaat = { fout?: string; bericht?: { id: string; tekst: string; aangemaakt: string; bijlage_naam: string | null; bijlage_grootte: number | null; heeft_bijlage: boolean } };

export async function stuurBericht(fd: FormData): Promise<VerstuurResultaat> {
  const a = await huidigAccount();
  const fout = magBerichten(a); if (fout) return { fout };
  const gesprekId = String(fd.get('gesprek'));
  const tekst = String(fd.get('tekst') || '').trim().slice(0, 4000);
  const file = fd.get('bijlage') as File | null;
  const g = await eigenGesprek(a!, gesprekId);
  if (!g) return { fout: 'Gesprek niet gevonden.' };
  if (g.geblokkeerd) return { fout: 'Dit gesprek is gesloten. Er kunnen geen berichten meer worden gestuurd.' };
  if (!tekst && !(file && file.size)) return { fout: 'Schrijf eerst een bericht.' };
  if (!(await limiet(`msg:${a!.id}`, 120, 3600))) return { fout: 'Er zijn veel berichten kort na elkaar verstuurd. Wacht even en probeer het opnieuw.' };
  let bijlage: { pad: string; naam: string; grootte: number } | null = null;
  if (file && file.size) {
    const c = await controleer(file, 'bijlage');
    if ('fout' in c) return { fout: c.fout };
    const pad = nieuwPad(`bijlagen/${gesprekId}`, c.ext);
    await opslaan(pad, c.data, c.type);
    bijlage = { pad, naam: c.naam, grootte: c.data.length };
  }
  const m = await one(`insert into berichten (gesprek_id, afzender_id, tekst, bijlage_pad, bijlage_naam, bijlage_grootte) values ($1,$2,$3,$4,$5,$6)
    returning id, tekst, aangemaakt, bijlage_naam, bijlage_grootte, (bijlage_pad is not null) as heeft_bijlage`, [gesprekId, a!.id, tekst, bijlage?.pad ?? null, bijlage?.naam ?? null, bijlage?.grootte ?? null]);
  await q('update gesprekken set laatste_bericht = now() where id = $1', [gesprekId]);
  if (a!.rol === 'bedrijf' && g.opdracht_id) await q(`update reacties set status = 'in_gesprek' where opdracht_id = $1 and freelancer_id = $2 and status in ('verstuurd','gelezen')`, [g.opdracht_id, g.freelancer_id]);
  await markeerGelezen(gesprekId, a!.id);
  await notificeer(gesprekId, a!, tekst || `Bijlage: ${bijlage?.naam}`);
  return { bericht: { ...m, aangemaakt: new Date(m.aangemaakt).toISOString() } };
}

export async function zetLabel(gesprekId: string, label: string) {
  const a = await huidigAccount(); if (!a || magBerichten(a)) return { fout: 'Niet toegestaan.' };
  if (!GESPREK_LABELS[label]) return { fout: 'Onbekende status.' };
  const g = await eigenGesprek(a, gesprekId); if (!g) return { fout: 'Gesprek niet gevonden.' };
  if (g.statuslabel === label) return {};
  await q('update gesprekken set statuslabel = $1 where id = $2', [label, gesprekId]);
  await q(`insert into berichten (gesprek_id, afzender_id, systeem, tekst) values ($1,$2,true,$3)`, [gesprekId, a.id, `${a.voornaam} zette de status op “${GESPREK_LABELS[label]}”.`]);
  if (g.opdracht_id) {
    const st = label === 'samenwerken' ? 'samenwerking' : label === 'geen_match' ? 'geen_match' : label === 'in_gesprek' || label === 'kennismaking' ? 'in_gesprek' : null;
    if (st) await q(`update reacties set status = $1 where opdracht_id = $2 and freelancer_id = $3 and status <> 'opdracht_gesloten'`, [st, g.opdracht_id, g.freelancer_id]);
  }
  revalidatePath(`/mijn/berichten/${gesprekId}`);
  return {};
}

export async function meldGesprek(fd: FormData) {
  const a = await huidigAccount(); if (!a) return { fout: 'Log in.' };
  const gesprekId = String(fd.get('gesprek')), reden = String(fd.get('reden') || '').slice(0, 80), toelichting = String(fd.get('toelichting') || '').slice(0, 1000);
  if (!reden) return { fout: 'Kies een reden.' };
  const g = await eigenGesprek(a, gesprekId); if (!g) return { fout: 'Gesprek niet gevonden.' };
  if (!(await limiet(`meld:${a.id}`, 10, 86400))) return { fout: 'Er zijn vandaag al veel meldingen gedaan.' };
  const laatste = await one(`select id from berichten where gesprek_id = $1 and afzender_id is distinct from $2 and systeem = false order by aangemaakt desc limit 1`, [gesprekId, a.id]);
  await q(`insert into meldingen (soort, reden, toelichting, door_id, gesprek_id, bericht_id) values ('gesprek',$1,$2,$3,$4,$5)`, [reden, toelichting, a.id, gesprekId, laatste?.id ?? null]);
  await mails.intern('info', 'Nieuwe melding van een gesprek', [['Reden', reden], ['Toelichting', toelichting]], `${SITE}/beheer/moderatie`);
  return { ok: true };
}

export async function blokkeerGesprek(fd: FormData) {
  const a = await huidigAccount(); if (!a) return;
  const gesprekId = String(fd.get('gesprek'));
  const g = await eigenGesprek(a, gesprekId); if (!g) return;
  await q(`insert into blokkades (blokkeerder_id, gesprek_id) values ($1,$2) on conflict do nothing`, [a.id, gesprekId]);
  revalidatePath('/mijn/berichten');
}

export async function markeer(gesprekId: string) {
  const a = await huidigAccount(); if (!a) return;
  if (await eigenGesprek(a, gesprekId)) await markeerGelezen(gesprekId, a.id);
}
