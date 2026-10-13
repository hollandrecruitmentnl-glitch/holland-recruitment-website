'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { huidigAccount, vereis, hashWachtwoord, checkWachtwoord, beeindigSessie } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { controleer, nieuwPad, opslaan, verwijderen } from '@/lib/storage';
import { VAKGEBIEDEN, WERKVORMEN, BRANCHES, GROOTTES } from '@/lib/constants';
import { int, lijst, str, randomToken, sha256 } from '@/lib/util';
import { mails } from '@/lib/emails';
import { SITE } from '@/lib/mail';
import { limiet } from '@/lib/ratelimit';
import { controleerKvk } from '@/lib/kvk';
import { logboek } from '@/lib/log';
import { verwijderAccountVolledig } from '@/lib/accountverwijderen';
import type { FormState } from './auth';

const ZICHT = ['publiek', 'na_contact', 'verborgen'];

export async function bewaarBasis(_: FormState, fd: FormData): Promise<FormState> {
  const a = await vereis('freelancer');
  const v = {
    functietitel: str(fd.get('functietitel'), 80), vakgebied: str(fd.get('vakgebied')), regio: str(fd.get('regio'), 60), introductie: str(fd.get('introductie'), 3000),
    uurtarief: int(fd.get('uurtarief')), jaren_ervaring: int(fd.get('jaren_ervaring')), telefoon: str(fd.get('telefoon'), 30),
    vaardigheden: lijst(fd.get('vaardigheden')), certificeringen: lijst(fd.get('certificeringen')), sectoren: lijst(fd.get('sectoren')), talen: lijst(fd.get('talen'), 10),
  };
  const f: Record<string, string> = {};
  if (!v.functietitel) f.functietitel = 'Vul je functietitel in.';
  if (!VAKGEBIEDEN.some(x => x.slug === v.vakgebied)) f.vakgebied = 'Kies je vakgebied.';
  if (!v.regio) f.regio = 'Vul je regio in.';
  if (v.uurtarief != null && (v.uurtarief < 10 || v.uurtarief > 500)) f.uurtarief = 'Vul een uurtarief in tussen € 10 en € 500.';
  if (v.jaren_ervaring != null && (v.jaren_ervaring < 0 || v.jaren_ervaring > 60)) f.jaren_ervaring = 'Vul een aantal jaren tussen 0 en 60 in.';
  if (v.telefoon && !/^[+0-9 ()-]{10,}$/.test(v.telefoon)) f.telefoon = 'Vul een geldig telefoonnummer in.';
  if (Object.keys(f).length) return { fouten: f };
  await q(`update freelancers set functietitel=$2, vakgebied=$3, regio=$4, introductie=$5, uurtarief=$6, jaren_ervaring=$7, vaardigheden=$8, certificeringen=$9, sectoren=$10, talen=$11, bijgewerkt=now() where id=$1`,
    [a.id, v.functietitel, v.vakgebied, v.regio, v.introductie, v.uurtarief, v.jaren_ervaring, v.vaardigheden, v.certificeringen, v.sectoren, v.talen]);
  await q('update accounts set telefoon = $2 where id = $1', [a.id, v.telefoon || null]);
  revalidatePath('/mijn/profiel');
  return { ok: true, melding: 'Je profiel is opgeslagen.' };
}

/** Automatisch opslaan van beschikbaarheid. */
export async function bewaarBeschikbaarheid(fd: FormData): Promise<{ fout?: string; ok?: boolean }> {
  const a = await huidigAccount(); if (!a || a.rol !== 'freelancer') return { fout: 'Niet ingelogd.' };
  const b = str(fd.get('beschikbaarheid'));
  if (!['nu', 'vanaf', 'periode', 'niet'].includes(b)) return { fout: 'Kies je beschikbaarheid.' };
  const vanaf = str(fd.get('vanaf')) || null, tot = str(fd.get('tot')) || null;
  const uren = int(fd.get('uren'));
  const werkvormen = fd.getAll('werkvormen').map(String).filter(w => WERKVORMEN.some(x => x.v === w));
  if ((b === 'vanaf' || b === 'periode') && !vanaf) return { fout: 'Kies de datum waarop je beschikbaar bent.' };
  if (b === 'periode' && !tot) return { fout: 'Kies tot en met wanneer je beschikbaar bent.' };
  if (b === 'periode' && vanaf && tot && tot < vanaf) return { fout: 'De einddatum ligt vóór de begindatum.' };
  if (uren != null && (uren < 1 || uren > 60)) return { fout: 'Vul tussen 1 en 60 uur per week in.' };
  await q(`update freelancers set beschikbaarheid=$2, beschikbaar_vanaf=$3, beschikbaar_tot=$4, uren_per_week=$5, werkvormen=$6, bijgewerkt=now() where id=$1`,
    [a.id, b, b === 'vanaf' || b === 'periode' ? vanaf : null, b === 'periode' ? tot : null, uren, werkvormen]);
  revalidatePath('/mijn'); revalidatePath('/mijn/profiel');
  return { ok: true };
}

