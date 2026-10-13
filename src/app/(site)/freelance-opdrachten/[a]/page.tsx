import { notFound } from 'next/navigation';
import OpdrachtenLanding, { landingMetadata, leesLanding } from '@/components/OpdrachtenLanding';

type P = { params: Promise<{ a: string }>; searchParams: Promise<Record<string, string | string[]>> };
const pag = (sp: Record<string, string | string[]>) => Math.max(1, Math.min(50, Number(sp.pagina) || 1));

export async function generateMetadata({ params, searchParams }: P) {
  const l = leesLanding((await params).a);
  return l ? landingMetadata(l, pag(await searchParams)) : {};
}
export default async function Page({ params, searchParams }: P) {
  const l = leesLanding((await params).a);
  if (!l) notFound();
  return <OpdrachtenLanding l={l} pagina={pag(await searchParams)} />;
}
