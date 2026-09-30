/**
 * V17 — gedeelde helpers voor de aanmeldingen-koppeling (Google Sheets via Apps Script).
 * Bestanden met "_" in /api zijn geen endpoints op Vercel.
 *
 * Env (Vercel, Production):
 *   SHEET_WEBHOOK_URL  — web-app-URL van het Apps Script bij de Sheet
 *   SHEET_SECRET       — gedeelde geheime sleutel (ook in Apps Script als HR_SECRET); tekent ook de aanvul-links
 *   SMTP_USER_INFO / SMTP_PASS_INFO — voor aanvulmails (vanaf info@)
 *   CRON_SECRET        — beveiligt de dagelijkse herinneringsrun
 */
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const SITE = 'https://www.holland-recruitment.nl';
const ALLOWED = ['https://www.holland-recruitment.nl', 'https://holland-recruitment.nl'];
const PREVIEW = /^https:\/\/holland-recruitment-website-[a-z0-9-]+-can-s-projects8\.vercel\.app$/;

function cors(req, res) {
  const origin = req.headers.origin || '';
  const ok = ALLOWED.includes(origin) || PREVIEW.test(origin);
  if (ok) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  return ok;
}

function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b || {};
}

const validId = (id) => /^[a-z0-9-]{12,40}$/i.test(String(id || ''));

function secret() { return String(process.env.SHEET_SECRET || '').trim(); }

function token(id) {
  return crypto.createHmac('sha256', secret()).update('profiel:' + id).digest('hex').slice(0, 32);
}

function checkToken(id, t) {
  if (!secret() || !validId(id) || typeof t !== 'string' || t.length !== 32) return false;
  const a = Buffer.from(token(id)), b = Buffer.from(t);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sheet(action, payload) {
  const url = String(process.env.SHEET_WEBHOOK_URL || '').trim();
  if (!url || !secret()) return { ok: false, error: 'not-configured' };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ secret: secret(), action }, payload)), redirect: 'follow' });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch (e) { return { ok: false, error: 'bad-response' }; }
}

/* ---- cv-controle (gedeeld door /api/cv en /api/profiel) ---- */
const MAX = 3 * 1024 * 1024;
const TYPES = {
  pdf: { mime: 'application/pdf', sig: (b) => b.slice(0, 4).toString('latin1') === '%PDF' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sig: (b) => b[0] === 0x50 && b[1] === 0x4b },
  doc: { mime: 'application/msword', sig: (b) => b.slice(0, 4).toString('hex') === 'd0cf11e0' },
};
function checkCv(filename, data) {
  const name = String(filename || '').slice(0, 100).replace(/[^\w.\- ]/g, '_') || 'cv';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const type = TYPES[ext];
  if (!type) return { error: 'type' };
  let buf;
  try { buf = Buffer.from(String(data || ''), 'base64'); } catch (e) { return { error: 'data' }; }
  if (!buf.length || buf.length > MAX) return { error: 'size' };
  if (!type.sig(buf)) return { error: 'type' };
  return { buf, ext, mime: type.mime, name };
}

/* ---- mail (zelfde goedgekeurde huisstijl als de bevestigingsmail) ---- */
const LABELS = { uurtarief: 'je gewenste uurtarief', kvk: 'je KvK-nummer', cv: 'je cv', beschikbaarheid: 'vanaf wanneer je beschikbaar bent', uren_per_week: 'hoeveel uur per week je beschikbaar bent' };

async function sendAanvulMail({ id, email, voornaam, missing, herinnering }) {
  const user = String(process.env.SMTP_USER_INFO || '').trim();
  const pass = String(process.env.SMTP_PASS_INFO || '').replace(/[\r\n]+$/g, '').trim();
  if (!/^[^@\s]+@holland-recruitment\.nl$/i.test(user) || !pass) return false;
  if (!/^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,}$/i.test(String(email || ''))) return false;
  const { layout } = require('./bevestiging.js');
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const link = `${SITE}/freelancers/aanvullen?id=${encodeURIComponent(id)}&t=${token(id)}`;
  const items = missing.map((k) => LABELS[k]).filter(Boolean);
  const html = layout({
    from: 'info@holland-recruitment.nl',
    preheader: herinnering ? 'Nog even ter herinnering: je profiel is bijna compleet.' : 'Je profiel is bijna compleet — nog een paar gegevens.',
    title: `${herinnering ? 'Nog even ter herinnering' : 'Je profiel is bijna compleet'}${voornaam ? ', ' + esc(voornaam) : ''}`,
    intro: 'Bedankt voor je aanmelding. Om je aan passende opdrachten te kunnen koppelen, missen we nog een paar gegevens. Aanvullen kost je ongeveer een minuut.',
    rows: items.map((l, i) => `<tr><td style="padding:6px 0;color:#5B5F7A;font-size:14px;width:28px;vertical-align:top">${i + 1}.</td><td style="padding:6px 0;color:#15183A;font-size:14px;font-weight:600">${esc(l.charAt(0).toUpperCase() + l.slice(1))}</td></tr>`).join(''),
    steps: ['Klik op de knop hieronder — je ziet alleen de velden die nog ontbreken.', 'Vul ze in en verstuur. Je gegevens worden direct aan je profiel toegevoegd.', 'Past er een opdracht bij je? Dan nemen we contact met je op.'],
    ctaText: 'Profiel aanvullen', ctaUrl: link,
    signoff: 'Vragen? Beantwoord gerust deze e-mail.<br><br>Hartelijke groet,',
  }).replace('Wat we hebben ontvangen', 'Wat we nog missen');
  const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.strato.com', port: Number(process.env.SMTP_PORT || 465), secure: true, auth: { user, pass } });
  await t.sendMail({ from: `"Holland Recruitment" <${user}>`, to: email, replyTo: user,
    subject: herinnering ? 'Herinnering: maak je profiel compleet — Holland Recruitment' : 'Je profiel is bijna compleet — Holland Recruitment', html });
  return true;
}

module.exports = { cors, body, validId, token, checkToken, sheet, checkCv, sendAanvulMail, SITE };
// build 2026-09-30
