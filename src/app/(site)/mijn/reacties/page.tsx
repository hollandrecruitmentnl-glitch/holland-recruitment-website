import Link from 'next/link';
import { vereis } from '@/lib/auth';
import { q } from '@/lib/db';
import { REACTIE_STATUS } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import { Leeg } from '@/components/Kaarten';

export const metadata = { title: 'Mijn reacties', robots: { index: false } };
export default async function Reacties() {
  const a = await vereis('freelancer');
  const r = await q(`select r.*, o.titel, o.slug, o.status as o_status, o.reactietermijn, b.naam as bedrijf, b.slug as b_slug,
      (select g.id from gesprekken g where g.freelancer_id = r.freelancer_id and g.bedrijf_id = o.bedrijf_id and g.opdracht_id = o.id) as gesprek
    from reacties r join opdrachten o on o.id = r.opdracht_id join bedrijven b on b.id = o.bedrijf_id where r.freelancer_id = $1 order by r.aangemaakt desc`, [a.id]);
  return (
    <div className="p-wrap" style={{ padding: '28px 26px 64px', maxWidth: 980 }}>
      <h1 className="p-h2" style={{ marginBottom: 16 }}>Mijn reacties</h1>
      {r.length ? <div className="p-stack">{r.map((x: any) => (
        <article key={x.id} className="p-result">
          <div className="p-between"><h2 className="p-h3"><Link href={`/opdrachten/${x.slug}`}>{x.titel}</Link></h2><span className={`p-status ${x.status}`}>{REACTIE_STATUS[x.status]}</span></div>
          <p className="p-small p-muted">{x.bedrijf} · gereageerd op {datumNL(x.aangemaakt)}</p>
          {x.motivatie && <p className="p-small" style={{ whiteSpace: 'pre-line' }}>{x.motivatie}</p>}
          <div className="p-row">{x.gesprek ? <Link className="btn btn-line btn-sm" href={`/mijn/berichten/${x.gesprek}`}>Open gesprek</Link> : <span className="p-small p-muted">Het bedrijf heeft nog geen gesprek gestart.</span>}</div>
        </article>))}</div>
        : <Leeg titel="Nog geen reacties" tekst="Reageer op een opdracht; je profiel en cv gaan automatisch mee."><Link className="btn btn-blue btn-sm" href="/opdrachten">Bekijk opdrachten</Link></Leeg>}
    </div>
  );
}
