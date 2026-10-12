import Link from 'next/link';
import { vereis } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { volledigheid } from '@/lib/data/freelancers';
import { zoekOpdrachten } from '@/lib/data/opdrachten';
import { gesprekkenLijst } from '@/lib/data/berichten';
import { Avatar, Beschikbaar, OpdrachtKaart } from '@/components/Kaarten';
import { OPDRACHT_STATUS, REACTIE_STATUS } from '@/lib/constants';
import { relatief } from '@/lib/util';
import BeschikbaarheidForm from '@/components/BeschikbaarheidForm';

export const metadata = { title: 'Mijn overzicht', robots: { index: false } };

function Berichten({ items }: { items: any[] }) {
  const nieuw = items.filter(g => g.ongelezen).slice(0, 4);
  return (
    <section className="p-card p-stack">
      <div className="p-between"><h2 className="p-h3">Nieuwe berichten</h2><Link className="p-linkbtn" href="/mijn/berichten">Alle berichten →</Link></div>
      {nieuw.length ? nieuw.map(g => (
        <Link key={g.id} href={`/mijn/berichten/${g.id}`} className="p-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <span className="p-dot nu" style={{ marginTop: 8 }} aria-label="Ongelezen" />
          <span style={{ minWidth: 0 }}><strong>{g.b_naam} · {g.f_voornaam} {g.f_achternaam}</strong><br /><span className="p-small p-muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.laatste_tekst || g.laatste_bijlage}</span></span>
        </Link>
      )) : <p className="p-muted p-small">Geen nieuwe berichten.</p>}
    </section>
  );
}

