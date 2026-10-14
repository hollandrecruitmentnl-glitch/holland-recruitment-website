import type { Metadata } from 'next';
import HomeView from '@/components/HomeView';
// Tijdelijk (V31): toont de nieuwe home tot de website-home naar het platform wijst. Daarna wordt dit een permanente redirect naar '/'.
export const metadata: Metadata = {
  title: { absolute: 'Freelancers en freelance opdrachten in Nederland | Holland Recruitment' },
  description: 'Zoek zelf gratis freelancers en freelance opdrachten in heel Nederland, of laat Holland Recruitment de selectie doen.',
  alternates: { canonical: '/freelance-platform' },
};
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <HomeView sp={await searchParams} basis="/freelance-platform" />;
}
