import { vereis } from '@/lib/auth';
import { gesprekkenLijst } from '@/lib/data/berichten';
import GesprekkenLijst from '@/components/GesprekkenLijst';

export const metadata = { title: 'Berichten', robots: { index: false } };
export default async function Berichten() {
  const a = await vereis(['freelancer', 'bedrijf']);
  const items = await gesprekkenLijst(a);
  return (
    <div className="p-wrap" style={{ padding: '24px 26px 40px' }}>
      <h1 className="p-h2" style={{ marginBottom: 14 }}>Berichten</h1>
      <div className="p-chat">
        <GesprekkenLijst items={items} rol={a.rol} />
        <div className="p-chat-main" style={{ display: 'grid', placeItems: 'center', padding: 24 }}><p className="p-muted">Kies een gesprek.</p></div>
      </div>
    </div>
  );
}