export default async function Overzicht() {
  const a = await vereis(['freelancer', 'bedrijf']);
  const gesprekken = await gesprekkenLijst(a);
  if (a.rol === 'freelancer') {
    const f = await one(`select *, beschikbaar_vanaf::text as beschikbaar_vanaf, beschikbaar_tot::text as beschikbaar_tot from freelancers where id = $1`, [a.id]);
    const werk = await one<{ n: number }>('select count(*)::int as n from werkervaring where freelancer_id = $1', [a.id]);
    const vol = volledigheid(f, werk?.n ?? 0);
    const passend = await zoekOpdrachten({ vakgebied: f.vakgebied ? [f.vakgebied] : undefined, perPagina: 3 });
    const reacties = await q(`select r.status, r.aangemaakt, o.titel, o.slug, b.naam as bedrijf from reacties r join opdrachten o on o.id = r.opdracht_id join bedrijven b on b.id = o.bedrijf_id where r.freelancer_id = $1 order by r.aangemaakt desc limit 4`, [a.id]);
    return (
      <div className="p-wrap" style={{ padding: '28px 26px 56px' }}>
        <div className="p-between" style={{ marginBottom: 22 }}>
          <h1 className="p-h2">Welkom terug, {a.voornaam}.</h1>
          <Link className="btn btn-blue" href="/opdrachten">Bekijk opdrachten</Link>
        </div>
        <div className="p-grid2" style={{ alignItems: 'start', gap: 18 }}>
          <div className="p-stack" style={{ gap: 18 }}>
            <section className="p-card p-stack">
              <div className="p-between"><h2 className="p-h3">Je profiel is {vol.pct}% compleet</h2><Link className="p-linkbtn" href={`/freelancer/${a.freelancer_slug}`}>Bekijk profiel</Link></div>
              <div className="p-progress" role="progressbar" aria-valuenow={vol.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profielvolledigheid"><span style={{ width: `${vol.pct}%` }} /></div>
              {vol.volgende ? <p className="p-small">Volgende stap: <Link className="p-link" href="/mijn/profiel">{vol.volgende}</Link></p> : <p className="p-small">Je profiel is compleet. Houd je beschikbaarheid actueel.</p>}
            </section>
            <section className="p-card p-stack">
              <div className="p-between"><h2 className="p-h3">Beschikbaarheid</h2><Beschikbaar f={f} /></div>
              <BeschikbaarheidForm f={f} />
            </section>
            <section className="p-card p-stack">
              <div className="p-between"><h2 className="p-h3">Mijn reacties</h2><Link className="p-linkbtn" href="/mijn/reacties">Alle reacties →</Link></div>
              {reacties.length ? reacties.map((r: any) => <div key={r.slug} className="p-between p-small"><span><Link className="p-link" href={`/opdrachten/${r.slug}`}>{r.titel}</Link> · {r.bedrijf}</span><span className={`p-status ${r.status}`}>{REACTIE_STATUS[r.status]}</span></div>) : <p className="p-muted p-small">Je hebt nog niet gereageerd op een opdracht.</p>}
            </section>
          </div>
          <div className="p-stack" style={{ gap: 18 }}>
            <Berichten items={gesprekken} />
            <section className="p-stack">
              <div className="p-between"><h2 className="p-h3">Passende opdrachten</h2><Link className="p-linkbtn" href={`/opdrachten${f.vakgebied ? `?vakgebied=${f.vakgebied}` : ''}`}>Meer →</Link></div>
              {passend.items.length ? passend.items.map(o => <OpdrachtKaart key={o.id} o={o} />) : <p className="p-muted p-small">Er zijn nu geen open opdrachten in je vakgebied. We tonen ze hier zodra ze er zijn.</p>}
            </section>
          </div>
        </div>
      </div>
    );
  }
  const actief = await q(`select o.id, o.titel, o.slug, o.status, o.reageren_tot::text, (select count(*) from reacties r where r.opdracht_id = o.id)::int as reacties,
      (select count(*) from reacties r where r.opdracht_id = o.id and r.status = 'verstuurd')::int as nieuw
    from opdrachten o where o.bedrijf_id = $1 and o.status in ('concept','in_controle','live','afgewezen') order by o.bijgewerkt desc limit 6`, [a.bedrijf_id]);
  const recent = await q(`select f.id, f.slug, f.functietitel, f.foto_pad, ac.voornaam, ac.achternaam from recent_bekeken rb join freelancers f on f.id = rb.freelancer_id join accounts ac on ac.id = f.id where rb.account_id = $1 and ac.status = 'actief' order by rb.op desc limit 5`, [a.id]);
  const nieuweReacties = actief.reduce((s: number, o: any) => s + o.nieuw, 0);
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 56px' }}>
      <h1 className="p-h2" style={{ marginBottom: 18 }}>Welkom bij Holland Recruitment, {a.bedrijf_naam}</h1>
      <div className="p-grid2" style={{ marginBottom: 22 }}>
        <Link href="/freelancers-zoeken" className="p-card-link" style={{ padding: 22 }}><strong className="p-h3">Zoek een freelancer</strong><span className="p-muted p-small">Filter op vakgebied, vaardigheden, tarief en beschikbaarheid.</span><span className="btn btn-blue btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }}>Zoek freelancers</span></Link>
        <Link href="/mijn/opdrachten/nieuw" className="p-card-link" style={{ padding: 22 }}><strong className="p-h3">Plaats een opdracht</strong><span className="p-muted p-small">Freelancers reageren direct. Of laat ons bemiddelen.</span><span className="btn btn-blue btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }}>Plaats een opdracht</span></Link>
      </div>
      <div className="p-grid2" style={{ alignItems: 'start', gap: 18 }}>
        <section className="p-card p-stack">
          <div className="p-between"><h2 className="p-h3">Actieve opdrachten</h2><Link className="p-linkbtn" href="/mijn/opdrachten">Alle opdrachten →</Link></div>
          {nieuweReacties > 0 && <p className="p-ok p-small"><strong>{nieuweReacties} nieuwe {nieuweReacties === 1 ? 'reactie' : 'reacties'}</strong> op je opdrachten.</p>}
          {actief.length ? actief.map((o: any) => (
            <div key={o.id} className="p-between p-small"><Link className="p-link" href={`/mijn/opdrachten/${o.id}`}>{o.titel}</Link><span className="p-row" style={{ gap: 8 }}><span>{o.reacties} {o.reacties === 1 ? 'reactie' : 'reacties'}</span><span className={`p-status ${o.status}`}>{OPDRACHT_STATUS[o.status]}</span></span></div>
          )) : <p className="p-muted p-small">Je hebt nog geen opdrachten. <Link className="p-link" href="/mijn/opdrachten/nieuw">Plaats je eerste opdracht</Link>.</p>}
        </section>
        <div className="p-stack" style={{ gap: 18 }}>
          <Berichten items={gesprekken} />
          <section className="p-card p-stack">
            <h2 className="p-h3">Recent bekeken</h2>
            {recent.length ? recent.map((f: any) => <Link key={f.id} href={`/freelancer/${f.slug}`} className="p-row" style={{ flexWrap: 'nowrap' }}><Avatar id={f.id} foto={f.foto_pad} voornaam={f.voornaam} achternaam={f.achternaam} /><span><strong>{f.voornaam} {f.achternaam}</strong><br /><span className="p-small p-muted">{f.functietitel}</span></span></Link>) : <p className="p-muted p-small">Profielen die je bekijkt, zie je hier terug.</p>}
          </section>
          <section className="p-card p-small p-stack" style={{ gap: 6 }}>
            <strong>Geen tijd om zelf te zoeken?</strong><span className="p-muted">Laat Holland Recruitment bemiddelen. Je betaalt alleen bij een plaatsing.</span>
            <Link className="p-link" href="/bemiddeling">Vraag bemiddeling aan</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
