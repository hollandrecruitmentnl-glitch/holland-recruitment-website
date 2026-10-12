import { huidigAccount } from '@/lib/auth';
import { ongelezenAantal } from '@/lib/data/berichten';
import BottomBarLinks from './BottomBarLinks';

export default async function BottomBar() {
  const a = await huidigAccount();
  if (!a || a.rol === 'beheer') return null;
  const n = await ongelezenAantal(a);
  return <BottomBarLinks rol={a.rol} ongelezen={n} />;
}
