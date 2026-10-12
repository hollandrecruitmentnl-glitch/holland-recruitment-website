import type { Metadata } from 'next';
import ZoekFreelancersView, { parseFZoek } from '@/components/ZoekFreelancersView';

export const metadata: Metadata = {
  title: 'Freelancers zoeken',
  description: 'Zoek zelfstandige professionals op functie, vaardigheid, regio, tarief en beschikbaarheid. Neem direct contact op, gratis.',
  alternates: { canonical: '/freelancers-zoeken' },
};
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  return <ZoekFreelancersView z={parseFZoek(await searchParams)} titel="Freelancers zoeken" />;
}
