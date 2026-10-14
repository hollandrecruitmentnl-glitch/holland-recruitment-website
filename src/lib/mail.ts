import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { esc } from './util';

export const SITE = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3100')).replace(/\/$/, '');
const C = { blue: '#3551E6', lime: '#D6F24E', ink: '#15183A', cream: '#FAF6EE', line: '#ECE5D6', muted: '#5B5F7A' };

type Team = 'info' | 'sales';
export type Mail = { aan: string; onderwerp: string; html: string; team?: Team; antwoordAan?: string };

export function layout(o: { preheader: string; titel: string; intro: string; blok?: { kop: string; rijen: [string, string][] }; stappen?: string[]; knop?: { tekst: string; url: string }; citaat?: string; klein?: string; afsluiting?: string; team?: Team; reden?: string; u?: boolean }) {
  const from = o.team === 'sales' ? 'sales@holland-recruitment.nl' : 'info@holland-recruitment.nl';
  const rijen = o.blok ? o.blok.rijen.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:6px 0;color:${C.muted};font-size:14px;width:150px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:${C.ink};font-size:14px;font-weight:600">${esc(v)}</td></tr>`).join('') : '';
  const stappen = (o.stappen || []).map((s, i, a) =>
    `<tr><td style="padding:8px 0;vertical-align:top;width:34px"><div style="width:24px;height:24px;border-radius:7px;background:${i === a.length - 1 ? C.lime : C.blue};color:${i === a.length - 1 ? C.ink : '#fff'};font:700 13px/24px Arial,sans-serif;text-align:center">${i + 1}</div></td><td style="padding:8px 0;color:${C.ink};font-size:15px;line-height:1.5">${s}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.titel)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 8px 22px"><a href="https://www.holland-recruitment.nl"><img src="https://www.holland-recruitment.nl/email-logo.png" width="210" alt="Holland Recruitment" style="display:block;border:0;width:210px;height:auto"></a></td></tr>
<tr><td style="background:#fff;border-radius:24px;border:1px solid ${C.line};overflow:hidden"><div style="height:6px;background:${C.blue}"></div><div style="padding:34px 34px 30px">
<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:${C.ink};font-family:Arial,Helvetica,sans-serif">${o.titel}</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${C.ink}">${o.intro}</p>
${rijen ? `<div style="background:${C.cream};border-radius:16px;padding:16px 20px;margin:0 0 24px"><div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};font-weight:700;margin-bottom:6px">${esc(o.blok!.kop)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rijen}</table></div>` : ''}
${o.citaat ? `<div style="border-left:4px solid ${C.blue};background:${C.cream};border-radius:0 14px 14px 0;padding:14px 18px;margin:0 0 24px;font-size:15px;line-height:1.6;color:${C.ink};font-style:italic">“${esc(o.citaat)}”</div>` : ''}
${stappen ? `<div style="font-size:16px;font-weight:700;color:${C.ink};margin:0 0 6px">Wat gebeurt er nu?</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px">${stappen}</table>` : ''}
${o.knop ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${C.blue}"><a href="${o.knop.url}" style="display:inline-block;padding:14px 26px;color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:999px">${esc(o.knop.tekst)}</a></td></tr></table>` : ''}
${o.klein ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:${C.muted}">${esc(o.klein)}</p>` : ''}
<p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:${C.ink}">${o.afsluiting || 'Met vriendelijke groet,'}<br><b>Holland Recruitment</b></p>
</div></td></tr>
<tr><td style="padding:22px 12px 0;font-size:12.5px;line-height:1.6;color:${C.muted}" align="center">
<a href="mailto:${from}" style="color:${C.blue};text-decoration:none">${from}</a> · WhatsApp 085 124 9654 · <a href="https://www.holland-recruitment.nl" style="color:${C.blue};text-decoration:none">holland-recruitment.nl</a><br>
Holland Recruitment BV · Brielselaan 278, 3081 LR Rotterdam · KvK 96618914<br>
${o.reden || (o.u ? 'U ontvangt deze e-mail omdat u een account heeft op het platform van Holland Recruitment.' : 'Je ontvangt deze e-mail omdat je een account hebt op het platform van Holland Recruitment.')} <a href="${SITE}/mijn/instellingen" style="color:${C.muted}">Meldingen instellen</a>
</td></tr></table></td></tr></table></body></html>`;
}

export async function verstuur(m: Mail) {
  const team = m.team || 'info';
  const user = team === 'sales' ? process.env.SMTP_USER_SALES : process.env.SMTP_USER_INFO;
  const pass = team === 'sales' ? process.env.SMTP_PASS_SALES : process.env.SMTP_PASS_INFO;
  if (!user || !pass) {
    // Lokaal / zonder SMTP: schrijf naar .mail/ zodat tests de inhoud kunnen lezen.
    const dir = path.join(process.cwd(), '.mail');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.json`), JSON.stringify(m));
    return;
  }
  const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.strato.com', port: Number(process.env.SMTP_PORT || 465), secure: true, auth: { user, pass } });
  await t.sendMail({ from: `Holland Recruitment <${user}>`, to: m.aan, subject: m.onderwerp, html: m.html, replyTo: m.antwoordAan });
}

/** Verstuur zonder de gebruikersactie te laten falen als mail niet lukt. */
export async function verstuurVeilig(m: Mail) {
  try { await verstuur(m); } catch (e) { console.error('mail mislukt', m.onderwerp, (e as Error).message); }
}
