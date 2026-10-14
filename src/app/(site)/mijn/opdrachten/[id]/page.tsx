import Link from 'next/link';
import { notFound } from 'next/navigation';
import { vereis } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { OPDRACHT_STATUS, REACTIE_STATUS } from '@/lib/constants';
import { datumNL, relatief } from '@/lib/util';
import { Avatar, Beschikbaar, Leeg } from '@/components/Kaarten';
import { reactieNotitie, zetReactieLabel } from '@/app/actions/opdrachten';
import SluitOpdracht from '@/components/SluitOpdracht';
import StartGesprekKnop from '@/components/StartGesprekKnop';

export const metadata = { title: 'Reacties op opdracht', robots: { index: false } };

export default async function OpdrachtReacties({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const a = await vereis('bedrijf');
  const { id } = await params; const { filter = '' } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const o = await one(`select *, reageren_tot::text as reageren_tot from opdrachten where id = $1 and bedrijf_id = $2 and status <> 'verwijderd'`, [id, a.bedrijf_id]);
  if (!o) notFound();
  await q(`update reacties set status = 'gelezen' where opdracht_id = $1 and status = 'verstuurd'`, [id]);
  const reacties = await q(`select r.*, f.slug, f.functietitel, f.uurtarief, f.foto_pad, f.cv_pad, f.regio, f.beschikbaarheid, f.beschikbaar_vanaf::text, f.beschikbaar_tot::text, f.jaren_ervaring,
      ac.voornaam, ac.achternaam, ac.status as account_status,
      (select g.id from gesprekken g where g.freelancer_id = r.freelancer_id and g.bedrijf_id = $2 and g.opdracht_id = r.opdracht_id) as gesprek,
      coalesce((select json_agg(json_build_object('tekst', n.tekst, 'auteur', na.voornaam, 'op', n.aangemaakt) order by n.aangemaakt) from reactie_notities n left join accounts na on na.id = n.auteur_id where n.reactie_id = r.id), '[]') as notities
    from reacties r join freelancers f on f.id = r.freelancer_id join accounts ac on ac.id = f.id where r.opdracht_id = $1 order by r.aangemaakt desc`, [id, a.bedrijf_id]);
  const lijst = reacties.filter((r: any) => !filter || (filter === 'shortlist' ? r.label === 'shortlist' : filter === 'geen_match' ? r.label === 'geen_match' : filter === 'open' ? !r.label : true));
  const tel = (f: (r: any) => boolean) => reacties.filter(f).length;
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 64px' }}>
      <p><Link className="p-link p-small" href="/mijn/opdrachten">← Mijn opdrachten</Link></p>
      <div className="p-between" style={{ margin: '10px 0 6px' }}>
        <h1 className="p-h2">{o.titel}</h1>
        <div className="p-row"><Link className="btn btn-line btn-sm" href={`/opdrachten/${o.slug}`}>Bekijk opdracht</Link>{['live', 'in_controle'].includes(o.status) && <Link className="btn btn-line btn-sm" href={`/mijn/opdrachten/${o.id}/bewerken`}>Bewerken</Link>}</div>
      </div>
      <p className="p-muted" style={{ marginBottom: 18 }}><span className={`p-status ${o.status}`}>{OPDRACHT_STATUS[o.status]}</span> {o.reageren_tot && <> · Reageren kan tot {datumNL(o.reageren_tot)}</>}{o.status === 'in_controle' && ' · We controleren uw opdracht. Daarna is hij zichtbaar voor freelancers.'}</p>
      <nav className="p-tabs" aria-label="Filter reacties">
        {[['', `Alle (${reacties.length})`], ['open', `Nog beoordelen (${tel(r => !r.label)})`], ['shortlist', `Shortlist (${tel(r => r.label === 'shortlist')})`], ['geen_match', `Geen match (${tel(r => r.label === 'geen_match')})`]].map(([f, l]) =>
          <Link key={f} href={`/mijn/opdrachten/${id}${f ? `?filter=${f}` : ''}`} aria-current={filter === f ? 'page' : undefined}>{l}</Link>)}
      </nav>
      <div className="p-stack">
        {lijst.length ? lijst.map((r: any) => (
          <article key={r.id} className="p-result" style={{ opacity: r.label === 'geen_match' ? .7 : 1 }}>
            <div className="p-between" style={{ alignItems: 'flex-start' }}>
              <div className="p-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <Avatar id={r.freelancer_id} foto={r.foto_pad} voornaam={r.voornaam} achternaam={r.achternaam} />
                <div><h2 className="p-h3"><Link href={`/freelancer/${r.slug}`}>{r.voornaam} {r.achternaam}</Link></h2>
                  <p className="p-small p-muted">{[r.functietitel, r.regio, r.jaren_ervaring ? `${r.jaren_ervaring} jaar ervaring` : ''].filter(Boolean).join(' · ')}</p></div>
              </div>
              <span className="p-row" style={{ gap: 6 }}>{r.label === 'shortlist' && <span className="p-status samenwerking">Shortlist</span>}<span className={`p-status ${r.status}`}>{REACTIE_STATUS[r.status]}</span></span>
            </div>
            <div className="p-row p-small" style={{ gap: 16 }}>{r.uurtarief ? <strong>€ {r.uurtarief} per uur</strong> : <span className="p-muted">Geen tarief opgegeven</span>}<Beschikbaar f={r} /><span className="p-muted">Reageerde {relatief(r.aangemaakt)}</span></div>
            {r.motivatie ? <p className="p-small p-panel" style={{ whiteSpace: 'pre-line', padding: 14 }}>{r.motivatie}</p> : <p className="p-small p-muted">Geen motivatie meegestuurd.</p>}
            <div className="p-row">
              {r.cv_pad ? <a className="p-link p-small" href={`/bestand/cv/${r.freelancer_id}`}>Download cv</a> : <span className="p-small p-muted">Geen cv</span>}
              {r.gesprek ? <Link className="btn btn-blue btn-sm" href={`/mijn/berichten/${r.gesprek}`}>Open gesprek</Link> : <StartGesprekKnop freelancerId={r.freelancer_id} opdrachtId={o.id} naam={r.voornaam} />}
              <form action={zetReactieLabel}><input type="hidden" name="reactie" value={r.id} /><input type="hidden" name="label" value="shortlist" /><button className="btn btn-line btn-sm" aria-pressed={r.label === 'shortlist'}>{r.label === 'shortlist' ? 'Van shortlist halen' : 'Shortlist'}</button></form>
              <form action={zetReactieLabel}><input type="hidden" name="reactie" value={r.id} /><input type="hidden" name="label" value="geen_match" /><button className="btn btn-line btn-sm" aria-pressed={r.label === 'geen_match'}>{r.label === 'geen_match' ? 'Toch beoordelen' : 'Geen match'}</button></form>
            </div>
            <details>
              <summary className="p-link p-small" style={{ cursor: 'pointer' }}>Notities voor collega’s ({r.notities.length})</summary>
              <div className="p-stack" style={{ gap: 8, marginTop: 10 }}>
                {r.notities.map((n: any, i: number) => <p key={i} className="p-small p-panel" style={{ padding: 12 }}><strong>{n.auteur}</strong> · {relatief(n.op)}<br />{n.tekst}</p>)}
                <form action={reactieNotitie} className="p-row" style={{ flexWrap: 'nowrap' }}><input type="hidden" name="reactie" value={r.id} /><label className="sr-only" htmlFor={`n-${r.id}`}>Notitie</label><input id={`n-${r.id}`} name="tekst" placeholder="Alleen zichtbaar voor uw team" required style={{ flex: 1, font: 'inherit', fontSize: 15, padding: '10px 12px', border: '2px solid var(--field)', borderRadius: 13 }} /><button className="btn btn-line btn-sm">Toevoegen</button></form>
              </div>
            </details>
          </article>
        )) : <Leeg titel={reacties.length ? 'Geen reacties in deze selectie' : 'Nog geen reacties'} tekst={reacties.length ? undefined : o.status === 'live' ? 'Zodra een freelancer reageert, krijgt u een e-mail en ziet u de reactie hier.' : 'Reacties komen binnen zodra uw opdracht live staat.'}>{!reacties.length && <Link className="btn btn-line btn-sm" href="/freelancers-zoeken">Zoek zelf freelancers</Link>}</Leeg>}
      </div>
      {['live', 'in_controle'].includes(o.status) && <SluitOpdracht id={o.id} titel={o.titel} bedrijf={a.bedrijf_naam || ''} reageerders={reacties.filter((r: any) => r.account_status === 'actief').map((r: any) => ({ id: r.freelancer_id, naam: `${r.voornaam} ${r.achternaam}` }))} />}
    </div>
  );
}
