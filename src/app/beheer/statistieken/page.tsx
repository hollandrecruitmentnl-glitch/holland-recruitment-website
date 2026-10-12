import { q } from '@/lib/db';
import { vakgebiedNaam } from '@/lib/constants';

export const metadata = { title: 'Statistieken' };
export default async function Statistieken() {
  const weken = await q(`select to_char(date_trunc('week', d), 'DD-MM') as week,
      (select count(*) from accounts where rol='freelancer' and date_trunc('week', aangemaakt) = date_trunc('week', d))::int as freelancers,
      (select count(*) from bedrijven where date_trunc('week', aangemaakt) = date_trunc('week', d))::int as bedrijven,
      (select count(*) from opdrachten where bron='direct' and date_trunc('week', aangemaakt) = date_trunc('week', d))::int as opdrachten,
      (select count(*) from reacties where date_trunc('week', aangemaakt) = date_trunc('week', d))::int as reacties,
      (select count(*) from berichten where systeem = false and date_trunc('week', aangemaakt) = date_trunc('week', d))::int as berichten
    from generate_series(now() - interval '11 weeks', now(), interval '1 week') d order by d desc`);
  const vak = await q(`select vakgebied, count(*)::int as n from freelancers group by vakgebied order by n desc limit 10`);
  return (
    <div className="p-stack">
      <h1 className="p-h2">Statistieken</h1>
      <div className="p-table-wrap"><table className="p-table"><caption className="sr-only">Per week</caption>
        <thead><tr><th scope="col">Week van</th><th scope="col">Nieuwe freelancers</th><th scope="col">Nieuwe bedrijven</th><th scope="col">Opdrachten</th><th scope="col">Reacties</th><th scope="col">Berichten</th></tr></thead>
        <tbody>{weken.map((w: any) => <tr key={w.week}><td>{w.week}</td><td>{w.freelancers}</td><td>{w.bedrijven}</td><td>{w.opdrachten}</td><td>{w.reacties}</td><td>{w.berichten}</td></tr>)}</tbody></table></div>
      <section className="p-card p-stack"><h2 className="p-h3">Freelancers per vakgebied</h2>{vak.map((v: any) => <div key={v.vakgebied || 'x'} className="p-between p-small"><span>{vakgebiedNaam(v.vakgebied) || 'Onbekend'}</span><strong>{v.n}</strong></div>)}</section>
    </div>
  );
}
