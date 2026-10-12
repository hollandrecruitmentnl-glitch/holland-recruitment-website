'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { huidigAccount, vereis } from '@/lib/auth';
import { q, one, tx } from '@/lib/db';
import { limiet } from '@/lib/ratelimit';
import { mails, mailsExtra } from '@/lib/emails';
import { SITE } from '@/lib/mail';
import { PERSPECTIEF, REACTIETERMIJN, VAKGEBIEDEN, WERKVORMEN } from '@/lib/constants';
import { datumNL, int, kort, lijst, slugify, str } from '@/lib/util';
import { logboek } from '@/lib/log';
import type { FormState } from './auth';

// ---------- reageren (freelancer) ----------
export async function reageer(_: FormState, fd: FormData): Promise<FormState> {
  const a = await huidigAccount();
  if (!a || a.rol !== 'freelancer' || a.status !== 'actief') return { fouten: { algemeen: 'Log in als freelancer om te reageren.' } };
  if (!a.email_bevestigd) return { fouten: { algemeen: 'Bevestig eerst je e-mailadres. Je kunt een nieuwe bevestigingsmail aanvragen in je overzicht.' } };
  const opdrachtId = str(fd.get('opdracht'));
  const motivatie = str(fd.get('motivatie'), 3000);
  const o = await one(`select o.*, b.naam as bedrijf_naam from opdrachten o join bedrijven b on b.id = o.bedrijf_id where o.id = $1 and o.status = 'live' and o.bron = 'direct' and b.status = 'actief' and (o.reageren_tot is null or o.reageren_tot >= current_date)`, [opdrachtId]);
  if (!o) return { fouten: { algemeen: 'Reageren op deze opdracht kan niet meer.' } };
  if (!(await limiet(`reactie:${a.id}`, 40, 86400))) return { fouten: { algemeen: 'Je hebt vandaag al veel reacties verstuurd. Probeer het morgen opnieuw.' } };
  const r = await one(`insert into reacties (opdracht_id, freelancer_id, motivatie) values ($1,$2,$3) on conflict (opdracht_id, freelancer_id) do nothing returning id`, [opdrachtId, a.id, motivatie]);
  if (!r) return { ok: true };
  const f = await one(`select functietitel, uurtarief, beschikbaarheid, beschikbaar_vanaf::text, cv_pad from freelancers where id = $1`, [a.id]);
  const leden = await q(`select a.email, a.meldingen from bedrijf_leden bl join accounts a on a.id = bl.account_id where bl.bedrijf_id = $1 and a.status = 'actief'`, [o.bedrijf_id]);
  const termijn = o.reactietermijn ? REACTIETERMIJN[o.reactietermijn] : 'zo snel mogelijk';
  for (const l of leden) {
    if (l.meldingen?.reactie === false) continue;
    await mails.nieuweReactie(l.email, `${a.voornaam} ${a.achternaam}`, o.titel, [
      ['Functie', f?.functietitel || ''], ['Tarief', f?.uurtarief ? `€ ${f.uurtarief} per uur` : 'Niet ingevuld'],
      ['Beschikbaar', f?.beschikbaarheid === 'nu' ? 'Direct' : f?.beschikbaar_vanaf ? `Vanaf ${datumNL(f.beschikbaar_vanaf)}` : 'Niet beschikbaar'], ['Cv', f?.cv_pad ? 'Bijgevoegd in het platform' : 'Geen cv'],
    ], termijn, `${SITE}/mijn/opdrachten/${o.id}`);
  }
  revalidatePath(`/opdrachten/${o.slug}`);
  return { ok: true };
}