export async function bewaarZichtbaarheid(fd: FormData) {
  const a = await vereis('freelancer');
  const t = str(fd.get('tarief')), w = str(fd.get('werkervaring')), c = str(fd.get('cv'));
  if (![t, w, c].every(x => ZICHT.includes(x))) return;
  await q(`update freelancers set zichtbaar_tarief=$2, zichtbaar_werkervaring=$3, zichtbaar_cv=$4, vindbaar_google=$5, ook_bemiddeld=$6 where id=$1`,
    [a.id, t, w, c, fd.get('vindbaar_google') === 'on', fd.get('ook_bemiddeld') === 'on']);
  revalidatePath('/mijn/profiel');
  redirect('/mijn/profiel?melding=opgeslagen#zichtbaarheid');
}

export async function uploadBestand(fd: FormData): Promise<{ fout?: string; naam?: string }> {
  const a = await huidigAccount(); if (!a || a.status !== 'actief') return { fout: 'Niet ingelogd.' };
  const soort = str(fd.get('soort')) as 'cv' | 'foto' | 'logo';
  if (!(await limiet(`upload:${a.id}`, 30, 3600))) return { fout: 'Te veel uploads. Probeer het later opnieuw.' };
  if (soort === 'logo') {
    if (a.rol !== 'bedrijf' || !a.bedrijf_id) return { fout: 'Niet toegestaan.' };
    const c = await controleer(fd.get('bestand') as File, 'logo'); if ('fout' in c) return c;
    const oud = await one('select logo_pad from bedrijven where id = $1', [a.bedrijf_id]);
    const pad = nieuwPad(`logo/${a.bedrijf_id}`, c.ext); await opslaan(pad, c.data, c.type);
    await q('update bedrijven set logo_pad = $2 where id = $1', [a.bedrijf_id, pad]); await verwijderen(oud?.logo_pad);
    revalidatePath('/mijn/bedrijf'); return { naam: c.naam };
  }
  if (a.rol !== 'freelancer' || (soort !== 'cv' && soort !== 'foto')) return { fout: 'Niet toegestaan.' };
  const c = await controleer(fd.get('bestand') as File, soort); if ('fout' in c) return c;
  const oud = await one(`select cv_pad, foto_pad from freelancers where id = $1`, [a.id]);
  const pad = nieuwPad(`${soort}/${a.id}`, c.ext); await opslaan(pad, c.data, c.type);
  if (soort === 'cv') { await q('update freelancers set cv_pad=$2, cv_naam=$3, bijgewerkt=now() where id=$1', [a.id, pad, c.naam]); await verwijderen(oud?.cv_pad); }
  else { await q('update freelancers set foto_pad=$2, bijgewerkt=now() where id=$1', [a.id, pad]); await verwijderen(oud?.foto_pad); }
  revalidatePath('/mijn/profiel');
  return { naam: c.naam };
}

export async function verwijderBestand(soort: 'cv' | 'foto' | 'logo') {
  const a = await huidigAccount(); if (!a) return;
  if (soort === 'logo' && a.bedrijf_id) { const o = await one('select logo_pad from bedrijven where id=$1', [a.bedrijf_id]); await q('update bedrijven set logo_pad=null where id=$1', [a.bedrijf_id]); await verwijderen(o?.logo_pad); revalidatePath('/mijn/bedrijf'); return; }
  if (a.rol !== 'freelancer') return;
  const o = await one('select cv_pad, foto_pad from freelancers where id=$1', [a.id]);
  if (soort === 'cv') { await q('update freelancers set cv_pad=null, cv_naam=null where id=$1', [a.id]); await verwijderen(o?.cv_pad); }
  if (soort === 'foto') { await q('update freelancers set foto_pad=null where id=$1', [a.id]); await verwijderen(o?.foto_pad); }
  revalidatePath('/mijn/profiel');
}

