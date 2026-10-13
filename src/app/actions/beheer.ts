'use server';
import { revalidatePath } from 'next/cache';
import { indexeringNaAfloop } from '@/lib/indexering';
import { redirect } from 'next/navigation';
import { vereis, hashWachtwoord } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { logboek } from '@/lib/log';
import { mails } from '@/lib/emails';
import { SITE } from '@/lib/mail';
import { REACTIETERMIJN } from '@/lib/constants';
import { datumNL, randomToken, sha256, str } from '@/lib/util';
import { draaiFeeds } from '@/lib/feeds';

async function beheer() { return vereis('beheer'); }
const terug = (fd: FormData, std: string) => { const t = str(fd.get('terug')); return t.startsWith('/beheer') ? t : std; };

export async function keurOpdracht(fd: FormData) {
  const a = await beheer();
  const id = str(fd.get('id')), besluit = str(fd.get('besluit')), reden = str(fd.get('reden'), 1000);
  const o = await one(`select o.*, b.naam as bedrijf from opdrachten o left join bedrijven b on b.id = o.bedrijf_id where o.id = $1`, [id]);
  if (!o) redirect('/beheer/opdrachten');
  if (besluit !== 'goedkeuren' && reden.length < 5) redirect(`${terug(fd, '/beheer/opdrachten')}${terug(fd, '').includes('?') ? '&' : '?'}open=${id}&fout=reden`);
  const contact = o.bedrijf_id ? await one(`select a.email, a.meldingen from accounts a where a.id = coalesce($1, (select account_id from bedrijf_leden where bedrijf_id = $2 and rol = 'eigenaar' limit 1))`, [o.contactpersoon_id, o.bedrijf_id]) : null;
  if (besluit === 'goedkeuren') {
    await q(`update opdrachten set status = 'live', status_reden = null, geplaatst_op = coalesce(geplaatst_op, now()), bijgewerkt = now() where id = $1`, [id]);
    if (contact && contact.meldingen?.opdracht_status !== false) await mails.opdrachtLive(contact.email, o.titel, o.reageren_tot ? datumNL(o.reageren_tot) : 'niet ingesteld', o.reactietermijn ? REACTIETERMIJN[o.reactietermijn] : '', `${SITE}/opdrachten/${o.slug}`);
  } else if (besluit === 'afwijzen') {
    await q(`update opdrachten set status = 'afgewezen', status_reden = $2, bijgewerkt = now() where id = $1`, [id, reden]);
    if (contact) await mails.opdrachtAfgewezen(contact.email, o.titel, reden, `${SITE}/mijn/opdrachten/${id}/bewerken`);
  } else if (besluit === 'verwijderen') {
    await q(`update opdrachten set status = 'verwijderd', status_reden = $2, bijgewerkt = now() where id = $1`, [id, reden]);
    if (contact) await mails.opdrachtVerwijderd(contact.email, o.titel, reden);
  }
  await logboek(a.id, `opdracht_${besluit}`, 'opdracht', id, { titel: o.titel, reden });
  indexeringNaAfloop();
  revalidatePath('/beheer/opdrachten');
  redirect(terug(fd, '/beheer/opdrachten'));
}

export async function blokkeerAccount(fd: FormData) {
  const a = await beheer();
  const soort = str(fd.get('soort')), id = str(fd.get('id')), actie = str(fd.get('actie')), reden = str(fd.get('reden'), 1000);
  if (actie === 'blokkeren' && reden.length < 5) redirect(`${terug(fd, '/beheer')}${terug(fd, '').includes('?') ? '&' : '?'}fout=reden`);
  const status = actie === 'blokkeren' ? 'geblokkeerd' : 'actief';
  if (soort === 'bedrijf') {
    await q(`update bedrijven set status = $2, blok_reden = $3 where id = $1`, [id, status, actie === 'blokkeren' ? reden : null]);
    indexeringNaAfloop();
    const leden = await q(`select a.id, a.email from bedrijf_leden bl join accounts a on a.id = bl.account_id where bl.bedrijf_id = $1`, [id]);
    for (const l of leden) {
      await q(`update accounts set status = $2, blok_reden = $3 where id = $1 and rol <> 'beheer'`, [l.id, status, actie === 'blokkeren' ? reden : null]);
      if (actie === 'blokkeren') { await q('delete from sessies where account_id = $1', [l.id]); await mails.geblokkeerd(l.email, reden); }
    }
  } else {
    const acc = await one(`update accounts set status = $2, blok_reden = $3 where id = $1 and rol <> 'beheer' returning email`, [id, status, actie === 'blokkeren' ? reden : null]);
    if (acc && actie === 'blokkeren') { await q('delete from sessies where account_id = $1', [id]); await mails.geblokkeerd(acc.email, reden); }
  }
  await logboek(a.id, `account_${actie}`, soort, id, { reden });
  revalidatePath('/beheer');
  redirect(terug(fd, '/beheer'));
}