// ---------- opdracht plaatsen (bedrijf) ----------
type Velden = Record<string, any>;
function lees(fd: FormData): Velden {
  const startType = str(fd.get('start_type'));
  const loopType = str(fd.get('looptijd_type'));
  const tariefType = str(fd.get('tarief_type'));
  return {
    titel: str(fd.get('titel'), 120), vakgebied: str(fd.get('vakgebied')), omschrijving: str(fd.get('omschrijving'), 8000), meebrengen: str(fd.get('meebrengen'), 4000),
    werkvorm: str(fd.get('werkvorm')), locatie: str(fd.get('locatie'), 80), dagen_op_locatie: int(fd.get('dagen_op_locatie')),
    start_asap: startType === 'asap', start_datum: startType === 'datum' ? str(fd.get('start_datum')) || null : null,
    looptijd_onbekend: loopType === 'onbekend', looptijd_n: loopType === 'onbekend' ? null : int(fd.get('looptijd_n')), looptijd_eenheid: loopType === 'onbekend' ? null : (str(fd.get('looptijd_eenheid')) || 'maanden'),
    uren_min: int(fd.get('uren_min')), uren_max: int(fd.get('uren_max')),
    tarief_in_overleg: tariefType === 'overleg', tarief_min: tariefType === 'overleg' ? null : int(fd.get('tarief_min')), tarief_max: tariefType === 'overleg' ? null : int(fd.get('tarief_max')),
    ervaring_jaren: int(fd.get('ervaring_jaren')), aantal: int(fd.get('aantal')) || 1,
    vaardigheden: lijst(fd.get('vaardigheden')), certificeringen: lijst(fd.get('certificeringen')), talen: lijst(fd.get('talen')),
    perspectief: fd.getAll('perspectief').map(String).filter(p => p in PERSPECTIEF),
    reactietermijn: str(fd.get('reactietermijn')) || null, reageren_tot: str(fd.get('reageren_tot')) || null,
    contactpersoon_id: str(fd.get('contactpersoon')) || null,
    bemiddeling: str(fd.get('modus')) === 'bemiddeling', telefoon: str(fd.get('telefoon'), 30),
  };
}
function valideer(v: Velden): Record<string, string> {
  const f: Record<string, string> = {};
  if (v.titel.length < 4) f.titel = 'Geef de opdracht een duidelijke titel, bijvoorbeeld Werkvoorbereider E&I.';
  if (!VAKGEBIEDEN.some(x => x.slug === v.vakgebied)) f.vakgebied = 'Kies een vakgebied.';
  if (v.omschrijving.length < 40) f.omschrijving = 'Beschrijf de opdracht in minimaal 40 tekens.';
  if (!WERKVORMEN.some(w => w.v === v.werkvorm)) f.werkvorm = 'Kies een werkvorm.';
  if (v.werkvorm !== 'remote' && !v.locatie) f.locatie = 'Vul de plaats van de opdracht in.';
  if (v.werkvorm === 'hybride' && (v.dagen_op_locatie == null || v.dagen_op_locatie < 1 || v.dagen_op_locatie > 5)) f.dagen_op_locatie = 'Kies 1 tot 5 dagen op locatie.';
  if (!v.start_asap && !v.start_datum) f.start = 'Kies een startdatum of "Zo snel mogelijk".';
  if (v.start_datum && v.start_datum < new Date().toISOString().slice(0, 10)) f.start = 'De startdatum ligt in het verleden.';
  if (!v.looptijd_onbekend && (!v.looptijd_n || v.looptijd_n < 1 || v.looptijd_n > 104)) f.looptijd = 'Vul de looptijd in, of kies "Nog niet bekend".';
  if (v.uren_min == null || v.uren_max == null || v.uren_min < 1 || v.uren_max > 60 || v.uren_min > v.uren_max) f.uren = 'Vul de uren per week in, tussen 1 en 60, met minimum ≤ maximum.';
  if (!v.tarief_in_overleg) {
    if (v.tarief_min == null && v.tarief_max == null) f.tarief = 'Vul een tarief in, of kies "In overleg".';
    else if ((v.tarief_min ?? 0) < 0 || (v.tarief_max ?? 0) > 1000 || (v.tarief_min != null && v.tarief_max != null && v.tarief_min > v.tarief_max)) f.tarief = 'Het minimumtarief moet lager zijn dan het maximum.';
  }
  if (!v.reactietermijn || !(v.reactietermijn in REACTIETERMIJN)) f.reactietermijn = 'Kies binnen hoeveel tijd je reageert.';
  if (!v.reageren_tot) f.reageren_tot = 'Kies tot wanneer freelancers kunnen reageren.';
  else if (v.reageren_tot < new Date().toISOString().slice(0, 10)) f.reageren_tot = 'Deze datum ligt in het verleden.';
  if (v.bemiddeling && !/^[+0-9 ()-]{10,}$/.test(v.telefoon)) f.telefoon = 'Vul een telefoonnummer in, zodat onze recruiter je kan bellen.';
  return f;
}

