/** V17 — aanvulpagina: GET = welke velden ontbreken nog, POST = aanvullen (incl. cv). Alleen met geldige, ondertekende link. */
const { cors, body, checkToken, sheet, checkCv } = require('./_lib.js');

module.exports = async (req, res) => {
  const ok = cors(req, res);
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return res.status(204).end(); }
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const { id, t } = req.query || {};
      if (!checkToken(id, t)) return res.status(403).json({ ok: false, error: 'link' });
      const r = await sheet('get', { id });
      if (!r.ok) return res.status(404).json({ ok: false, error: r.error });
      return res.status(200).json({ ok: true, voornaam: r.voornaam, missing: r.missing });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false });
    if (!ok) return res.status(403).json({ ok: false, error: 'origin' });
    const b = body(req);
    if (!checkToken(b.id, b.t)) return res.status(403).json({ ok: false, error: 'link' });
    if (b.cv && b.cv.data) {
      const c = checkCv(b.cv.filename, b.cv.data);
      if (c.error) return res.status(400).json({ ok: false, error: 'cv-' + c.error });
      const rc = await sheet('cv', { id: b.id, filename: `CV ${b.id}.${c.ext}`, mime: c.mime, data: c.buf.toString('base64') });
      if (!rc.ok) return res.status(502).json({ ok: false, error: 'cv-opslaan' });
    }
    const clean = (s, n) => String(s || '').replace(/[\r\n<>]/g, ' ').trim().slice(0, n);
    const d = b.data || {};
    const data = { uurtarief: clean(d.uurtarief, 20), kvk: clean(d.kvk, 12), btw: clean(d.btw, 20), beschikbaarheid: clean(d.beschikbaarheid, 40), uren_per_week: clean(d.uren_per_week, 20), cv_link: /^https?:\/\//.test(d.cv_link || '') ? clean(d.cv_link, 300) : '' };
    const r = await sheet('update', { id: b.id, data });
    return res.status(r.ok ? 200 : 502).json({ ok: !!r.ok, missing: r.missing || [] });
  } catch (e) {
    console.error('profiel-fout', e && e.message);
    return res.status(502).json({ ok: false, error: 'server' });
  }
};
