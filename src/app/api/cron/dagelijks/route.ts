import { NextRequest, NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { draaiFeeds } from '@/lib/feeds';
import { zoekFreelancers } from '@/lib/data/freelancers';
import { zoekOpdrachten } from '@/lib/data/opdrachten';
import { mails } from '@/lib/emails';
import { SITE } from '@/lib/mail';
import { limiet } from '@/lib/ratelimit';
import { synchroniseerIndexering } from '@/lib/indexering';
import { verwijderAccountVolledig } from '@/lib/accountverwijderen';
import { bewaakFeeds } from '@/lib/feedbewaking';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ fout: 'Niet toegestaan' }, { status: 401 });
  } else if (!/vercel-cron/i.test(req.headers.get('user-agent') || '') || !(await limiet('cron:dagelijks', 2, 3600))) {
    // Zonder CRON_SECRET: alleen de Vercel-cron, maximaal 2× per uur (de taak is idempotent).
    return NextResponse.json({ fout: 'Niet toegestaan' }, { status: 401 });
  }
  // 1. Opdrachten waarvan "reageren kan tot" voorbij is → gesloten
  await q(`update opdrachten set status = 'gesloten', bijgewerkt = now() where bron = 'direct' and status = 'live' and reageren_tot < current_date`);
  await q(`update reacties set status = 'opdracht_gesloten' where status in ('verstuurd','gelezen') and opdracht_id in (select id from opdrachten where status = 'gesloten')`);
  // 2. Externe feeds (+ direct controleren; bij problemen een mail naar info@)
  await draaiFeeds();
  const bewaking = await bewaakFeeds().catch((e: any) => ({ ok: false, gemaild: false, bevindingen: [{ ernst: 'fout', tekst: String(e?.message || e) }] }));
  // 3. Bewaarde zoekopdrachten
  const zoek = await q(`select z.*, a.email, a.meldingen, a.rol, a.id as acc from bewaarde_zoekopdrachten z join accounts a on a.id = z.account_id where z.email and a.status = 'actief' and z.laatst_verzonden < now() - interval '20 hours'`);
  let verstuurd = 0;
  for (const z of zoek) {
    if (z.meldingen?.bewaarde_zoekopdracht === false) continue;
    const f = z.filters || {};
    let items: string[] = []; let url = '';
    if (z.soort === 'opdrachten') {
      const r = await zoekOpdrachten({ q: f.q, locatie: f.locatie, vakgebied: f.vakgebied, werkvorm: f.werkvorm, bron: f.bron, sinds: z.laatst_verzonden, perPagina: 20 });
      items = r.items.map(o => `${o.titel}${o.locatie ? ' · ' + o.locatie : ''}`); url = `${SITE}/opdrachten`;
    } else {
      const r = await zoekFreelancers({ q: f.q, regio: f.regio, vakgebied: f.vakgebied, vaardigheid: f.vaardigheid, maxTarief: Number(f.max) || null, beschikbaar: f.beschikbaar, perPagina: 50 }, null);
      const sinds = new Date(z.laatst_verzonden).getTime();
      const nieuw = await q(`select id from accounts where aangemaakt > $1 and rol = 'freelancer'`, [new Date(sinds)]);
      const ids = new Set(nieuw.map((x: any) => x.id));
      items = r.items.filter(x => ids.has(x.id)).map(x => `${x.voornaam} ${x.achternaam} · ${x.functietitel}`); url = `${SITE}/freelancers-zoeken`;
    }
    if (items.length) { await mails.bewaardeZoekopdracht(z.email, z.naam, items.length, url, items); verstuurd++; }
    await q(`update bewaarde_zoekopdrachten set laatst_verzonden = now() where id = $1`, [z.id]);
  }
  // 4. Zoekmachines: nieuwe, gewijzigde en gesloten eigen opdrachten melden
  const index = await synchroniseerIndexering().catch((e: any) => ({ gemeld: 0, status: `fout: ${e?.message || e}` }));
  // 5. Bewaartermijnen (privacyverklaring): inactieve accounts en logboek
  let gewaarschuwd = 0, inactiefVerwijderd = 0;
  await q(`update accounts set inactief_gewaarschuwd = null where inactief_gewaarschuwd is not null and laatst_actief > inactief_gewaarschuwd`);
  for (const x of await q(`select id, email, voornaam from accounts where rol <> 'beheer' and status = 'actief' and inactief_gewaarschuwd is null
      and coalesce(laatst_actief, aangemaakt) < now() - interval '24 months' limit 50`)) {
    await mails.inactiefAccount(x.email, x.voornaam, `${SITE}/inloggen`);
    await q(`update accounts set inactief_gewaarschuwd = now() where id = $1`, [x.id]); gewaarschuwd++;
  }
  for (const x of await q(`select id from accounts where rol <> 'beheer' and inactief_gewaarschuwd < now() - interval '30 days'
      and coalesce(laatst_actief, aangemaakt) < inactief_gewaarschuwd limit 50`)) {
    await verwijderAccountVolledig(x.id, 'inactief'); inactiefVerwijderd++;
  }
  // Klaargezette profielen die niet zijn geactiveerd: 30 dagen na de uitnodiging (of 60 dagen na klaarzetten zonder uitnodiging) verwijderen
  for (const x of await q(`select id from accounts where status = 'uitgenodigd' and ((uitgenodigd_op is not null and uitgenodigd_op < now() - interval '30 days')
      or (uitgenodigd_op is null and aangemaakt < now() - interval '60 days')) limit 100`)) {
    await verwijderAccountVolledig(x.id, 'niet_geactiveerd'); inactiefVerwijderd++;
  }
  await q(`delete from logboek where aangemaakt < now() - interval '24 months'`);
  await q(`delete from sessies where verloopt < now()`);
  await q(`delete from tokens where verloopt < now() - interval '7 days'`);
  await q(`delete from rate_limits where venster_start < now() - interval '2 days'`);
  return NextResponse.json({ ok: true, zoekopdrachtMails: verstuurd, indexering: index, gewaarschuwd, inactiefVerwijderd, bewaking });
}
