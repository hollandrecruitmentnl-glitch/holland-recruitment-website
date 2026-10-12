'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BeheerNav({ tellers }: { tellers: { controle: number; meldingen: number; bemiddeling: number } | null }) {
  const p = usePathname();
  const items: [string, string, number?][] = [
    ['/beheer', 'Dashboard'], ['/beheer/freelancers', 'Freelancers'], ['/beheer/bedrijven', 'Bedrijven'], ['/beheer/opdrachten', 'Opdrachten', tellers?.controle],
    ['/beheer/bemiddeling', 'Bemiddeling', tellers?.bemiddeling], ['/beheer/moderatie', 'Moderatie', tellers?.meldingen], ['/beheer/gesprekken', 'Gesprekken'],
    ['/beheer/feeds', 'Externe feeds'], ['/beheer/statistieken', 'Statistieken'], ['/beheer/instellingen', 'Instellingen'],
  ];
  return <nav style={{ display: 'contents' }}>{items.map(([h, l, n]) => <Link key={h} href={h} aria-current={(h === '/beheer' ? p === h : p.startsWith(h)) ? 'page' : undefined}>{l}{n ? <span className="p-badge" style={{ background: 'var(--lime)', color: 'var(--ink)' }}>{n}</span> : null}</Link>)}</nav>;
}
