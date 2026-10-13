import Link from 'next/link';
import { q } from '@/lib/db';
import { BEMIDDELING_STATUS } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import { bemiddelingStatus } from '@/app/actions/beheer';

export const metadata = { title: 'Bemiddeling' };
export default async function Bemiddeling({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { status = '' } = await searchParams;
  const rows = await q(`select m.*, o.titel, o.id as oid from bemiddeling m left join opdrachten o on o.id = m.opdracht_id ${status ? 'where m.status = $1' : ''} order by (m.status = 'nieuw') desc, m.aangemaakt desc limit 200`, status ? [status] : []);
  const freelancers = await q(`select count(*)::int as n from freelancers where ook_bemiddeld`);
  return (
    <div className="p-stack">
      <h1 className="p-h2">Bemiddeling</h1>
      <p className="p-small p-muted">Betaalde dienst: tarief vooraf afspreken met de klant (handmatig). Nieuw → Gebeld → Kandidaten voorgesteld → Geplaatst (of Gestopt). {freelancers[0]?.n ?? 0} freelancers willen ook bemiddeld worden.</p>
      <div className="p-row" style={{ gap: 8 }}>{['', ...Object.keys(BEMIDDELING_STATUS)].map(s => <Link key={s} className={`p-chip ${status === s ? 'on' : ''}`} href={`/beheer/bemiddeling?status=${s}`}>{s ? BEMIDDELING_STATUS[s] : 'Alle'}</Link>)}</div>
      {rows.length ? rows.map((m: any) => (
        <article key={m.id} className="p-card p-stack" style={{ gap: 8 }}>
          <div className="p-between"><strong>{m.bedrijfsnaam || 'Onbekend bedrijf'} · {m.naam}</strong><span className={`p-status ${m.status}`}>{BEMIDDELING_STATUS[m.status]}</span></div>
          <span className="p-small"><a className="p-link" href={`tel:${m.telefoon.replace(/\s/g, '')}`}>{m.telefoon}</a> · <a className="p-link" href={`mailto:${m.email}`}>{m.email}</a> · {datumNL(m.aangemaakt)}{m.oid && <> · <Link className="p-link" href={`/beheer/opdrachten?open=${m.oid}`}>{m.titel}</Link></>}</span>
          <p className="p-small" style={{ whiteSpace: 'pre-line' }}>{m.toelichting}</p>
          <form action={bemiddelingStatus} className="p-row" style={{ alignItems: 'flex-end' }}>
            <input type="hidden" name="id" value={m.id} />
            <div className="field"><label htmlFor={`s-${m.id}`}>Status</label><select id={`s-${m.id}`} name="status" defaultValue={m.status}>{Object.entries(BEMIDDELING_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="field" style={{ flex: 1, minWidth: 220 }}><label htmlFor={`n-${m.id}`}>Notitie</label><input id={`n-${m.id}`} name="notitie" defaultValue={m.notitie || ''} /></div>
            <button className="btn btn-line btn-sm">Opslaan</button>
          </form>
        </article>
      )) : <p className="p-muted">Geen aanvragen.</p>}
    </div>
  );
}
