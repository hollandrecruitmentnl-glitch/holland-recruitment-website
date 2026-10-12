import Link from 'next/link';
import { q, one } from '@/lib/db';
import { BRON_NAAM } from '@/lib/constants';
import { relatief } from '@/lib/util';

export const metadata = { title: 'Dashboard' };
export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { zoek = '' } = await searchParams;
  const c = await one(`select
    (select count(*) from freelancers f join accounts a on a.id = f.id where a.status='actief')::int as freelancers,
    (select count(*) from bedrijven where status='actief')::int as bedrijven,
    (select count(*) from opdrachten where status='live')::int as live,
    (select count(*) from opdrachten where status='live' and bron='direct')::int as direct,
    (select count(*) from reacties)::int as reacties,
    (select count(*) from gesprekken where statuslabel='samenwerken')::int as samenwerkingen,
    (select count(*) from opdrachten where status='in_controle')::int as controle,
    (select count(*) from meldingen where status='open')::int as meldingen,
    (select count(*) from bemiddeling where status='nieuw')::int as bemiddeling`);
  const bronnen = await q(`select bron, count(*)::int as n from opdrachten where status='live' group by bron order by n desc`);
  const nieuweBedrijven = await q(`select id, naam, plaats, aangemaakt, kvk_controle_resultaat from bedrijven order by aangemaakt desc limit 6`);
  const log = await q(`select l.*, a.voornaam from logboek l left join accounts a on a.id = l.actor_id order by l.aangemaakt desc limit 12`);
  let res: any[] = [];
  if (zoek.trim().length >= 2) {
    const z = `%${zoek.trim().toLowerCase()}%`;
    res = await q(`(select 'freelancer' as t, a.id, a.voornaam || ' ' || a.achternaam as naam, a.email as sub from accounts a where a.rol='freelancer' and (lower(a.voornaam || ' ' || a.achternaam) like $1 or lower(a.email) like $1) limit 8)
      union all (select 'bedrijf', b.id, b.naam, b.kvk from bedrijven b where lower(b.naam) like $1 or b.kvk like $1 limit 8)
      union all (select 'bedrijf', bl.bedrijf_id, a.voornaam || ' ' || a.achternaam || ' (' || b.naam || ')', a.email from accounts a join bedrijf_leden bl on bl.account_id = a.id join bedrijven b on b.id = bl.bedrijf_id where lower(a.email) like $1 or lower(a.voornaam || ' ' || a.achternaam) like $1 limit 8)
      union all (select 'opdracht', o.id, o.titel, o.status from opdrachten o where lower(o.titel) like $1 and o.bron = 'direct' limit 8)`, [z]);
  }
  const Stat = ({ l, n, sub }: { l: string; n: number; sub?: string }) => <div className="p-stat"><span className="p-small p-muted">{l}</span><b>{n}</b>{sub && <span className="p-xs p-muted">{sub}</span>}</div>;
  return (
    <div className="p-stack" style={{ gap: 22 }}>
      <h1 className="p-h2">Dashboard</h1>
      <form action="/beheer" role="search" className="p-searchbar" style={{ gridTemplateColumns: '1fr auto' }}>
        <label className="sr-only" htmlFor="gz">Zoek op naam, e-mail, KvK of opdracht</label>
        <input id="gz" name="zoek" defaultValue={zoek} placeholder="Zoek op naam, e-mail, KvK of opdracht" /><button className="btn btn-blue">Zoek</button>
      </form>
      {zoek && <div className="p-card p-stack" style={{ gap: 8 }}><strong>{res.length} resultaten</strong>{res.map((r, i) => <Link key={i} className="p-link" href={r.t === 'opdracht' ? `/beheer/opdrachten?open=${r.id}` : `/beheer/${r.t === 'freelancer' ? 'freelancers' : 'bedrijven'}/${r.id}`}>{r.naam} <span className="p-muted p-small">· {r.t} · {r.sub}</span></Link>)}</div>}
      <div className="p-grid3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <Stat l="Freelancers" n={c.freelancers} /><Stat l="Actieve bedrijven" n={c.bedrijven} /><Stat l="Live opdrachten" n={c.live} sub={`${c.direct} direct · ${c.live - c.direct} extern`} /><Stat l="Reacties" n={c.reacties} /><Stat l="Gestarte samenwerkingen" n={c.samenwerkingen} />
      </div>
      <div className="p-grid2" style={{ alignItems: 'start' }}>
        <section className="p-card p-stack"><h2 className="p-h3">Vraagt aandacht</h2>
          <Link className="p-between" href="/beheer/opdrachten?status=in_controle"><span>Opdrachten controleren</span><span className={`p-status ${c.controle ? 'in_controle' : ''}`}>{c.controle}</span></Link>
          <Link className="p-between" href="/beheer/moderatie"><span>Open meldingen</span><span className={`p-status ${c.meldingen ? 'in_controle' : ''}`}>{c.meldingen}</span></Link>
          <Link className="p-between" href="/beheer/bemiddeling"><span>Nieuwe bemiddelingsaanvragen</span><span className={`p-status ${c.bemiddeling ? 'in_controle' : ''}`}>{c.bemiddeling}</span></Link>
        </section>
        <section className="p-card p-stack"><h2 className="p-h3">Live opdrachten per bron</h2>
          {bronnen.length ? bronnen.map((b: any) => <div key={b.bron} className="p-between"><span>{BRON_NAAM[b.bron]}</span><strong>{b.n}</strong></div>) : <p className="p-muted p-small">Nog geen live opdrachten.</p>}
          <Link className="p-link p-small" href="/beheer/feeds">Feeds beheren</Link>
        </section>
        <section className="p-card p-stack"><h2 className="p-h3">Nieuwe bedrijven</h2>
          {nieuweBedrijven.map((b: any) => <Link key={b.id} href={`/beheer/bedrijven/${b.id}`} className="p-between p-small"><span><strong>{b.naam}</strong> · {b.plaats}</span><span className="p-muted">{b.kvk_controle_resultaat === 'actief' ? 'KvK ✓' : 'KvK niet gecontroleerd'} · {relatief(b.aangemaakt)}</span></Link>)}
        </section>
        <section className="p-card p-stack"><h2 className="p-h3">Logboek</h2>
          {log.map((l: any) => <div key={l.id} className="p-small p-between"><span>{l.voornaam || 'Systeem'} · {l.actie.replace(/_/g, ' ')}</span><span className="p-muted">{relatief(l.aangemaakt)}</span></div>)}
        </section>
      </div>
    </div>
  );
}
