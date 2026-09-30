/**
 * V11 — Bevestigingsmail naar wie een formulier invult (huisstijl Holland Recruitment).
 *
 * Aangeroepen door /assets/site.js NA een geslaagde Web3Forms-verzending.
 *   opdrachtgever  → afzender sales@holland-recruitment.nl  (SMTP_USER_SALES / SMTP_PASS_SALES)
 *   freelancer     → afzender info@holland-recruitment.nl   (SMTP_USER_INFO  / SMTP_PASS_INFO)
 *   contact        → sales@ als onderwerp "Opdrachtgever…", anders info@
 *
 * Wachtwoorden staan ALLEEN als Environment Variables in Vercel (door Can ingevuld), nooit in code.
 * Misbruik-bescherming: alleen vanaf holland-recruitment.nl, vaste tekst (geen vrije HTML van
 * bezoekers), honeypot, max. 3 mails per IP per 10 min per instance.
 * Env vars door Can ingesteld op 27-09-2026 (SMTP_USER_/SMTP_PASS_ SALES en INFO).
 */
const nodemailer = require('nodemailer');

const ALLOWED = ['https://www.holland-recruitment.nl', 'https://holland-recruitment.nl'];
const CAL = 'https://cal.eu/holland-recruitment/30min';
const SITE = 'https://www.holland-recruitment.nl';
const C = { blue: '#3551E6', lime: '#D6F24E', ink: '#15183A', cream: '#FAF6EE', line: '#ECE5D6', muted: '#5B5F7A' };
const hits = new Map();

function esc(s) {
  return String(s == null ? '' : s).slice(0, 300)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function nlDate(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); return m ? `${m[3]}-${m[2]}-${m[1]}` : v; }
function first(name) { return esc(String(name || '').trim().split(/\s+/)[0] || ''); }
function row(label, value) {
  if (Array.isArray(value)) value = value.join(', ');
  if (!value) return '';
  return `<tr><td style="padding:6px 0;color:${C.muted};font-size:14px;width:150px;vertical-align:top">${esc(label)}</td>` +
         `<td style="padding:6px 0;color:${C.ink};font-size:14px;font-weight:600">${esc(value)}</td></tr>`;
}

