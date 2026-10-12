'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Dropdowns, hamburger en account-menu (zelfde gedrag als site.js). */
export default function HeaderClient() {
  const path = usePathname();
  useEffect(() => {
    const hdr = document.querySelector('.site-header');
    if (!hdr) return;
    const closeAll = (except?: Element | null) => {
      hdr.querySelectorAll<HTMLButtonElement>('[data-dropdown]').forEach(b => { if (b !== except) { b.setAttribute('aria-expanded', 'false'); document.getElementById(b.getAttribute('aria-controls') || '')?.classList.remove('open'); } });
    };
    const onClick = (e: Event) => {
      const t = e.target as HTMLElement;
      const dd = t.closest<HTMLButtonElement>('[data-dropdown]');
      if (dd) { const open = dd.getAttribute('aria-expanded') !== 'true'; closeAll(dd); dd.setAttribute('aria-expanded', String(open)); document.getElementById(dd.getAttribute('aria-controls') || '')?.classList.toggle('open', open); return; }
      const burger = t.closest<HTMLButtonElement>('.burger');
      if (burger) { const open = burger.getAttribute('aria-expanded') !== 'true'; burger.setAttribute('aria-expanded', String(open)); document.getElementById('mobile-menu')?.classList.toggle('open', open); return; }
      if (!t.closest('.nav-item')) closeAll();
      document.querySelectorAll('details.p-acct[open]').forEach(d => { if (!d.contains(t)) d.removeAttribute('open'); });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      closeAll();
      document.querySelectorAll('details.p-acct[open]').forEach(d => { d.removeAttribute('open'); d.querySelector('summary')?.focus(); });
      const burger = hdr.querySelector('.burger'); if (burger?.getAttribute('aria-expanded') === 'true') { burger.setAttribute('aria-expanded', 'false'); document.getElementById('mobile-menu')?.classList.remove('open'); }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => {
    const hdr = document.querySelector('.site-header');
    document.getElementById('mobile-menu')?.classList.remove('open');
    hdr?.querySelector('.burger')?.setAttribute('aria-expanded', 'false');
    document.querySelectorAll('details.p-acct[open]').forEach(d => d.removeAttribute('open'));
  }, [path]);
  return null;
}
