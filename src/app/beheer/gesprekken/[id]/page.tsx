import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { vereis } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { datumNL } from '@/lib/util';

export default async function GesprekLezen({ params }: { params: Promise<{ id: string }> }) {
  const a = await vereis('beheer');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const inzage = await one(`select details from logboek where actor_id = $1 and actie = 'gesprek_inzage' and object_id = $2 and aangemaakt > now() - interval '2 hours' order by aangemaakt desc limit 1`, [a.id, id]);
  if (!inzage) redirect('/beheer/gesprekken?fout=reden');
  const g = await one(`select g.*, b.naam as bedrijf, fa.voornaam || ' ' || fa.achternaam as freelancer from gesprekken g join bedrijven b on b.id = g.bedrijf_id join accounts fa on fa.id = g.freelancer_id where g.id = $1`, [id]);
  if (!g) notFound();
  const msgs = await q(`select m.*, a.voornaam || ' ' || a.achternaam as naam from berichten m left join accounts a on a.id = m.afzender_id where m.gesprek_id = $1 order by m.aangemaakt`, [id]);
  return (
    <div className="p-stack" style={{ maxWidth: 820 }}>
      <p><Link className="p-link p-small" href="/beheer/gesprekken">← Gesprekken</Link></p>
      <h1 className="p-h2">{g.freelancer} en {g.bedrijf}</h1>
      <p className="p-note p-small">Inzage vastgelegd in het logboek met reden: <strong>{inzage.details?.reden}</strong>.</p>
      <div className="p-stack" style={{ gap: 10 }}>{msgs.map((m: any) => m.systeem ? <div key={m.id} className="p-sys">{m.tekst}</div> : (
        <div key={m.id} className="p-card" style={{ padding: 14 }}><div className="p-xs p-muted">{m.naam} · {datumNL(m.aangemaakt)} {new Date(m.aangemaakt).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</div><p style={{ whiteSpace: 'pre-wrap' }}>{m.tekst}</p>{m.bijlage_naam && <a className="p-link p-small" href={`/bestand/bijlage/${m.id}`}>📎 {m.bijlage_naam}</a>}</div>))}</div>
    </div>
  );
}