function layout({ preheader, title, intro, rows, steps, ctaText, ctaUrl, signoff, from }) {
  const stepHtml = steps.map((s, i) =>
    `<tr><td style="padding:8px 0;vertical-align:top;width:34px"><div style="width:24px;height:24px;border-radius:7px;background:${i === steps.length - 1 ? C.lime : C.blue};color:${i === steps.length - 1 ? C.ink : '#fff'};font:700 13px/24px Arial,sans-serif;text-align:center">${i + 1}</div></td>` +
    `<td style="padding:8px 0;color:${C.ink};font-size:15px;line-height:1.5">${s}</td></tr>`).join('');
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
  <tr><td style="padding:0 8px 22px"><a href="${SITE}"><img src="${SITE}/email-logo.png" width="210" alt="Holland Recruitment" style="display:block;border:0;width:210px;height:auto"></a></td></tr>
  <tr><td style="background:#fff;border-radius:24px;border:1px solid ${C.line};overflow:hidden">
    <div style="height:6px;background:${C.blue}"></div>
    <div style="padding:34px 34px 30px">
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:${C.ink};font-family:Arial,Helvetica,sans-serif">${title}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${C.ink}">${intro}</p>
      ${rows ? `<div style="background:${C.cream};border-radius:16px;padding:16px 20px;margin:0 0 24px"><div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};font-weight:700;margin-bottom:6px">Wat we hebben ontvangen</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></div>` : ''}
      <div style="font-size:16px;font-weight:700;color:${C.ink};margin:0 0 6px">Wat gebeurt er nu?</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px">${stepHtml}</table>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${C.blue}">
        <a href="${ctaUrl}" style="display:inline-block;padding:14px 26px;color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:999px">${ctaText} &rarr;</a></td></tr></table>
      <p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:${C.ink}">${signoff}<br><b>Holland Recruitment</b></p>
    </div>
  </td></tr>
  <tr><td style="padding:22px 12px 0;font-size:12.5px;line-height:1.6;color:${C.muted}" align="center">
    <a href="mailto:${from}" style="color:${C.blue};text-decoration:none">${from}</a> · WhatsApp 085 124 9654 · <a href="${SITE}" style="color:${C.blue};text-decoration:none">holland-recruitment.nl</a><br>
    Holland Recruitment BV · Brielselaan 278, 3081 LR Rotterdam · KvK 96618914<br>
    Deze e-mail is verstuurd omdat met dit e-mailadres een formulier op holland-recruitment.nl is ingevuld.
  </td></tr>
</table></td></tr></table></body></html>`;
}

function build(kind, d) {
  if (kind === 'assignment') {
    return {
      team: 'sales',
      subject: 'We hebben uw aanvraag ontvangen — Holland Recruitment',
      html: layout({
        from: 'sales@holland-recruitment.nl',
        preheader: 'Bedankt voor uw aanvraag. We nemen binnen één werkdag contact met u op.',
        title: `Bedankt voor uw aanvraag${first(d.contactpersoon) ? ', ' + first(d.contactpersoon) : ''}`,
        intro: `We hebben uw aanvraag voor ${esc(d.bedrijfsnaam) || 'uw organisatie'} goed ontvangen. Een recruiter neemt <b>binnen één werkdag</b> contact met u op om de opdracht met u door te nemen.`,
        rows: row('Type professional', d.type_professional) + row('Expertise', d.expertise) + row('Startdatum', nlDate(d.startdatum)) + row('Locatie', d.locatie),
        steps: ['We bellen of mailen u voor een korte intake over de opdracht.', 'We selecteren en spreken passende professionals uit ons netwerk.', 'U ontvangt een beperkte selectie met toelichting en kiest zelf wie u spreekt.'],
        ctaText: 'Plan direct een kennismaking', ctaUrl: CAL,
        signoff: 'Heeft u in de tussentijd een vraag? Beantwoord gerust deze e-mail.<br><br>Met vriendelijke groet,',
      }),
    };
  }
  if (kind === 'freelancer') {
    return {
      team: 'info',
      subject: 'Bedankt voor je aanmelding — Holland Recruitment',
      html: layout({
        from: 'info@holland-recruitment.nl',
        preheader: 'Je aanmelding is binnen. We bekijken je profiel persoonlijk.',
        title: `Welkom${first(d.naam) ? ', ' + first(d.naam) : ''}!`,
        intro: 'Bedankt voor je aanmelding bij het netwerk van Holland Recruitment. We hebben je gegevens goed ontvangen en <b>bekijken elk profiel persoonlijk</b>.',
        rows: row('Functietitel', d.titel) + row('Expertise', d.expertise) + row('Beschikbaar', d.beschikbaarheid),
        steps: ['We bekijken je profiel en nemen contact op voor een kennismaking.', 'Past er een opdracht bij je expertise en beschikbaarheid? Dan bespreken we die eerst met jou.', 'Je wordt pas aan een opdrachtgever voorgesteld na jouw akkoord.'],
        ctaText: 'Lees hoe het werkt', ctaUrl: SITE + '/freelancers/hoe-werkt-het',
        signoff: 'Vragen of je cv alvast sturen? Beantwoord gerust deze e-mail.<br><br>Hartelijke groet,',
      }),
    };
  }
  // contact
  const sales = /^Opdrachtgever/.test(d.onderwerp || '');
  return {
    team: sales ? 'sales' : 'info',
    subject: sales ? 'We hebben uw bericht ontvangen — Holland Recruitment' : 'We hebben je bericht ontvangen — Holland Recruitment',
    html: layout({
      from: sales ? 'sales@holland-recruitment.nl' : 'info@holland-recruitment.nl',
      preheader: sales ? 'Bedankt voor uw bericht. We reageren binnen één werkdag.' : 'Bedankt voor je bericht. We reageren binnen één werkdag.',
      title: `Bedankt voor ${sales ? 'uw' : 'je'} bericht${first(d.naam) ? ', ' + first(d.naam) : ''}`,
      intro: `We hebben ${sales ? 'uw' : 'je'} bericht goed ontvangen en reageren <b>binnen één werkdag</b>.`,
      rows: row('Onderwerp', d.onderwerp),
      steps: sales ? ['We lezen uw bericht en zoeken het juiste antwoord.', 'U hoort binnen één werkdag van ons, per mail of telefoon.'] : ['We lezen je bericht en zoeken het juiste antwoord.', 'Je hoort binnen één werkdag van ons, per mail of telefoon.'],
      ctaText: 'Liever direct een gesprek plannen', ctaUrl: CAL,
      signoff: 'Met vriendelijke groet,',
    }),
  };
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  if (ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!ALLOWED.includes(origin)) return res.status(403).json({ ok: false, error: 'origin' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const kind = body && body.kind;
  const d = (body && body.data) || {};
  if (!['assignment', 'freelancer', 'contact'].includes(kind)) return res.status(400).json({ ok: false, error: 'kind' });
  if (d.botcheck) return res.status(200).json({ ok: true });
  const to = String(d.email || '').trim();
  if (!/^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,}$/i.test(to)) return res.status(400).json({ ok: false, error: 'email' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  if (list.length >= 3) return res.status(429).json({ ok: false, error: 'rate' });
  list.push(now); hits.set(ip, list);

  const mail = build(kind, d);
  const U = mail.team === 'sales' ? 'SALES' : 'INFO';
  // trim: bij kopiëren/plakken in Vercel komen er soms spaties of een regeleinde mee
  const user = String(process.env['SMTP_USER_' + U] || '').trim();
  const pass = String(process.env['SMTP_PASS_' + U] || '').replace(/[\r\n]+$/g, '').trim();
  if (!user || !pass) return res.status(503).json({ ok: false, error: 'not-configured' });
  if (!/^[^@\s]+@holland-recruitment\.nl$/i.test(user)) { console.error('bevestiging-fout', U, 'SMTP_USER is geen @holland-recruitment.nl-adres'); return res.status(503).json({ ok: false, error: 'user-not-email' }); }

  try {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.strato.com', port: Number(process.env.SMTP_PORT || 465), secure: true,
      auth: { user, pass },
    });
    await t.sendMail({ from: `"Holland Recruitment" <${user}>`, to, replyTo: user, subject: mail.subject, html: mail.html });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('bevestiging-fout', U, 'passlen=' + pass.length, e && e.code, e && e.message); // NOOIT inhoud van user/pass loggen
    return res.status(502).json({ ok: false, error: 'send' });
  }
};

module.exports.build = build; // voor lokale test/preview
module.exports.layout = layout; // hergebruikt door _lib.js (aanvulmails in dezelfde huisstijl)
