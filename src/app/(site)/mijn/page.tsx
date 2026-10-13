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

type Actie = { kop: string; tekst: string; href: string; knop: string; tweede?: { href: string; knop: string } };

/** Eén duidelijke volgende stap, afhankelijk van waar iemand staat. */
function VolgendeStap({ a }: { a: Actie }) {
  return (
    <section className="p-next" aria-labelledby="volgende-stap">
      <div className="p-stack" style={{ gap: 4, minWidth: 0, flex: '1 1 320px' }}>
        <span className="p-eyebrow">Volgende stap</span>
        <h2 id="volgende-stap" className="p-h3">{a.kop}</h2>
        <p className="p-small p-muted" style={{ margin: 0 }}>{a.tekst}</p>
      </div>
      <div className="p-row" style={{ gap: 10 }}>
        {a.tweede && <Link className="btn btn-line btn-sm" href={a.tweede.href}>{a.tweede.knop}</Link>}
        <Link className="btn btn-blue btn-sm" href={a.href}>{a.knop}</Link>
      </div>
    </section>
  );
}

function Taken({ items }: { items: { klaar: boolean; label: string; href?: string }[] }) {
  return (
    <ul className="p-todo">
      {items.map(t => (
        <li key={t.label} className={t.klaar ? 'klaar' : ''}>
          <span className="ic" aria-hidden="true">{t.klaar ? '✓' : ''}</span>
          {t.klaar || !t.href ? <span>{t.label}<span className="sr-only">{t.klaar ? ' (gedaan)' : ' (nog te doen)'}</span></span> : <Link className="p-link" href={t.href}>{t.label}</Link>}
        </li>
      ))}
    </ul>
  );
}

function Gesprekken({ items, rol }: { items: any[]; rol: 'bedrijf' | 'freelancer' }) {
  const lijst = [...items].sort((x, y) => Number(y.ongelezen) - Number(x.ongelezen)).slice(0, 4);
  const n = items.filter(g => g.ongelezen).length;
  return (
    <section className="p-card p-stack">
      <div className="p-between"><h2 className="p-h3">Berichten{n > 0 && <span className="p-badge" style={{ marginLeft: 8 }}>{n}</span>}</h2>{items.length > 0 && <Link className="p-linkbtn" href="/mijn/berichten">Alle berichten →</Link>}</div>
      {lijst.length ? lijst.map(g => (
        <Link key={g.id} href={`/mijn/berichten/${g.id}`} className="p-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <span className={`p-dot ${g.ongelezen ? 'nu' : 'niet'}`} style={{ marginTop: 8 }} aria-label={g.ongelezen ? 'Ongelezen' : 'Gelezen'} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="p-between" style={{ gap: 8 }}><strong>{rol === 'bedrijf' ? `${g.f_voornaam} ${g.f_achternaam}` : g.b_naam}</strong><span className="p-xs p-muted">{relatief(g.laatste_bericht)}</span></span>
            {g.opdracht_titel && <span className="p-xs p-muted" style={{ display: 'block' }}>{g.opdracht_titel}</span>}
            <span className="p-small p-muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.laatste_tekst || g.laatste_bijlage}</span>
          </span>
        </Link>
      )) : (
        <div className="p-stack" style={{ gap: 8 }}>
          <p className="p-small p-muted" style={{ margin: 0 }}>{rol === 'bedrijf'
            ? 'Nog geen gesprekken. Een gesprek begint als een freelancer op je opdracht reageert, of als jij iemand een bericht stuurt vanaf zijn of haar profiel.'
            : 'Nog geen gesprekken. Een gesprek begint als je op een opdracht reageert, of als een bedrijf jou een bericht stuurt.'}</p>
          <Link className="p-link p-small" href={rol === 'bedrijf' ? '/freelancers-zoeken' : '/opdrachten'}>{rol === 'bedrijf' ? 'Zoek freelancers' : 'Bekijk opdrachten'}</Link>
        </div>
      )}
      {n > 0 && <p className="p-xs p-muted" style={{ margin: 0 }}>Tip: antwoord binnen een werkdag. Snel reageren maakt de beste indruk.</p>}
    </section>
  );
}

