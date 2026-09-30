/** V17 — sla een aanmelding (freelancer / opdrachtgever / contact) op als rij in de Google Sheet. */
const { cors, body, validId, sheet } = require('./_lib.js');
const hits = new Map();

module.exports = async (req, res) => {
  const ok = cors(req, res);
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!ok) return res.status(403).json({ ok: false, error: 'origin' });
  const b = body(req);
  if (!['freelancer', 'assignment', 'contact'].includes(b.kind) || !validId(b.id)) return res.status(400).json({ ok: false, error: 'input' });
  const d = b.data || {};
  if (d.botcheck) return res.status(200).json({ ok: true });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 600000);
  if (list.length >= 6) return res.status(429).json({ ok: false, error: 'rate' });
  list.push(now); hits.set(ip, list);
  delete d.privacy; delete d.botcheck;
  try {
    const r = await sheet('lead', { kind: b.kind, id: b.id, data: d });
    return res.status(r.ok ? 200 : 502).json({ ok: !!r.ok, error: r.ok ? undefined : r.error });
  } catch (e) {
    console.error('lead-fout', e && e.message);
    return res.status(502).json({ ok: false, error: 'sheet' });
  }
};