export async function bewaarWerkervaring(_: FormState, fd: FormData): Promise<FormState> {
  const a = await vereis('freelancer');
  const id = str(fd.get('id')) || null;
  const v = { functie: str(fd.get('functie'), 100), opdrachtgever: str(fd.get('opdrachtgever'), 100), van: int(fd.get('van')), tot: int(fd.get('tot')), huidig: fd.get('huidig') === 'on', omschrijving: str(fd.get('omschrijving'), 2000) };
  const jaar = new Date().getFullYear();
  const f: Record<string, string> = {};
  if (!v.functie) f.functie = 'Vul je functie in.';
  if (!v.van || v.van < 1960 || v.van > jaar) f.van = `Vul een beginjaar in tussen 1960 en ${jaar}.`;
  if (!v.huidig && (!v.tot || v.tot < 1960 || v.tot > jaar + 1)) f.tot = 'Vul een eindjaar in, of kies "Huidige opdracht".';
  else if (!v.huidig && v.van && v.tot && v.tot < v.van) f.tot = 'Het eindjaar ligt vóór het beginjaar.';
  if (Object.keys(f).length) return { fouten: f, waarden: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x ?? '')])) };
  if (id) await q(`update werkervaring set functie=$3, opdrachtgever=$4, van=$5, tot=$6, huidig=$7, omschrijving=$8 where id=$1 and freelancer_id=$2`, [id, a.id, v.functie, v.opdrachtgever, v.van, v.huidig ? null : v.tot, v.huidig, v.omschrijving]);
  else await q(`insert into werkervaring (freelancer_id, functie, opdrachtgever, van, tot, huidig, omschrijving) values ($1,$2,$3,$4,$5,$6,$7)`, [a.id, v.functie, v.opdrachtgever, v.van, v.huidig ? null : v.tot, v.huidig, v.omschrijving]);
  await q('update freelancers set bijgewerkt = now() where id = $1', [a.id]);
  revalidatePath('/mijn/profiel');
  return { ok: true };
}
export async function verwijderWerkervaring(fd: FormData) {
  const a = await vereis('freelancer');
  await q('delete from werkervaring where id = $1 and freelancer_id = $2', [str(fd.get('id')), a.id]);
  revalidatePath('/mijn/profiel');
}

