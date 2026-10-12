import { notFound } from 'next/navigation';
import { vereis } from '@/lib/auth';
import { andereGelezenTot, berichtenVan, gesprekVoor, gesprekkenLijst, markeerGelezen } from '@/lib/data/berichten';
import GesprekkenLijst from '@/components/GesprekkenLijst';
import Chat from '@/components/Chat';

export const metadata = { title: 'Gesprek', robots: { index: false } };
export default async function Gesprek({ params }: { params: Promise<{ id: string }> }) {
  const a = await vereis(['freelancer', 'bedrijf']);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const g = await gesprekVoor(a, id);
  if (!g || g.door_mij_geblokkeerd) notFound();
  await markeerGelezen(id, a.id);
  const [items, berichten, gelezen] = await Promise.all([gesprekkenLijst(a), berichtenVan(id), andereGelezenTot(id, a)]);
  const ander = a.rol === 'bedrijf' ? { naam: `${g.f_voornaam} ${g.f_achternaam}`, link: `/freelancer/${g.f_slug}`, linkTekst: 'Bekijk profiel' } : { naam: g.b_naam, link: `/bedrijf/${g.b_slug}`, linkTekst: 'Bekijk bedrijf' };
  return (
    <div className="p-wrap" style={{ padding: '24px 26px 40px' }}>
      <h1 className="sr-only">Gesprek met {ander.naam}</h1>
      <div className="p-chat has-open">
        <GesprekkenLijst items={items} actief={id} rol={a.rol} />
        <Chat gesprek={{ id, label: g.statuslabel, geblokkeerd: g.geblokkeerd, opdracht: g.opdracht_titel ? { titel: g.opdracht_titel, slug: g.opdracht_slug } : null }}
          ander={ander} mijnId={a.id} rol={a.rol} start={berichten.map((m: any) => ({ ...m, aangemaakt: new Date(m.aangemaakt).toISOString() }))} gelezenTot={gelezen ? new Date(gelezen).toISOString() : null} />
      </div>
    </div>
  );
}
