import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { q, one, tx } from './db';
import { hashWachtwoord } from './auth';
import { googleToken, SCOPES } from './google';
import { opslaan } from './storage';
import { mails } from './emails';
import { SITE } from './mail';
import { kort, randomToken, sha256, slugify } from './util';
import { VAKGEBIEDEN, vakgebiedNaam } from './constants';
import { logboek } from './log';

/**
 * Freelancers uit de aanmeldingen-Sheet ("Holland Recruitment — Aanmeldingen", tabblad Freelancers)
 * klaarzetten op het platform. Het account staat op "uitgenodigd": onzichtbaar tot de freelancer zelf activeert.
 * Niet overgenomen: uurtarief (intern), KvK, btw, toelichting, notities.
 */
export const SHEET_TAB = 'Freelancers';
export const UITNODIGING_DAGEN = 14;

export type Aanmelding = {
  email: string; ids: string[]; naam: string; voornaam: string; achternaam: string; telefoon: string; woonplaats: string;
  functietitel: string; expertise: string; vakgebied: string | null; ervaring: number | null; cvBestand: string | null;
  beschikbaar: string; aangemeld: string; uren: number | null; werkvormen: string[]; skills: string[]; branches: string[]; talen: string[];
  overslaan: string | null;
};

// Website-expertises → vakgebieden van het platform
const EXPERTISE_NAAR_VAKGEBIED: [RegExp, string][] = [
  [/sales|business development/i, 'sales-accountmanagement'],
  [/marketing|digital/i, 'marketing-communicatie'],
  [/it\s*&\s*data|^it\b|software|data/i, 'it-software'],
  [/finance|financ/i, 'finance-control'],
  [/engineering|technical/i, 'engineering'],
  [/operations|project/i, 'projectmanagement'],
  [/petrochemie|industrie/i, 'techniek-onderhoud'],
  [/zorg|welzijn/i, 'zorg-welzijn'],
  [/onderwijs/i, 'onderwijs-training'],
  [/transport|logistiek/i, 'logistiek-supply-chain'],
];
export function naarVakgebied(expertise: string): string | null {
  const eerste = expertise.split(',').map(s => s.trim()).filter(s => s && !/^anders/i.test(s))[0] || '';
  for (const [re, slug] of EXPERTISE_NAAR_VAKGEBIED) if (re.test(eerste)) return VAKGEBIEDEN.some(v => v.slug === slug) ? slug : null;
  return null;
}
const lijst = (s: string, max = 20) => Array.from(new Set(s.split(/[,;\n]/).map(x => x.trim()).filter(x => x && x !== '—' && x.length <= 60))).slice(0, max);
function talen(s: string) {
  const delen = s.includes(',') ? s.split(',') : s.split(/\s+/);
  return Array.from(new Set(delen.map(x => x.trim()).filter(Boolean).map(x => x.replace(/^netherlands$/i, 'Nederlands').replace(/^english$/i, 'Engels'))
    .map(x => x[0].toUpperCase() + x.slice(1)))).slice(0, 10);
}
function werkvormen(s: string) {
  const w: string[] = [];
  if (/locatie|on.?site/i.test(s)) w.push('op_locatie');
  if (/hybride|hybrid/i.test(s)) w.push('hybride');
  if (/remote/i.test(s)) w.push('remote');
  return w;
}
const getal = (s: string) => { const m = s.match(/\d+/g); return m ? Number(m[m.length - 1]) : null; };
const driveId = (url: string) => url.match(/\/d\/([A-Za-z0-9_-]{10,})/)?.[1] || url.match(/[?&]id=([A-Za-z0-9_-]{10,})/)?.[1] || null;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ruwe rijen uit de Sheet (eerste rij = kolomnamen). Lokaal: SHEET_FIXTURE (JSON-bestand met rijen). */
export async function leesSheetRijen(): Promise<string[][]> {
  if (process.env.SHEET_FIXTURE) return JSON.parse(await fs.readFile(process.env.SHEET_FIXTURE, 'utf8'));
  const id = process.env.SHEET_ID;
  if (!id) throw new Error('SHEET_ID is niet ingesteld.');
  const t = await googleToken([SCOPES.sheets, SCOPES.drive]);
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(SHEET_TAB)}!A1:AH1000?majorDimension=ROWS`, { headers: { Authorization: `Bearer ${t}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 403 || r.status === 404 ? 'Geen toegang tot de Sheet. Deel de Sheet (alleen lezen) met het serviceaccount.' : `Sheet lezen mislukt (${r.status}): ${j?.error?.message || ''}`);
  return j.values || [];
}