// ---------- bedrijf ----------
export async function bewaarBedrijf(_: FormState, fd: FormData): Promise<FormState> {
  const a = await vereis('bedrijf'); if (!a.bedrijf_id) return { fouten: { algemeen: 'Geen bedrijf.' } };
  const v = { naam: str(fd.get('naam'), 120), kvk: str(fd.get('kvk'), 8), btw: str(fd.get('btw'), 20), website: str(fd.get('website'), 200), branche: str(fd.get('branche')), grootte: str(fd.get('grootte')),
    straat: str(fd.get('straat'), 120), postcode: str(fd.get('postcode'), 7).toUpperCase(), plaats: str(fd.get('plaats'), 60), omschrijving: str(fd.get('omschrijving'), 4000) };
  const f: Record<string, string> = {};
  if (!v.naam) f.naam = 'Vul de bedrijfsnaam in.';
  if (!/^\d{8}$/.test(v.kvk)) f.kvk = 'Een KvK-nummer heeft 8 cijfers.';
  if (v.postcode && !/^\d{4}\s?[A-Z]{2}$/.test(v.postcode)) f.postcode = 'Vul een postcode in zoals 3081 LR.';
  if (!v.plaats) f.plaats = 'Vul de vestigingsplaats in.';
  if (v.branche && !BRANCHES.includes(v.branche)) v.branche = '';
  if (v.grootte && !GROOTTES.includes(v.grootte)) v.grootte = '';
  if (v.website && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(v.website)) f.website = 'Vul een geldig webadres in.';
  const huidig = await one('select kvk from bedrijven where id = $1', [a.bedrijf_id]);
  let kvkCheck: { gecontroleerd: boolean } | null = null;
  if (!f.kvk && huidig.kvk !== v.kvk) {
    if (await one('select 1 from bedrijven where kvk = $1 and id <> $2', [v.kvk, a.bedrijf_id])) f.kvk = 'Dit KvK-nummer is al in gebruik door een ander account.';
    else { const r = await controleerKvk(v.kvk); if (!r.ok) f.kvk = r.fout; else kvkCheck = r; }
  }
  if (Object.keys(f).length) return { fouten: f, waarden: v };
  if (v.website && !/^https?:\/\//.test(v.website)) v.website = 'https://' + v.website;
  await q(`update bedrijven set naam=$2, kvk=$3, btw=$4, website=$5, branche=$6, grootte=$7, straat=$8, postcode=$9, plaats=$10, omschrijving=$11 where id=$1`,
    [a.bedrijf_id, v.naam, v.kvk, v.btw || null, v.website || null, v.branche || null, v.grootte || null, v.straat || null, v.postcode || null, v.plaats, v.omschrijving]);
  if (kvkCheck) await q(`update bedrijven set kvk_controle_op = $2, kvk_controle_resultaat = $3 where id = $1`, [a.bedrijf_id, kvkCheck.gecontroleerd ? new Date() : null, kvkCheck.gecontroleerd ? 'actief' : 'niet gecontroleerd']);
  await q('update accounts set telefoon = $2 where id = $1', [a.id, str(fd.get('telefoon'), 30) || null]);
  revalidatePath('/mijn/bedrijf');
  return { ok: true, melding: 'Bedrijfsprofiel opgeslagen.' };
}

export async function nodigUit(_: FormState, fd: FormData): Promise<FormState> {
  const a = await vereis('bedrijf'); if (!a.bedrijf_id) return {};
  const email = str(fd.get('email')).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { fouten: { email: 'Vul een geldig e-mailadres in.' } };
  if (await one('select 1 from accounts where lower(email) = $1', [email])) return { fouten: { email: 'Er bestaat al een account met dit e-mailadres.' } };
  if (!(await limiet(`uitnodig:${a.bedrijf_id}`, 20, 86400))) return { fouten: { email: 'Je hebt vandaag al veel uitnodigingen verstuurd.' } };
  const t = randomToken();
  await q(`insert into bedrijf_uitnodigingen (bedrijf_id, email, token_hash, door) values ($1,$2,$3,$4)`, [a.bedrijf_id, email, sha256(t), a.id]);
  await mails.teamUitnodiging(email, a.bedrijf_naam || '', `${a.voornaam} ${a.achternaam}`, `${SITE}/registreren?uitnodiging=${t}`);
  revalidatePath('/mijn/bedrijf');
  return { ok: true, melding: `Uitnodiging verstuurd naar ${email}.` };
}
export async function verwijderLid(fd: FormData) {
  const a = await vereis('bedrijf');
  const id = str(fd.get('id'));
  if (id === a.id) return;
  await q(`delete from bedrijf_leden where bedrijf_id = $1 and account_id = $2`, [a.bedrijf_id, id]);
  await q(`update accounts set status = 'geblokkeerd', blok_reden = 'Verwijderd uit team' where id = $1 and not exists (select 1 from bedrijf_leden where account_id = $1)`, [id]);
  await q('delete from sessies where account_id = $1', [id]);
  await logboek(a.id, 'teamlid_verwijderd', 'account', id);
  revalidatePath('/mijn/bedrijf');
}
export async function trekUitnodigingIn(fd: FormData) {
  const a = await vereis('bedrijf');
  await q('delete from bedrijf_uitnodigingen where id = $1 and bedrijf_id = $2 and geaccepteerd is null', [str(fd.get('id')), a.bedrijf_id]);
  revalidatePath('/mijn/bedrijf');
}

// ---------- instellingen ----------
export async function bewaarMeldingen(fd: FormData) {
  const a = await vereis();
  const m = { nieuw_bericht: fd.get('nieuw_bericht') === 'on', reactie: fd.get('reactie') === 'on', opdracht_status: fd.get('opdracht_status') === 'on', bewaarde_zoekopdracht: fd.get('bewaarde_zoekopdracht') === 'on' };
  await q('update accounts set meldingen = $2 where id = $1', [a.id, JSON.stringify(m)]);
  redirect('/mijn/instellingen?melding=opgeslagen');
}
export async function wijzigWachtwoord(_: FormState, fd: FormData): Promise<FormState> {
  const a = await vereis();
  const oud = String(fd.get('oud') || ''), nieuw = String(fd.get('nieuw') || '');
  const acc = await one('select wachtwoord_hash from accounts where id = $1', [a.id]);
  if (!(await checkWachtwoord(oud, acc.wachtwoord_hash))) return { fouten: { oud: 'Je huidige wachtwoord klopt niet.' } };
  if (nieuw.length < 8) return { fouten: { nieuw: 'Kies een wachtwoord van minimaal 8 tekens.' } };
  await q('update accounts set wachtwoord_hash = $2 where id = $1', [a.id, await hashWachtwoord(nieuw)]);
  return { ok: true, melding: 'Je wachtwoord is gewijzigd.' };
}
export async function verwijderAccount(_: FormState, fd: FormData): Promise<FormState> {
  const a = await vereis();
  if (str(fd.get('bevestig')).toUpperCase() !== 'VERWIJDER') return { fouten: { bevestig: 'Typ VERWIJDER om te bevestigen.' } };
  const pw = String(fd.get('wachtwoord') || '');
  const acc = await one('select wachtwoord_hash from accounts where id = $1', [a.id]);
  if (!(await checkWachtwoord(pw, acc.wachtwoord_hash))) return { fouten: { wachtwoord: 'Je wachtwoord klopt niet.' } };
  await beeindigSessie();
  await verwijderAccountVolledig(a.id, 'zelf');
  redirect('/?verwijderd=1');
}
