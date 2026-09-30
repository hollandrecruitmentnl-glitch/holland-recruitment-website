/**
 * V17 — dagelijkse run (Vercel Cron, 10:00 NL): onvolledige freelancerprofielen.
 *  1) aangemeld ≥ 12 uur geleden en nog geen aanvulverzoek → aanvulverzoek sturen
 *  2) aanvulverzoek ≥ 3 dagen geleden en nog geen herinnering → één herinnering sturen
 * Daarna niets meer (geen spam). Alles wordt in de Sheet bijgehouden.
 */
const { sheet, sendAanvulMail } = require('./_lib.js');

const parse = (s) => { const d = new Date(String(s || '').replace(' ', 'T') + ':00+02:00'); return isNaN(d) ? null : d; };

module.exports = async (req, res) => {
  const cs = String(process.env.CRON_SECRET || '').trim();
  const auth = req.headers.authorization || '';
  if (!cs || auth !== `Bearer ${cs}`) return res.status(401).json({ ok: false });
  const r = await sheet('incomplete', {});
  if (!r.ok) return res.status(502).json({ ok: false, error: r.error });
  const now = Date.now(), done = { verzoek: 0, herinnering: 0, fout: 0 };
  for (const row of r.rows || []) {
    try {
      const aangemeld = parse(row.aangemeld), verzoek = parse(row.verzoek);
      if (!row.verzoek && aangemeld && now - aangemeld.getTime() >= 12 * 3600e3) {
        if (await sendAanvulMail({ ...row, herinnering: false })) { await sheet('mark', { id: row.id, what: 'verzoek' }); done.verzoek++; }
      } else if (row.verzoek && !row.herinnering && verzoek && now - verzoek.getTime() >= 3 * 86400e3) {
        if (await sendAanvulMail({ ...row, herinnering: true })) { await sheet('mark', { id: row.id, what: 'herinnering' }); done.herinnering++; }
      }
    } catch (e) { done.fout++; console.error('herinnering-fout', e && e.message); }
  }
  return res.status(200).json({ ok: true, ...done });
};
