/**
 * V20 — reserve-melding naar info@/sales@ via eigen Strato-SMTP.
 * Wordt alleen aangeroepen als Web3Forms faalt (spamfilter, storing, adblocker), zodat er nooit een aanmelding verloren gaat.
 */
const nodemailer = require('nodemailer');
const { cors, body, validId } = require('./_lib.js');
const hits = new Map();
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LABEL = { freelancer: 'Freelancer-aanmelding', assignment: 'Opdracht-aanvraag', contact: 'Contactbericht' };

module.exports = async (req, res) => {
  const ok = cors(req, res);
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!ok) return res.status(403).json({ ok: false, error: 'origin' });
  const b = body(req);
  if (!LABEL[b.kind] || !validId(b.id)) return res.status(400).json({ ok: false, error: 'input' });
  const d = b.data || {};
  if (d.botcheck) return res.status(200).json({ ok: true });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 600000);
  if (list.length >= 6) return res.status(429).json({ ok: false, error: 'rate' });
  list.push(now); hits.set(ip, list);

  const sales = b.kind === 'assignment' || (b.kind === 'contact' && /^Opdrachtgever/.test(d.onderwerp || ''));
  const U = sales ? 'SALES' : 'INFO';
  const user = String(process.env['SMTP_USER_' + U] || '').trim();
  const pass = String(process.env['SMTP_PASS_' + U] || '').replace(/[\r\n]+$/g, '').trim();
  if (!/^[^@\s]+@holland-recruitment\.nl$/i.test(user) || !pass) return res.status(503).json({ ok: false, error: 'not-configured' });

  delete d.privacy; delete d.botcheck;
  const rows = Object.keys(d).map((k) => `<tr><td style="padding:4px 12px 4px 0;color:#5B5F7A;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;color:#15183A">${esc(Array.isArray(d[k]) ? d[k].join(', ') : d[k]).replace(/\n/g, '<br>')}</td></tr>`).join('');
  const naam = d.naam || d.contactpersoon || '';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px"><p><b>${LABEL[b.kind]} via de website</b> (reserve-melding: het standaard formulier-mailtje kwam niet door; de aanmelding staat ook in de Google Sheet, ID ${esc(b.id)}).</p><table>${rows}</table></div>`;
  const reply = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,}$/i.test(String(d.email || '')) ? d.email : undefined;
  try {
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.strato.com', port: Number(process.env.SMTP_PORT || 465), secure: true, auth: { user, pass } });
    await t.sendMail({ from: `"Website Holland Recruitment" <${user}>`, to: user, replyTo: reply, subject: `${LABEL[b.kind]}: ${naam}${d.bedrijfsnaam ? ' — ' + d.bedrijfsnaam : ''}${d.titel ? ' — ' + d.titel : ''}`, html });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('melding-fout', U, e && e.code, e && e.message); // nooit inloggegevens loggen
    return res.status(502).json({ ok: false, error: 'send' });
  }
};
