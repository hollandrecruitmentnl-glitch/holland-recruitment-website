'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const I = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  zoek: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  msg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h6M9 16h6" /></svg>,
};

export default function BottomBarLinks({ rol, ongelezen }: { rol: string; ongelezen: number }) {
  const p = usePathname();
  useEffect(() => { document.body.classList.add('p-has-bottombar'); return () => document.body.classList.remove('p-has-bottombar'); }, []);
  const items = rol === 'freelancer'
    ? [['/mijn', 'Overzicht', I.home], ['/opdrachten', 'Opdrachten', I.zoek], ['/mijn/berichten', 'Berichten', I.msg], ['/mijn/profiel', 'Profiel', I.user]]
    : [['/mijn', 'Overzicht', I.home], ['/freelancers-zoeken', 'Freelancers', I.zoek], ['/mijn/berichten', 'Berichten', I.msg], ['/mijn/opdrachten', 'Opdrachten', I.doc]];
  return (
    <nav className="p-bottombar" aria-label="Snelmenu">
      {items.map(([h, l, ic]) => {
        const actief = h === '/mijn' ? p === '/mijn' : p.startsWith(h as string);
        return <Link key={h as string} href={h as string} aria-current={actief ? 'page' : undefined}>{ic}{l as string}{h === '/mijn/berichten' && ongelezen > 0 && <span className="p-badge">{ongelezen}</span>}</Link>;
      })}
    </nav>
  );
}