async function bewaar(a: { id: string; bedrijf_id: string | null }, id: string | null, v: Velden, status?: string) {
  const cols = ['titel', 'vakgebied', 'omschrijving', 'meebrengen', 'werkvorm', 'locatie', 'dagen_op_locatie', 'start_asap', 'start_datum', 'looptijd_n', 'looptijd_eenheid', 'looptijd_onbekend',
    'uren_min', 'uren_max', 'tarief_min', 'tarief_max', 'tarief_in_overleg', 'ervaring_jaren', 'aantal', 'vaardigheden', 'certificeringen', 'talen', 'perspectief', 'reactietermijn', 'reageren_tot', 'contactpersoon_id', 'bemiddeling'];
  const clean = { ...v };
  if (!VAKGEBIEDEN.some(x => x.slug === clean.vakgebied)) clean.vakgebied = null;
  if (!WERKVORMEN.some(w => w.v === clean.werkvorm)) clean.werkvorm = null;
  if (!(clean.reactietermijn in REACTIETERMIJN)) clean.reactietermijn = null;
  for (const k of ['uren_min', 'uren_max']) if (clean[k] != null && (clean[k] < 1 || clean[k] > 60)) clean[k] = null;
  if (clean.uren_min != null && clean.uren_max != null && clean.uren_min > clean.uren_max) clean.uren_max = null;
  if (clean.tarief_min != null && clean.tarief_max != null && clean.tarief_min > clean.tarief_max) clean.tarief_max = null;
  if (clean.dagen_op_locatie != null && (clean.dagen_op_locatie < 1 || clean.dagen_op_locatie > 5)) clean.dagen_op_locatie = null;
  if (clean.contactpersoon_id && !(await one('select 1 from bedrijf_leden where bedrijf_id = $1 and account_id = $2', [a.bedrijf_id, clean.contactpersoon_id]))) clean.contactpersoon_id = a.id;
  if (!clean.contactpersoon_id) clean.contactpersoon_id = a.id;
  for (const k of ['start_datum', 'reageren_tot']) if (clean[k] && !/^\d{4}-\d{2}-\d{2}$/.test(clean[k])) clean[k] = null;
  const vals = cols.map(c => clean[c] ?? (Array.isArray(v[c]) ? [] : null));
  vals[cols.indexOf('titel')] = clean.titel || 'Concept-opdracht';
  vals[cols.indexOf('omschrijving')] = clean.omschrijving || '';
  vals[cols.indexOf('meebrengen')] = clean.meebrengen || '';
  vals[cols.indexOf('locatie')] = clean.locatie || '';
  if (id) {
    const set = cols.map((c, i) => `${c} = $${i + 3}`).join(', ');
    const r = await one(`update opdrachten set ${set}, bijgewerkt = now() ${status ? `, status = '${status}'` : ''} where id = $1 and bedrijf_id = $2 and status not in ('verwijderd') returning id, slug, status`, [id, a.bedrijf_id, ...vals]);
    return r;
  }
  const slug = `${slugify(clean.titel || 'opdracht')}-${kort()}`;
  return one(`insert into opdrachten (slug, bron, bedrijf_id, status, ${cols.join(', ')}) values ($1, 'direct', $2, '${status || 'concept'}', ${cols.map((_, i) => `$${i + 3}`).join(', ')}) returning id, slug, status`, [slug, a.bedrijf_id, ...vals]);
}

/** Automatisch opslaan als concept (bij elke wijziging). */
export async function opslaanConcept(fd: FormData): Promise<{ id?: string; fout?: string }> {
  const a = await huidigAccount();
  if (!a || a.rol !== 'bedrijf' || !a.bedrijf_id || a.status !== 'actief') return { fout: 'Niet ingelogd.' };
  if (!(await limiet(`concept:${a.id}`, 400, 3600))) return {};
  const id = str(fd.get('id')) || null;
  if (id) {
    const bestaand = await one(`select status from opdrachten where id = $1 and bedrijf_id = $2`, [id, a.bedrijf_id]);
    if (!bestaand) return { fout: 'Niet gevonden.' };
    if (bestaand.status !== 'concept' && bestaand.status !== 'afgewezen') return { id }; // live opdrachten pas bij "Opslaan" bijwerken
  }
  const v = lees(fd);
  if (!id && !v.titel && !v.omschrijving) return {};
  const r = await bewaar(a, id, v);
  return { id: r?.id };
}

