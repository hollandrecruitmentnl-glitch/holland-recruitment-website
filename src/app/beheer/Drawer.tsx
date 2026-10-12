'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/** Zijpaneel (460 px): focus erin, Escape sluit, focus terug. */
export default function Drawer({ sluitUrl, titel, children }: { sluitUrl: string; titel: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const vorige = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push(sluitUrl, { scroll: false });
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); vorige?.focus?.(); };
  }, [router, sluitUrl]);
  return (
    <>
      <div className="p-drawer-bg" onClick={() => router.push(sluitUrl, { scroll: false })} aria-hidden="true" />
      <div className="p-drawer" role="dialog" aria-modal="true" aria-label={titel} ref={ref} tabIndex={-1}>
        <div className="p-between"><strong className="p-h3">{titel}</strong><button type="button" className="p-chip" onClick={() => router.push(sluitUrl, { scroll: false })} aria-label="Sluiten">×</button></div>
        {children}
      </div>
    </>
  );
}
