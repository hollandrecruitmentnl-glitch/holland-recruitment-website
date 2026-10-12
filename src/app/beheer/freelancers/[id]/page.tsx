import Link from 'next/link';
import { notFound } from 'next/navigation';
import { q, one } from '@/lib/db';
import { GESPREK_LABELS, REACTIE_STATUS, vakgebiedNaam, werkvormNaam } from '@/lib/constants';
import { datumNL, relatief } from '@/lib/util';
import { beschikbaarTekst } from '@/components/Kaarten';
import Blokkeer from '../../Blokkeer';

export default async function FreelancerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params; const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const f = await one(`select f.*, f.beschikbaar_vanaf::text, f.beschikbaar_tot::text, a.* , a.status as acc_status from freelancers f join accounts a on a.id = f.id where f.id = $1`, [id]);
  if (!f) notFound();
  const werk = await q(`select * from werkervaring where freelancer_id = $1 order by van desc`, [id]);
  const reacties = await q(`select r.*, o.titel, o.id as oid, b.naam as bedrijf from reacties r join opdrachten o on o.id = r.opdracht_id join bedrijven b on b.id = o.bedrijf_id where r.freelancer_id = $1 order by r.aangemaakt desc`, [id]);
  const gesprekken = await q(`select g.id, g.statuslabel, g.laatste_bericht, b.naam as bedrijf, o.titel from gesprekken g join bedrijven b on b.id = g.bedrijf_id left join opdrachten o on o.id = g.opdracht_id where g.freelancer_id = $1 order by g.laatste_bericht desc`, [id]);
  return (
    <div className="p-stack" style={{ gap: 20 }}>
      <p><Link className="p-link p-small" href="/beheer/freelancers">← Freelancers</Link></p>
      <div className="p-between"><h1 className="p-h2">{f.voornaam} {f.achternaam}</h1><Link className="btn btn-line btn-sm" href={`/freelancer/${f.slug}`}>Openbaar profiel</Link></div>
      <div className="p-grid2" style={{ alignItems: 'start' }}>
        <section className="p-card p-stack" style={{ gap: 8 }}><h2 className="p-h3">Contact (alleen beheer)</h2>
          <span>{f.email} {f.email_bevestigd ? '✓' : '(niet bevestigd)'}</span><span>{f.telefoon || 'Geen telefoon'}</span>
          <span className="p-small p-muted">Aangemeld {datumNL(f.aangemaakt)} · laatst actief {relatief(f.laatst_actief)}</span></section>
        <section className="p-card p-stack" style={{ gap: 8 }}><h2 className="p-h3">Tarief en wensen</h2>
          <span>{f.uurtarief ? `€ ${f.uurtarief} per uur` : 'Geen tarief'} · zichtbaar: {f.zichtbaar_tarief}</span><span>{beschikbaarTekst(f)}{f.uren_per_week ? ` · ${f.uren_per_week} uur` : ''}</span>
          <span>{(f.werkvormen || []).map(werkvormNaam).join(', ')}</span><span>{f.ook_bemiddeld ? 'Wil ook bemiddeld worden' : 'Niet voor bemiddeling'}</span>
          {f.cv_pad && <a className="p-link" href={`/bestand/cv/${f.id}`}>Download cv ({f.cv_naam})</a>}</section>
      </div>
      <section className="p-card p-stack"><h2 className="p-h3">{f.functietitel} · {vakgebiedNaam(f.vakgebied)} · {f.regio}</h2>
        {f.introductie && <p className="p-prose">{f.introductie}</p>}
        <p className="p-small"><strong>Vaardigheden:</strong> {f.vaardigheden.join(', ') || '–'}</p>
        <p className="p-small"><strong>Certificeringen:</strong> {f.certificeringen.join(', ') || '–'}</p>
        <p className="p-small"><strong>Sectoren:</strong> {f.sectoren.join(', ') || '–'}</p>
        <div className="p-stack" style={{ gap: 6 }}><strong className="p-small">Werkervaring</strong>{werk.length ? werk.map((w: any) => <span key={w.id} className="p-small">{w.functie} · {w.opdrachtgever} · {w.van}–{w.huidig ? 'heden' : w.tot}</span>) : <span className="p-small p-muted">–</span>}</div>
      </section>
      <section className="p-card p-stack"><h2 className="p-h3">Reacties op opdrachten ({reacties.length})</h2>
        {reacties.map((r: any) => <div key={r.id} className="p-between p-small"><Link className="p-link" href={`/beheer/opdrachten?open=${r.oid}`}>{r.titel} · {r.bedrijf}</Link><span>{datumNL(r.aangemaakt)} <span className={`p-status ${r.status}`}>{REACTIE_STATUS[r.status]}</span></span></div>)}</section>
      <section className="p-card p-stack"><h2 className="p-h3">Gesprekken ({gesprekken.length})</h2><p className="p-xs p-muted">Inhoud is niet zichtbaar. Lezen kan via Gesprekken, met een reden.</p>
        {gesprekken.map((g: any) => <div key={g.id} className="p-between p-small"><span>{g.bedrijf}{g.titel ? ` · ${g.titel}` : ''}</span><span>{relatief(g.laatste_bericht)} <span className="p-status">{GESPREK_LABELS[g.statuslabel]}</span></span></div>)}</section>
      <Blokkeer soort="freelancer" id={f.id} status={f.acc_status} reden={f.blok_reden} terug={`/beheer/freelancers/${f.id}`} fout={sp.fout === 'reden'} />
    </div>
  );
}