/** Rijen samenvoegen per e-mailadres (nieuwste aanmelding wint, lege velden aangevuld uit oudere). */
export function groepeer(rijen: string[][]): Aanmelding[] {
  const [kop, ...data] = rijen;
  if (!kop) return [];
  const k = (r: string[], naam: string) => String(r[kop.indexOf(naam)] ?? '').trim();
  const perEmail = new Map<string, string[][]>();
  for (const r of data) {
    const e = k(r, 'E-mail').toLowerCase();
    if (!e && !k(r, 'Naam')) continue;
    const sleutel = e || `zonder-email-${perEmail.size}`;
    perEmail.set(sleutel, [...(perEmail.get(sleutel) || []), r]);
  }
  const uit: Aanmelding[] = [];
  for (const [email, rs] of perEmail) {
    rs.sort((a, b) => k(b, 'Aangemeld op').localeCompare(k(a, 'Aangemeld op')));
    const v = (naam: string) => rs.map(r => k(r, naam)).find(x => x && x !== '—') || '';
    const naam = v('Naam').replace(/\s+/g, ' ');
    const [voornaam, ...rest] = naam.split(' ');
    const status = rs.map(r => k(r, 'Status')).join(' ') + ' ' + rs.map(r => k(r, 'Notities')).join(' ');
    let overslaan: string | null = null;
    if (!EMAIL.test(email)) overslaan = 'Geen geldig e-mailadres';
    else if (/afgemeld|niet benaderen|geen platform|verwijder/i.test(status)) overslaan = 'Afgemeld of niet benaderen (Status/Notities)';
    else if (!naam) overslaan = 'Geen naam';
    uit.push({
      email, ids: rs.map(r => k(r, 'ID')), naam, voornaam: voornaam || '', achternaam: rest.join(' '), telefoon: v('Telefoon').slice(0, 30),
      woonplaats: v('Woonplaats').slice(0, 60), functietitel: v('Functietitel').slice(0, 80), expertise: v('Expertise'), vakgebied: naarVakgebied(v('Expertise')),
      ervaring: (() => { const n = getal(v('Jaren ervaring')); return n != null && n <= 60 ? n : null; })(),
      cvBestand: v('CV (bestand)') || null, beschikbaar: v('Beschikbaar vanaf'), aangemeld: v('Aangemeld op'),
      uren: (() => { const n = getal(v('Uren per week')); return n && n <= 60 ? n : null; })(),
      werkvormen: werkvormen(v('Werkvorm')), skills: lijst(v('Skills')), branches: lijst(v('Branches'), 10), talen: talen(v('Talen')), overslaan,
    });
  }
  return uit;
}

/** Stand per aanmelding t.o.v. het platform. */
export async function metStand(lijstA: Aanmelding[]) {
  const emails = lijstA.map(a => a.email);
  const acc = await q<{ email: string; status: string; uitgenodigd_op: string | null; aangemaakt: string }>(
    `select lower(email) as email, status, uitgenodigd_op::text, aangemaakt::text from accounts where lower(email) = any($1)`, [emails]);
  const m = new Map(acc.map(a => [a.email, a]));
  return lijstA.map(a => {
    const x = m.get(a.email);
    const stand = a.overslaan ? 'overslaan' : !x ? 'nieuw' : x.status === 'uitgenodigd' ? (x.uitgenodigd_op ? 'uitgenodigd' : 'klaargezet') : 'op_platform';
    return { ...a, stand, uitgenodigdOp: x?.uitgenodigd_op || null };
  });
}

