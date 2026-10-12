'use client';
import { useState, useTransition } from 'react';
import { bewaarZoekopdracht } from '@/app/actions/zoek';

export function BewaarZoekopdracht({ soort, filters, naam }: { soort: 'freelancers' | 'opdrachten'; filters: unknown; naam: string }) {
  const [klaar, setKlaar] = useState(false);
  const [bezig, start] = useTransition();
  if (klaar) return <span className="p-small p-muted" role="status">Bewaard. Je krijgt een e-mail bij nieuwe resultaten.</span>;
  return (
    <button type="button" className="p-linkbtn" disabled={bezig} onClick={() => start(async () => { const r = await bewaarZoekopdracht(soort, JSON.stringify(filters), naam); if (r?.ok) setKlaar(true); })}>
      {bezig ? 'Bewaren…' : 'Bewaar deze zoekopdracht'}
    </button>
  );
}