export async function indienen(_: FormState, fd: FormData): Promise<FormState> {
  const a = await vereis('bedrijf');
  if (!a.bedrijf_id) return { fouten: { algemeen: 'Je account hoort niet bij een bedrijf.' } };
  if (!a.email_bevestigd) return { fouten: { algemeen: 'Bevestig eerst je e-mailadres. Je kunt een nieuwe bevestigingsmail aanvragen in je overzicht.' } };
  const v = lees(fd);
  const f = valideer(v);
  const id = str(fd.get('id')) || null;
  if (Object.keys(f).length) {
    if (!id || (await one(`select 1 from opdrachten where id = $1 and status in ('concept','afgewezen')`, [id]))) await bewaar(a, id, v).catch(() => null);
    return { fouten: f };
  }
  const bestaand = id ? await one(`select id, status, titel, slug from opdrachten where id = $1 and bedrijf_id = $2`, [id, a.bedrijf_id]) : null;
  if (bestaand && ['live', 'in_controle'].includes(bestaand.status)) {
    // Bewerken na plaatsing: status blijft, reageerders krijgen een melding.
    const r = await bewaar(a, id, v);
    await logboek(a.id, 'opdracht_bewerkt', 'opdracht', id!);
    if (bestaand.status === 'live') {
      const reageerders = await q(`select a.email from reacties r join accounts a on a.id = r.freelancer_id where r.opdracht_id = $1 and a.status = 'actief'`, [id]);
      for (const x of reageerders) await mailsExtra.opdrachtGewijzigd(x.email, v.titel, `${SITE}/opdrachten/${r?.slug}`);
    }
    redirect(`/mijn/opdrachten/${id}?melding=bijgewerkt`);
  }
  const handmatig = (await one<{ waarde: boolean }>(`select waarde from instellingen where sleutel = 'opdrachten_handmatig_controleren'`))?.waarde !== false;
  const status = handmatig || v.bemiddeling ? 'in_controle' : 'live';
  const r = await bewaar(a, id, v, status);
  if (!r) return { fouten: { algemeen: 'Opslaan is niet gelukt. Probeer het opnieuw.' } };
  if (status === 'live') await q(`update opdrachten set geplaatst_op = now() where id = $1`, [r.id]);
  await logboek(a.id, 'opdracht_ingediend', 'opdracht', r.id, { bemiddeling: v.bemiddeling });
  if (v.bemiddeling) {
    await q(`insert into bemiddeling (bedrijf_id, opdracht_id, account_id, naam, bedrijfsnaam, email, telefoon, toelichting) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [a.bedrijf_id, r.id, a.id, `${a.voornaam} ${a.achternaam}`, a.bedrijf_naam, a.email, v.telefoon, `Opdracht: ${v.titel}`]);
    await q('update accounts set telefoon = coalesce(telefoon, $1) where id = $2', [v.telefoon, a.id]);
    await mails.bemiddelingBevestiging(a.email, a.voornaam);
    await mails.intern('sales', `Bemiddeling aangevraagd: ${v.titel}`, [['Bedrijf', a.bedrijf_naam || ''], ['Contact', `${a.voornaam} ${a.achternaam}`], ['Telefoon', v.telefoon], ['E-mail', a.email]], `${SITE}/beheer/bemiddeling`);
  } else if (status === 'in_controle') {
    await mails.intern('sales', `Opdracht ter controle: ${v.titel}`, [['Bedrijf', a.bedrijf_naam || ''], ['Titel', v.titel]], `${SITE}/beheer/opdrachten?status=in_controle`);
  }
  redirect(`/mijn/opdrachten?melding=${v.bemiddeling ? 'bemiddeling' : status === 'live' ? 'live' : 'ingediend'}`);
}

export async function verwijderConcept(fd: FormData) {
  const a = await vereis('bedrijf');
  await q(`delete from opdrachten where id = $1 and bedrijf_id = $2 and status = 'concept'`, [str(fd.get('id')), a.bedrijf_id]);
  redirect('/mijn/opdrachten?melding=verwijderd');
}

// ---------- reacties beheren (bedrijf) ----------
async function eigenReactie(bedrijfId: string | null, reactieId: string) {
  return one(`select r.*, o.bedrijf_id, o.id as opdracht_id from reacties r join opdrachten o on o.id = r.opdracht_id where r.id = $1 and o.bedrijf_id = $2`, [reactieId, bedrijfId]);
}
export async function zetReactieLabel(fd: FormData) {
  const a = await vereis('bedrijf');
  const r = await eigenReactie(a.bedrijf_id, str(fd.get('reactie'))); if (!r) return;
  const label = str(fd.get('label'));
  const nieuw = label === r.label ? null : (label === 'shortlist' || label === 'geen_match' ? label : null);
  await q(`update reacties set label = $1, status = case when $1 = 'geen_match' then 'geen_match' when status = 'geen_match' then 'gelezen' else status end where id = $2`, [nieuw, r.id]);
  revalidatePath(`/mijn/opdrachten/${r.opdracht_id}`);
}
export async function reactieNotitie(fd: FormData) {
  const a = await vereis('bedrijf');
  const r = await eigenReactie(a.bedrijf_id, str(fd.get('reactie'))); if (!r) return;
  const tekst = str(fd.get('tekst'), 2000); if (!tekst) return;
  await q(`insert into reactie_notities (reactie_id, auteur_id, tekst) values ($1,$2,$3)`, [r.id, a.id, tekst]);
  revalidatePath(`/mijn/opdrachten/${r.opdracht_id}`);
}

export async function sluitOpdracht(_: FormState, fd: FormData): Promise<FormState> {
  const a = await vereis('bedrijf');
  const id = str(fd.get('id'));
  const met = str(fd.get('gesloten_met'));
  const wie = str(fd.get('freelancer')) || null;
  if (!['reageerder', 'extern', 'niemand'].includes(met)) return { fouten: { gesloten_met: 'Kies wie de opdracht gaat doen.' } };
  if (met === 'reageerder' && !wie) return { fouten: { gesloten_met: 'Kies de freelancer die de opdracht gaat doen.' } };
  const o = await one(`select * from opdrachten where id = $1 and bedrijf_id = $2 and status in ('live','in_controle')`, [id, a.bedrijf_id]);
  if (!o) return { fouten: { algemeen: 'Deze opdracht kan niet (meer) worden gesloten.' } };
  const overig = await tx(async c => {
    await c.query(`update opdrachten set status = 'gesloten', gesloten_met = $1, gesloten_freelancer_id = $2, bijgewerkt = now() where id = $3`, [met, met === 'reageerder' ? wie : null, id]);
    if (met === 'reageerder' && wie) await c.query(`update reacties set status = 'samenwerking' where opdracht_id = $1 and freelancer_id = $2`, [id, wie]);
    const rest = (await c.query(`update reacties r set status = 'opdracht_gesloten' from accounts a where a.id = r.freelancer_id and r.opdracht_id = $1 and r.freelancer_id is distinct from $2 returning a.email`, [id, met === 'reageerder' ? wie : null])).rows;
    return rest as { email: string }[];
  });
  for (const x of overig) await mails.opdrachtIngevuld(x.email, o.titel, a.bedrijf_naam || 'Het bedrijf');
  await logboek(a.id, 'opdracht_gesloten', 'opdracht', id, { met });
  redirect(`/mijn/opdrachten?melding=gesloten`);
}

// ---------- bemiddeling (los formulier) ----------
export async function vraagBemiddeling(_: FormState, fd: FormData): Promise<FormState> {
  const a = await huidigAccount();
  const w = Object.fromEntries(['naam', 'bedrijfsnaam', 'email', 'telefoon', 'toelichting', 'freelancer'].map(k => [k, str(fd.get(k), k === 'toelichting' ? 3000 : 200)]));
  if (str(fd.get('website_hp'))) return { ok: true };
  const f: Record<string, string> = {};
  if (w.naam.split(/\s+/).filter(Boolean).length < 2) f.naam = 'Vul je voor- en achternaam in.';
  if (!w.bedrijfsnaam) f.bedrijfsnaam = 'Vul de naam van je bedrijf in.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(w.email)) f.email = 'Vul een geldig e-mailadres in.';
  if (!/^[+0-9 ()-]{10,}$/.test(w.telefoon)) f.telefoon = 'Vul een telefoonnummer in, zodat onze recruiter je kan bellen.';
  if (w.toelichting.length < 20) f.toelichting = 'Beschrijf kort wie je zoekt (minimaal 20 tekens).';
  if (Object.keys(f).length) return { fouten: f, waarden: w };
  if (!(await limiet(`bemiddeling:${w.email}`, 5, 86400))) return { fouten: { algemeen: 'We hebben je aanvraag al ontvangen. We bellen je binnen één werkdag.' }, waarden: w };
  const toel = w.freelancer ? `${w.toelichting}\n\nInteresse in profiel: ${SITE}/freelancer/${w.freelancer}` : w.toelichting;
  await q(`insert into bemiddeling (bedrijf_id, account_id, naam, bedrijfsnaam, email, telefoon, toelichting) values ($1,$2,$3,$4,$5,$6,$7)`,
    [a?.bedrijf_id ?? null, a?.id ?? null, w.naam, w.bedrijfsnaam, w.email.toLowerCase(), w.telefoon, toel]);
  await mails.bemiddelingBevestiging(w.email, w.naam);
  await mails.intern('sales', `Bemiddeling aangevraagd door ${w.bedrijfsnaam}`, [['Naam', w.naam], ['Telefoon', w.telefoon], ['E-mail', w.email], ['Vraag', toel]], `${SITE}/beheer/bemiddeling`);
  return { ok: true };
}