async function haalCv(bron: string): Promise<{ data: Buffer; naam: string; mime: string } | null> {
  if (bron.startsWith('fixture:') && process.env.SHEET_FIXTURE) {
    const f = path.join(path.dirname(process.env.SHEET_FIXTURE), bron.slice(8));
    return { data: await fs.readFile(f), naam: path.basename(f), mime: 'application/pdf' };
  }
  const id = driveId(bron);
  if (!id) return null;
  const t = await googleToken([SCOPES.sheets, SCOPES.drive]);
  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType,size&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${t}` } });
  if (!meta.ok) return null;
  const mj = await meta.json();
  if (Number(mj.size || 0) > 5 * 1024 * 1024) return null;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${t}` } });
  if (!r.ok) return null;
  return { data: Buffer.from(await r.arrayBuffer()), naam: String(mj.name || 'cv.pdf').slice(0, 100), mime: String(mj.mimeType || 'application/pdf') };
}
const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' };

function beschikbaarheid(a: Aanmelding): { soort: 'nu' | 'vanaf'; vanaf: string | null } {
  if (/maand|month/i.test(a.beschikbaar)) {
    const basis = new Date(a.aangemeld.slice(0, 10) || Date.now());
    const d = isNaN(basis.getTime()) ? new Date() : basis; d.setMonth(d.getMonth() + 1);
    if (d.getTime() > Date.now()) return { soort: 'vanaf', vanaf: d.toISOString().slice(0, 10) };
  }
  return { soort: 'nu', vanaf: null };
}

/** Zet nieuwe aanmeldingen klaar als onzichtbaar account (geen e-mail). */
export async function klaarzetten(door: string): Promise<{ klaargezet: number; cv: number; fouten: string[] }> {
  const lijstA = (await metStand(groepeer(await leesSheetRijen()))).filter(a => a.stand === 'nieuw');
  let klaargezet = 0, cv = 0; const fouten: string[] = [];
  for (const a of lijstA) {
    try {
      const hash = await hashWachtwoord(crypto.randomBytes(24).toString('hex')); // onbruikbaar wachtwoord tot activatie
      const b = beschikbaarheid(a);
      const id = await tx(async c => {
        const acc = (await c.query(`insert into accounts (rol, email, wachtwoord_hash, voornaam, achternaam, telefoon, status, bron) values ('freelancer',$1,$2,$3,$4,$5,'uitgenodigd',$6) returning id`,
          [a.email, hash, a.voornaam.slice(0, 60), a.achternaam.slice(0, 80), a.telefoon || null, `aanmelding:${a.ids.join(',')}`.slice(0, 200)])).rows[0].id as string;
        await c.query(`insert into freelancers (id, slug, functietitel, vakgebied, regio, jaren_ervaring, beschikbaarheid, beschikbaar_vanaf, uren_per_week, werkvormen, vaardigheden, sectoren, talen,
            zichtbaar_tarief, zichtbaar_cv, vindbaar_google) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'verborgen','na_contact',false)`,
          [acc, `${slugify(a.naam)}-${kort()}`, a.functietitel, a.vakgebied, a.woonplaats, a.ervaring, b.soort, b.vanaf, a.uren, a.werkvormen, a.skills, a.branches, a.talen]);
        return acc;
      });
      klaargezet++;
      if (a.cvBestand) {
        const f = await haalCv(a.cvBestand).catch(() => null);
        if (f) {
          const ext = EXT[f.mime] || (f.naam.split('.').pop() || 'pdf').toLowerCase();
          const pad = `cv/${id}/${randomToken().slice(0, 12)}.${ext}`;
          await opslaan(pad, f.data, f.mime);
          await q(`update freelancers set cv_pad = $1, cv_naam = $2 where id = $3`, [pad, f.naam, id]);
          cv++;
        } else fouten.push(`${a.email}: cv kon niet worden opgehaald`);
      }
    } catch (e: any) { fouten.push(`${a.email}: ${String(e?.message || e).slice(0, 120)}`); }
  }
  await logboek(door, 'aanmeldingen_klaargezet', 'account', undefined, { klaargezet, cv, fouten: fouten.length });
  return { klaargezet, cv, fouten };
}

