import type { Metadata } from 'next';
import HomeView from '@/components/HomeView';

/**
 * Home van www.holland-recruitment.nl (sinds V31 een platformpagina, optie A uit de audit van 14-10-2026).
 * Twee routes: zelf zoeken op het gratis platform, of laat ons zoeken (bemiddeling).
 */
export const metadata: Metadata = {
  title: { absolute: 'Freelancers en freelance opdrachten in Nederland | Holland Recruitment' },
  description: 'Vind een freelance of interim professional: zoek zelf op ons gratis platform of laat onze recruiters selecteren. Freelancer? Bekijk opdrachten in heel Nederland.',
  alternates: { canonical: '/' },
};
export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <HomeView sp={await searchParams} />;
}
