/**
 * V16 — CV-upload van het freelancer-formulier.
 * Ontvangt het cv (base64) en mailt het als bijlage naar info@holland-recruitment.nl
 * via dezelfde Strato-SMTP als de bevestigingsmail (SMTP_USER_INFO / SMTP_PASS_INFO).
 * Het cv wordt NIET opgeslagen op de server: alleen doorgestuurd per mail.
 *
 * Beveiliging: alleen vanaf holland-recruitment.nl (en onze Vercel-previews), max 3 MB,
 * alleen PDF/DOC/DOCX (extensie én bestandshandtekening), honeypot, max 3 per IP per 10 min.
 */
const nodemailer = require('nodemailer');
const { sheet, validId } = require('./_lib.js');

const ALLOWED = ['https://www.holland-recruitment.nl', 'https://holland-recruitment.nl'];
const PREVIEW = /^https:\/\/holland-recruitment-website-[a-z0-9-]+-can-s-projects8\.vercel\.app$/;
const MAX = 3 * 1024 * 1024;
const TYPES = {
  pdf: { mime: 'application/pdf', sig: (b) => b.slice(0, 4).toString('latin1') === '%PDF' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sig: (b) => b[0] === 0x50 && b[1] === 0x4b },
  doc: { mime: 'application/msword', sig: (b) => b.slice(0, 4).toString('hex') === 'd0cf11e0' },
};
const hits = new Map();
const clean = (s, n = 120) => String(s == null ? '' : s).replace(/[\r\n<>]/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const okOrigin = ALLOWED.includes(origin) || PREVIEW.test(origin);
  if (okOrigin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!okOrigin) return res.status(403).json({ ok: false, error: 'origin' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  if (body.botcheck) return res.status(200).json({ ok: true });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 3) return res.status(429).json({ ok: false, error: 'rate' });
  list.push(now); hits.set(ip, list);

  const name = clean(body.filename, 100).replace(/[^\w.\- ]/g, '_') || 'cv';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const type = TYPES[ext];
  if (!type) return res.status(400).json({ ok: false, error: 'type' });
  let buf;
  try { buf = Buffer.from(String(body.data || ''), 'base64'); } catch (e) { return res.status(400).json({ ok: false, error: 'data' }); }
  if (!buf.length || buf.length > MAX) return res.status(400).json({ ok: false, error: 'size' });
  if (!type.sig(buf)) return res.status(400).json({ ok: false, error: 'type' });

  const user = String(process.env.SMTP_USER_INFO || '').trim();
  const pass = String(process.env.SMTP_PASS_INFO || '').replace(/[\r\n]+$/g, '').trim();
  if (!/^[^@\s]+@holland-recruitment\.nl$/i.test(user) || !pass) return res.status(503).json({ ok: false, error: 'not-configured' });

  const naam = clean(body.naam), email = clean(body.email), titel = clean(body.titel), tel = clean(body.telefoon, 40), opdracht = clean(body.opdracht, 80);
  const safeName = `CV ${naam || 'freelancer'}.${ext}`.replace(/[^\w.\- ]/g, '_');
  const text = [
    'Nieuw cv via het aanmeldformulier op holland-recruitment.nl.',
    '',
    `Naam: ${naam}`, `E-mail: ${email}`, `Telefoon: ${tel}`, `Functietitel: ${titel}`,
    opdracht ? `Reactie op opdracht: ${opdracht}` : '',
    '',
    'De volledige aanmelding staat in de aparte mail "Freelancer-aanmelding".',
  ].filter((l) => l !== null).join('\n');

  try {
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.strato.com', port: Number(process.env.SMTP_PORT || 465), secure: true, auth: { user, pass } });
    await t.sendMail({
      from: `"Website — CV" <${user}>`, to: user, replyTo: /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email) ? email : undefined,
      subject: `CV: ${naam || 'onbekend'}${titel ? ' — ' + titel : ''}`,
      text, attachments: [{ filename: safeName, content: buf, contentType: type.mime }],
    });
    // V17: ook opslaan in Google Drive + link in de Sheet (best effort)
    if (validId(body.id)) {
      try { await sheet('cv', { id: body.id, filename: safeName, mime: type.mime, data: buf.toString('base64') }); } catch (e) { console.error('cv-sheet-fout', e && e.message); }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('cv-fout', e && e.code, e && e.message); // nooit inhoud van gegevens loggen
    return res.status(502).json({ ok: false, error: 'send' });
  }
};