/** Nieuwe uitnodigingslink (oude links vervallen). */
export async function uitnodigingsLink(accountId: string): Promise<string> {
  await q(`update tokens set gebruikt = now() where account_id = $1 and soort = 'uitnodiging' and gebruikt is null`, [accountId]);
  const t = randomToken();
  await q(`insert into tokens (token_hash, account_id, soort, verloopt) values ($1,$2,'uitnodiging', now() + make_interval(days => $3))`, [sha256(t), accountId, UITNODIGING_DAGEN]);
  return `${SITE}/uitnodiging/${t}`;
}

export async function stuurUitnodiging(accountId: string, alGeclaimd = false): Promise<boolean> {
  const a = await one(`select a.id, a.email, a.voornaam, f.functietitel, f.vakgebied, f.regio, f.cv_pad from accounts a join freelancers f on f.id = a.id where a.id = $1 and a.status = 'uitgenodigd'`, [accountId]);
  if (!a) return false;
  if (!alGeclaimd) await q(`update accounts set uitgenodigd_op = now() where id = $1`, [a.id]);
  await mails.uitnodiging(a.email, a.voornaam, await uitnodigingsLink(a.id), { functie: a.functietitel, vakgebied: vakgebiedNaam(a.vakgebied), regio: a.regio, cv: !!a.cv_pad });
  return true;
}

/** Eén herinnering per freelancer, 7 dagen na de uitnodiging, met een nieuwe link (14 dagen geldig).
 *  De bewaartermijn verandert niet: niet-geactiveerde profielen verdwijnen nog steeds 30 dagen na de eerste uitnodiging. */
export async function stuurHerinneringen(max = 40): Promise<number> {
  const rijen = await q<{ id: string; email: string; voornaam: string; functietitel: string; vakgebied: string; regio: string; cv_pad: string | null }>(
    `select a.id, a.email, a.voornaam, f.functietitel, f.vakgebied, f.regio, f.cv_pad from accounts a join freelancers f on f.id = a.id
     where a.status = 'uitgenodigd' and a.rol = 'freelancer' and a.uitgenodigd_op < now() - interval '7 days' and a.uitgenodigd_op > now() - interval '23 days'
       and not exists (select 1 from logboek l where l.object_id = a.id::text and l.actie = 'uitnodiging_herinnering')
     order by a.uitgenodigd_op limit $1`, [max]);
  let n = 0;
  for (const a of rijen) {
    await logboek(null, 'uitnodiging_herinnering', 'account', a.id); // eerst vastleggen: nooit twee herinneringen
    await mails.uitnodiging(a.email, a.voornaam, await uitnodigingsLink(a.id), { functie: a.functietitel, vakgebied: vakgebiedNaam(a.vakgebied), regio: a.regio, cv: !!a.cv_pad }, false, true);
    n++;
  }
  return n;
}

/** Verstuur uitnodigingen aan klaargezette accounts die nog geen uitnodiging kregen (max. per keer).
 *  Eerst "claimen" (uitgenodigd_op zetten), dan mailen: een dubbele klik stuurt niemand twee keer een mail. */
export async function verstuurUitnodigingen(door: string, max = 40): Promise<{ verstuurd: number; resterend: number }> {
  const geclaimd = await q<{ id: string }>(`update accounts set uitgenodigd_op = now() where id in (
      select id from accounts where status = 'uitgenodigd' and rol = 'freelancer' and uitgenodigd_op is null order by aangemaakt limit $1 for update skip locked)
    returning id`, [max]);
  let verstuurd = 0;
  for (const x of geclaimd) if (await stuurUitnodiging(x.id, true)) verstuurd++;
  const rest = await one<{ n: number }>(`select count(*)::int as n from accounts where status = 'uitgenodigd' and rol = 'freelancer' and uitgenodigd_op is null`);
  await logboek(door, 'uitnodigingen_verstuurd', 'account', undefined, { verstuurd });
  return { verstuurd, resterend: rest?.n ?? 0 };
}
