import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ZoekFreelancersView, { parseFZoek } from '@/components/ZoekFreelancersView';
import { REGIOS, VAKGEBIEDEN, regioNaam, vakgebiedNaam, vakKlein } from '@/lib/constants';
import { one } from '@/lib/db';

type P = { params: Promise<{ vakgebied: string; regio: string }>; searchParams: Promise<Record<string, string | string[]>> };

async function aantal(vak: string, regio: string) {
  const r = await one<{ n: number }>(`select count(*)::int as n from freelancers f join accounts a on a.id = f.id where a.status='actief' and f.vakgebied = $1 and lower(f.regio) like $2`, [vak, `%${regio.toLowerCase()}%`]);
  return r?.n ?? 0;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { vakgebied, regio } = await params;
  const v = vakgebiedNaam(vakgebied), r = regioNaam(regio);
  if (!v || !r) return {};
  const n = await aantal(vakgebied, r);
  return {
    title: `Freelancers ${vakKlein(v)} in ${r}`,
    description: `Vind zelfstandige professionals in ${vakKlein(v)} in en rond ${r}. Bekijk profielen, tarieven en beschikbaarheid en neem direct contact op.`,
    alternates: { canonical: `/freelancers-zoeken/${vakgebied}/${regio}` },
    robots: n === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function Landing({ params, searchParams }: P) {
  const { vakgebied, regio } = await params;
  const v = vakgebiedNaam(vakgebied), r = regioNaam(regio);
  if (!v || !r) notFound();
  const z = parseFZoek(await searchParams);
  const andereRegios = REGIOS.filter(x => x.slug !== regio).slice(0, 10);
  const verwant = VAKGEBIEDEN.filter(x => x.slug !== vakgebied).slice(0, 8);
  return (
    <>
      <ZoekFreelancersView z={z} basis={`/freelancers-zoeken/${vakgebied}/${regio}`} vast={{ vakgebied, regio: r }}
        titel={`Freelancers ${vakKlein(v)} in ${r}`}
        intro={`Zelfstandige professionals in ${vakKlein(v)} in en rond ${r}. Bekijk profielen en beschikbaarheid, en stuur direct een bericht. Liever dat wij zoeken? Vraag bemiddeling aan.`} />
      <section className="p-wrap" style={{ paddingBottom: 40 }}>
        <div className="p-grid2">
          <div><h2 style={{ fontSize: 18, marginBottom: 10 }}>{v} in andere regio’s</h2><div className="p-row" style={{ gap: 8 }}>{andereRegios.map(x => <Link key={x.slug} className="p-chip" href={`/freelancers-zoeken/${vakgebied}/${x.slug}`}>{x.naam}</Link>)}</div></div>
          <div><h2 style={{ fontSize: 18, marginBottom: 10 }}>Andere vakgebieden in {r}</h2><div className="p-row" style={{ gap: 8 }}>{verwant.map(x => <Link key={x.slug} className="p-chip" href={`/freelancers-zoeken/${x.slug}/${regio}`}>{x.naam}</Link>)}</div></div>
        </div>
      </section>
    </>
  );
}