export async function handelMeldingAf(fd: FormData) {
  const a = await beheer();
  const id = str(fd.get('id')), besluit = str(fd.get('besluit')), notitie = str(fd.get('notitie'), 2000);
  if (!['geen_actie', 'waarschuwen', 'blokkeren'].includes(besluit)) redirect(`/beheer/moderatie?open=${id}&fout=besluit`);
  const m = await one(`select m.*, d.email as melder_email, b.afzender_id from meldingen m left join accounts d on d.id = m.door_id left join berichten b on b.id = m.bericht_id where m.id = $1`, [id]);
  if (!m) redirect('/beheer/moderatie');
  await q(`update meldingen set status = 'afgehandeld', besluit = $2, notitie = $3, afgehandeld = now() where id = $1`, [id, besluit, notitie]);
  if (besluit === 'blokkeren') {
    const doel = m.afzender_id || m.freelancer_id;
    if (doel) { const acc = await one(`update accounts set status = 'geblokkeerd', blok_reden = $2 where id = $1 and rol <> 'beheer' returning email`, [doel, notitie || 'Overtreding van de voorwaarden']); if (acc) { await q('delete from sessies where account_id = $1', [doel]); await mails.geblokkeerd(acc.email, notitie || 'Overtreding van de voorwaarden'); } }
    if (m.opdracht_id) await q(`update opdrachten set status = 'verwijderd', status_reden = $2 where id = $1`, [m.opdracht_id, notitie || 'Na melding verwijderd']);
  }
  if (m.melder_email) await mails.meldingAfgehandeld(m.melder_email);
  await logboek(a.id, 'melding_afgehandeld', 'melding', id, { besluit });
  if (besluit === 'blokkeren') indexeringNaAfloop();
  redirect('/beheer/moderatie?melding=bijgewerkt');
}

export async function bemiddelingStatus(fd: FormData) {
  const a = await beheer();
  const id = str(fd.get('id')), status = str(fd.get('status')), notitie = str(fd.get('notitie'), 3000);
  if (!['nieuw', 'gebeld', 'voorgesteld', 'geplaatst', 'gestopt'].includes(status)) return;
  await q(`update bemiddeling set status = $2, notitie = $3 where id = $1`, [id, status, notitie || null]);
  await logboek(a.id, 'bemiddeling_status', 'bemiddeling', id, { status });
  revalidatePath('/beheer/bemiddeling');
}

/** Gesprek lezen kan pas na het kiezen van een reden; elke inzage komt in het logboek. */
export async function gesprekInzage(fd: FormData) {
  const a = await beheer();
  const id = str(fd.get('id')), reden = str(fd.get('reden'));
  if (!['melding', 'fraudecontrole', 'support', 'bemiddeling'].includes(reden)) redirect(`/beheer/gesprekken?fout=reden`);
  await logboek(a.id, 'gesprek_inzage', 'gesprek', id, { reden });
  redirect(`/beheer/gesprekken/${id}`);
}

export async function zetInstelling(fd: FormData) {
  const a = await beheer();
  const sleutel = str(fd.get('sleutel'));
  if (sleutel !== 'opdrachten_handmatig_controleren') return;
  const waarde = fd.get('waarde') === 'on';
  await q(`insert into instellingen (sleutel, waarde) values ($1,$2) on conflict (sleutel) do update set waarde = excluded.waarde`, [sleutel, JSON.stringify(waarde)]);
  await logboek(a.id, 'instelling_gewijzigd', 'instelling', sleutel, { waarde });
  redirect('/beheer/instellingen?melding=opgeslagen');
}

export async function nodigBeheerderUit(fd: FormData) {
  const a = await beheer();
  const email = str(fd.get('email')).toLowerCase(), voornaam = str(fd.get('voornaam'), 60), achternaam = str(fd.get('achternaam'), 60);
  if (!/^[^\s@]+@holland-recruitment\.nl$/.test(email)) redirect('/beheer/instellingen?fout=email');
  if (await one('select 1 from accounts where lower(email) = $1', [email])) redirect('/beheer/instellingen?fout=bestaat');
  const acc = await one(`insert into accounts (rol, email, email_bevestigd, wachtwoord_hash, voornaam, achternaam) values ('beheer',$1,true,$2,$3,$4) returning id`, [email, await hashWachtwoord(randomToken()), voornaam, achternaam]);
  const t = randomToken();
  await q(`insert into tokens (token_hash, account_id, soort, verloopt) values ($1,$2,'wachtwoord_reset', now() + interval '1 hour')`, [sha256(t), acc.id]);
  await mails.wachtwoordReset(email, `${SITE}/wachtwoord-vergeten/nieuw?token=${t}`);
  await logboek(a.id, 'beheerder_toegevoegd', 'account', acc.id, { email });
  redirect('/beheer/instellingen?melding=uitgenodigd');
}

export async function draaiFeedsNu() {
  const a = await beheer();
  await draaiFeeds();
  await logboek(a.id, 'feeds_handmatig', 'feed');
  redirect('/beheer/feeds?melding=bijgewerkt');
}
