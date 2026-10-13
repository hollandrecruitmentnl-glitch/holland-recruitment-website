import { notFound } from 'next/navigation';
import OpdrachtenLanding, { landingMetadata, leesLanding } from '@/components/OpdrachtenLanding';

type P = { params: Promise<{ a: string; b: string }>; searchParams: Promise<Record<string, string | string[]>> };
const pag = (sp: Record<string, string | string[]>) => Math.max(1, Math.min(50, Number(sp.pagina) || 1));

export async function generateMetadata({ params, searchParams }: P) {
  const { a, b } = await params; const l = leesLanding(a, b);
  return l ? landingMetadata(l, pag(await searchParams)) : {};
}
export default async function Page({ params, searchParams }: P) {
  const { a, b } = await params; const l = leesLanding(a, b);
  if (!l) notFound();
  return <OpdrachtenLanding l={l} pagina={pag(await searchParams)} />;
}