export default async function Overzicht() {
  const a = await vereis(['freelancer', 'bedrijf']);
  const gesprekken = await gesprekkenLijst(a);
  const ongelezen = gesprekken.filter((g: any) => g.ongelezen);

  if (a.rol === 'freelancer') {
    const f = await one(`select *, beschikbaar_vanaf::text as beschikbaar_vanaf, beschikbaar_tot::text as beschikbaar_tot from freelancers where id = $1`, [a.id]);
    const werk = await one<{ n: number }>('select count(*)::int as n from werkervaring where freelancer_id = $1', [a.id]);
    const vol = volledigheid(f, werk?.n ?? 0);
    const open = vol.stappen.filter(s => !s.klaar);
    const reacties = await q(`select r.status, r.aangemaakt, o.titel, o.slug, b.naam as bedrijf from reacties r join opdrachten o on o.id = r.opdracht_id join bedrijven b on b.id = o.bedrijf_id where r.freelancer_id = $1 order by r.aangemaakt desc limit 4`, [a.id]);
    const gereageerd = new Set((await q<{ opdracht_id: string }>('select opdracht_id from reacties where freelancer_id = $1', [a.id])).map(r => r.opdracht_id));
    const passendAlle = await zoekOpdrachten({ vakgebied: f.vakgebied ? [f.vakgebied] : undefined, perPagina: 8 });
    const passend = { items: passendAlle.items.filter(o => !gereageerd.has(o.id)).slice(0, 3) };
    const opdrachtenUrl = `/opdrachten${f.vakgebied ? `?vakgebied=${f.vakgebied}` : ''}`;

    const actie: Actie = ongelezen.length
      ? { kop: ongelezen.length === 1 ? `Nieuw bericht van ${ongelezen[0].b_naam}` : `${ongelezen.length} gesprekken met nieuwe berichten`, tekst: 'Een bedrijf wacht op je antwoord. Snel reageren maakt de beste indruk.', href: ongelezen.length === 1 ? `/mijn/berichten/${ongelezen[0].id}` : '/mijn/berichten', knop: 'Lees en beantwoord' }
      : vol.pct < 100
        ? { kop: `Maak je profiel compleet (nog ${open.length} ${open.length === 1 ? 'stap' : 'stappen'})`, tekst: `Bedrijven zoeken op vakgebied, vaardigheden, tarief en beschikbaarheid. Hoe vollediger je profiel, hoe beter ze je vinden. Volgende: ${open[0].taak.toLowerCase()}.`, href: '/mijn/profiel', knop: 'Profiel aanvullen' }
        : f.beschikbaarheid === 'niet'
          ? { kop: 'Je staat op ‘niet beschikbaar’', tekst: 'Bedrijven die filteren op beschikbaarheid zien je nu niet. Pas je beschikbaarheid hieronder aan zodra je weer ruimte hebt.', href: '#beschikbaarheid', knop: 'Beschikbaarheid aanpassen' }
          : reacties.length === 0
            ? { kop: 'Reageer op een passende opdracht', tekst: 'Je profiel staat klaar. Kies een opdracht die bij je past en stuur een korte, persoonlijke reactie.', href: opdrachtenUrl, knop: 'Bekijk opdrachten' }
            : { kop: 'Bekijk nieuwe opdrachten', tekst: 'Houd je beschikbaarheid actueel en reageer op opdrachten die bij je passen.', href: opdrachtenUrl, knop: 'Bekijk opdrachten', tweede: { href: '/mijn/reacties', knop: 'Mijn reacties' } };

    return (
      <div className="p-wrap" style={{ padding: '28px 26px 56px' }}>
        <div className="p-between" style={{ marginBottom: 18 }}>
          <div><h1 className="p-h2">Welkom terug, {a.voornaam}.</h1><p className="p-muted p-small" style={{ margin: '4px 0 0' }}>Account voor freelancers</p></div>
        </div>
        <VolgendeStap a={actie} />
        <div className="p-grid2" style={{ alignItems: 'start', gap: 18, marginTop: 18 }}>
          <div className="p-stack" style={{ gap: 18 }}>
            <section className="p-card p-stack">
              <div className="p-between"><h2 className="p-h3">{vol.pct < 100 ? `Je profiel is ${vol.pct}% compleet` : 'Je profiel is compleet'}</h2><Link className="p-linkbtn" href={`/freelancer/${a.freelancer_slug}`}>Bekijk zoals bedrijven het zien</Link></div>
              <div className="p-progress" role="progressbar" aria-valuenow={vol.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profielvolledigheid"><span style={{ width: `${vol.pct}%` }} /></div>
              {vol.pct < 100
                ? <><Taken items={open.slice(0, 4).map(s => ({ klaar: false, label: s.taak, href: '/mijn/profiel' }))} />{open.length > 4 && <p className="p-xs p-muted" style={{ margin: 0 }}>En nog {open.length - 4} {open.length - 4 === 1 ? 'stap' : 'stappen'}.</p>}<Link className="btn btn-line btn-sm" style={{ alignSelf: 'flex-start' }} href="/mijn/profiel">Profiel bewerken</Link></>
                : <p className="p-small p-muted" style={{ margin: 0 }}>Houd je beschikbaarheid en werkervaring actueel, zodat bedrijven zien wanneer je kunt starten.</p>}
            </section>
            <section className="p-card p-stack" id="beschikbaarheid">
              <div className="p-between"><h2 className="p-h3">Beschikbaarheid</h2><Beschikbaar f={f} /></div>
              <BeschikbaarheidForm f={f} />
            </section>
            <section className="p-card p-stack">
              <div className="p-between"><h2 className="p-h3">Mijn reacties</h2>{reacties.length > 0 && <Link className="p-linkbtn" href="/mijn/reacties">Alle reacties →</Link>}</div>
              {reacties.length ? reacties.map((r: any) => <div key={r.slug} className="p-between p-small"><span><Link className="p-link" href={`/opdrachten/${r.slug}`}>{r.titel}</Link> · {r.bedrijf}</span><span className={`p-status ${r.status}`}>{REACTIE_STATUS[r.status]}</span></div>)
                : <div className="p-stack" style={{ gap: 8 }}><p className="p-small p-muted" style={{ margin: 0 }}>Je hebt nog niet gereageerd op een opdracht. Hier volg je straks de status van je reacties: verstuurd, gelezen en in gesprek.</p><Link className="p-link p-small" href={opdrachtenUrl}>Zoek een opdracht</Link></div>}
            </section>
          </div>
          <div className="p-stack" style={{ gap: 18 }}>
            <Gesprekken items={gesprekken} rol="freelancer" />
            <section className="p-stack">
              <div className="p-between"><h2 className="p-h3">Passende opdrachten</h2><Link className="p-linkbtn" href={opdrachtenUrl}>Meer →</Link></div>
              {passend.items.length ? passend.items.map(o => <OpdrachtKaart key={o.id} o={o} />)
                : <div className="p-empty"><strong>Nu geen open opdrachten in je vakgebied</strong><span className="p-small p-muted">Nieuwe opdrachten komen er elke dag bij. Bekijk ook opdrachten in andere vakgebieden.</span><Link className="btn btn-line btn-sm" href="/opdrachten">Alle opdrachten</Link></div>}
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ---------- bedrijf ----------
  const b = await one(`select omschrijving, logo_pad, website, branche, plaats from bedrijven where id = $1`, [a.bedrijf_id]);
  const actief = await q(`select o.id, o.titel, o.slug, o.status, o.reageren_tot::text, (select count(*) from reacties r where r.opdracht_id = o.id)::int as reacties,
      (select count(*) from reacties r where r.opdracht_id = o.id and r.status = 'verstuurd')::int as nieuw
    from opdrachten o where o.bedrijf_id = $1 and o.status in ('concept','in_controle','live','afgewezen') order by o.bijgewerkt desc limit 6`, [a.bedrijf_id]);
  const geplaatst = await one<{ n: number }>(`select count(*)::int as n from opdrachten where bedrijf_id = $1 and status not in ('concept','verwijderd')`, [a.bedrijf_id]);
  const recent = await q(`select f.id, f.slug, f.functietitel, f.foto_pad, ac.voornaam, ac.achternaam from recent_bekeken rb join freelancers f on f.id = rb.freelancer_id join accounts ac on ac.id = f.id where rb.account_id = $1 and ac.status = 'actief' order by rb.op desc limit 5`, [a.id]);
  const nieuweReacties = actief.reduce((s: number, o: any) => s + o.nieuw, 0);
  const metNieuw = [...actief].sort((x: any, y: any) => y.nieuw - x.nieuw)[0] as any;
  const concept = actief.find((o: any) => o.status === 'concept') as any;
  const afgewezen = actief.find((o: any) => o.status === 'afgewezen') as any;
  const profielKlaar = !!b?.logo_pad && (b?.omschrijving || '').length >= 80;

  const stappen = [
    { klaar: profielKlaar, label: 'Vul je bedrijfsprofiel aan (logo en omschrijving)', href: '/mijn/bedrijf' },
    { klaar: (geplaatst?.n ?? 0) > 0, label: 'Plaats je eerste opdracht', href: '/mijn/opdrachten/nieuw' },
    { klaar: recent.length > 0, label: 'Bekijk profielen van freelancers', href: '/freelancers-zoeken' },
    { klaar: gesprekken.length > 0, label: 'Start je eerste gesprek', href: '/freelancers-zoeken' },
  ];
  const alles = stappen.every(s => s.klaar);

  const actie: Actie = nieuweReacties > 0
    ? { kop: `${nieuweReacties} nieuwe ${nieuweReacties === 1 ? 'reactie' : 'reacties'} op ‘${metNieuw.titel}’`, tekst: 'Bekijk de profielen en laat freelancers weten of je verder wilt. Snel reageren vergroot de kans dat goede kandidaten beschikbaar blijven.', href: `/mijn/opdrachten/${metNieuw.id}`, knop: 'Bekijk reacties' }
    : ongelezen.length
      ? { kop: ongelezen.length === 1 ? `Nieuw bericht van ${ongelezen[0].f_voornaam} ${ongelezen[0].f_achternaam}` : `${ongelezen.length} gesprekken met nieuwe berichten`, tekst: 'Een freelancer wacht op je antwoord.', href: ongelezen.length === 1 ? `/mijn/berichten/${ongelezen[0].id}` : '/mijn/berichten', knop: 'Lees en beantwoord' }
      : afgewezen
        ? { kop: `Pas ‘${afgewezen.titel}’ aan`, tekst: 'Deze opdracht is niet goedgekeurd. Bekijk de toelichting, pas de opdracht aan en dien hem opnieuw in.', href: `/mijn/opdrachten/${afgewezen.id}/bewerken`, knop: 'Bekijk en pas aan' }
        : concept
          ? { kop: `Maak ‘${concept.titel}’ af`, tekst: 'Je opdracht staat nog als concept. Vul de laatste gegevens aan en plaats hem, dan kunnen freelancers reageren.', href: `/mijn/opdrachten/${concept.id}/bewerken`, knop: 'Verder met concept' }
          : (geplaatst?.n ?? 0) === 0
            ? { kop: 'Plaats je eerste opdracht', tekst: 'Beschrijf de opdracht, de periode, de uren en het tarief. Freelancers reageren direct. Liever geen eigen zoektocht? Laat ons bemiddelen.', href: '/mijn/opdrachten/nieuw', knop: 'Plaats een opdracht', tweede: { href: '/freelancers-zoeken', knop: 'Zelf zoeken' } }
            : !profielKlaar
              ? { kop: 'Maak je bedrijfsprofiel compleet', tekst: 'Freelancers zien je bedrijfsprofiel bij elke opdracht. Een logo en een korte omschrijving helpen hen inschatten of de opdracht past.', href: '/mijn/bedrijf', knop: 'Bedrijfsprofiel aanvullen' }
              : { kop: 'Zoek freelancers die nu beschikbaar zijn', tekst: 'Filter op vakgebied, vaardigheden, tarief en beschikbaarheid, en stuur direct een bericht.', href: '/freelancers-zoeken?beschikbaar=nu', knop: 'Freelancers zoeken', tweede: { href: '/mijn/opdrachten/nieuw', knop: 'Nieuwe opdracht' } };

  return (
    <div className="p-wrap" style={{ padding: '28px 26px 56px' }}>
      <div className="p-between" style={{ marginBottom: 18 }}>
        <div><h1 className="p-h2">Welkom terug, {a.voornaam}.</h1><p className="p-muted p-small" style={{ margin: '4px 0 0' }}>{a.bedrijf_naam} · account voor opdrachtgevers</p></div>
      </div>
      <VolgendeStap a={actie} />
      {!alles && (
        <section className="p-card p-stack" style={{ marginTop: 18 }}>
          <div className="p-between"><h2 className="p-h3">Aan de slag</h2><span className="p-small p-muted">{stappen.filter(s => s.klaar).length} van {stappen.length} gedaan</span></div>
          <Taken items={stappen} />
        </section>
      )}
      <div className="p-grid2" style={{ alignItems: 'start', gap: 18, marginTop: 18 }}>
        <div className="p-stack" style={{ gap: 18 }}>
          <section className="p-card p-stack">
            <div className="p-between"><h2 className="p-h3">Mijn opdrachten</h2>{actief.length > 0 && <Link className="p-linkbtn" href="/mijn/opdrachten">Alle opdrachten →</Link>}</div>
            {actief.length ? actief.map((o: any) => (
              <div key={o.id} className="p-between p-small">
                <Link className="p-link" href={o.status === 'concept' || o.status === 'afgewezen' ? `/mijn/opdrachten/${o.id}/bewerken` : `/mijn/opdrachten/${o.id}`}>{o.titel}</Link>
                <span className="p-row" style={{ gap: 8 }}>
                  {o.nieuw > 0 ? <strong>{o.nieuw} nieuw</strong> : <span className="p-muted">{o.reacties} {o.reacties === 1 ? 'reactie' : 'reacties'}</span>}
                  <span className={`p-status ${o.status}`}>{OPDRACHT_STATUS[o.status]}</span>
                </span>
              </div>
            )) : (
              <div className="p-stack" style={{ gap: 8 }}>
                <p className="p-small p-muted" style={{ margin: 0 }}>Je hebt nog geen opdrachten. Een opdracht plaatsen kost een paar minuten; freelancers kunnen daarna direct reageren en jij volgt alle reacties hier.</p>
                <Link className="btn btn-blue btn-sm" style={{ alignSelf: 'flex-start' }} href="/mijn/opdrachten/nieuw">Plaats een opdracht</Link>
              </div>
            )}
          </section>
          <section className="p-card p-stack">
            <div className="p-between"><h2 className="p-h3">Recent bekeken</h2>{recent.length > 0 && <Link className="p-linkbtn" href="/freelancers-zoeken">Verder zoeken →</Link>}</div>
            {recent.length ? recent.map((f: any) => <Link key={f.id} href={`/freelancer/${f.slug}`} className="p-row" style={{ flexWrap: 'nowrap' }}><Avatar id={f.id} foto={f.foto_pad} voornaam={f.voornaam} achternaam={f.achternaam} /><span><strong>{f.voornaam} {f.achternaam}</strong><br /><span className="p-small p-muted">{f.functietitel}</span></span></Link>)
              : <div className="p-stack" style={{ gap: 8 }}><p className="p-small p-muted" style={{ margin: 0 }}>Profielen die je bekijkt, zie je hier terug. Zo vind je kandidaten snel terug.</p><Link className="p-link p-small" href="/freelancers-zoeken">Zoek freelancers</Link></div>}
          </section>
        </div>
        <div className="p-stack" style={{ gap: 18 }}>
          <Gesprekken items={gesprekken} rol="bedrijf" />
          <section className="p-card p-small p-stack" style={{ gap: 6 }}>
            <strong>Geen tijd om zelf te zoeken?</strong><span className="p-muted">Laat Holland Recruitment bemiddelen. Wij doen de intake, selecteren kandidaten en voeren de gesprekken.</span>
            <Link className="p-link" href="/bemiddeling">Vraag bemiddeling aan</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
