import 'server-only';
import { q, one } from './db';
import { verwijderen } from './storage';
import { logboek } from './log';

/**
 * Verwijdert een account met alle bijbehorende gegevens en bestanden (cv, foto, logo, bijlagen in gesprekken).
 * Database-rijen gaan via "on delete cascade"; bestanden in de opslag ruimen we hier zelf op.
 */
export async function verwijderAccountVolledig(accountId: string, reden: 'zelf' | 'inactief' | 'beheer'): Promise<void> {
  const a = await one<{ rol: string; bedrijf_id: string | null }>(
    `select a.rol, bl.bedrijf_id from accounts a left join bedrijf_leden bl on bl.account_id = a.id where a.id = $1`, [accountId]);
  if (!a || a.rol === 'beheer') return;
  const bestanden: (string | null)[] = [];
  if (a.rol === 'freelancer') {
    const f = await one('select cv_pad, foto_pad from freelancers where id = $1', [accountId]);
    bestanden.push(f?.cv_pad, f?.foto_pad);
    // Gesprekken van deze freelancer vervallen (cascade): bijlagen ook weg
    for (const r of await q(`select m.bijlage_pad from berichten m join gesprekken g on g.id = m.gesprek_id where g.freelancer_id = $1 and m.bijlage_pad is not null`, [accountId])) bestanden.push(r.bijlage_pad);
  }
  if (a.rol === 'bedrijf' && a.bedrijf_id) {
    const n = await one<{ n: number }>('select count(*)::int as n from bedrijf_leden where bedrijf_id = $1', [a.bedrijf_id]);
    if ((n?.n ?? 0) <= 1) {
      const b = await one('select logo_pad from bedrijven where id = $1', [a.bedrijf_id]);
      bestanden.push(b?.logo_pad);
      for (const r of await q(`select m.bijlage_pad from berichten m join gesprekken g on g.id = m.gesprek_id where g.bedrijf_id = $1 and m.bijlage_pad is not null`, [a.bedrijf_id])) bestanden.push(r.bijlage_pad);
      await q('delete from bedrijven where id = $1', [a.bedrijf_id]);
    }
  }
  for (const p of bestanden) if (p) await verwijderen(p).catch(() => {});
  await logboek(null, reden === 'inactief' ? 'account_verwijderd_inactief' : 'account_verwijderd', 'account', accountId, { rol: a.rol, reden });
  await q('delete from accounts where id = $1', [accountId]);
}
