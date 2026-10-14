'use client';
import type { FormState } from '@/app/actions/auth';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { reageer } from '@/app/actions/opdrachten';
import { Verzend, useActie } from './Client';
import { meet } from '@/lib/meten';

export default function Reageren({ opdrachtId, titel, termijn, profiel }: { opdrachtId: string; titel: string; termijn: string; profiel: { functie?: string; tarief?: number | null; heeftCv: boolean } }) {
  const [state, onSubmit, pending] = useActie(reageer, undefined as FormState);
  const sleutel = `hr-reactie-${opdrachtId}`;
  const [tekst, setTekst] = useState('');
  useEffect(() => { try { setTekst(sessionStorage.getItem(sleutel) || ''); } catch {} }, [sleutel]);
  useEffect(() => { try { if (tekst) sessionStorage.setItem(sleutel, tekst); } catch {} }, [tekst, sleutel]);
  useEffect(() => { if (state?.ok) { meet('reactie_verstuurd'); try { sessionStorage.removeItem(sleutel); } catch {} } }, [state, sleutel]);
  if (state?.ok) return (
    <div id="reageren" className="p-ok p-stack" role="status" style={{ gap: 6 }}>
      <strong>Je reactie op {titel} is verstuurd.</strong>
      <span>{termijn ? `Het bedrijf reageert ${termijn}.` : 'Het bedrijf neemt contact met je op.'} Je ziet de status bij <Link className="p-link" href="/mijn/reacties">Mijn reacties</Link>.</span>
    </div>
  );
  return (
    <form id="reageren" onSubmit={onSubmit} className="p-card p-stack" style={{ scrollMarginTop: 100 }}>
      <h2 className="p-h3">Reageer op {titel}</h2>
      <input type="hidden" name="opdracht" value={opdrachtId} />
      <div className="p-panel p-small p-stack" style={{ gap: 4, padding: 14 }}>
        <strong>Dit gaat mee met je reactie</strong>
        <span>Je profiel{profiel.functie ? `: ${profiel.functie}` : ''}{profiel.tarief ? ` · € ${profiel.tarief} per uur` : ''}</span>
        <span>{profiel.heeftCv ? 'Je cv' : <>Nog geen cv. <Link className="p-link" href="/mijn/profiel#cv">Upload je cv</Link> voor een sterkere reactie.</>}</span>
      </div>
      <div className="field">
        <label htmlFor="motivatie">Motivatie <span className="p-muted" style={{ fontWeight: 400 }}>(optioneel)</span></label>
        <textarea id="motivatie" name="motivatie" rows={5} maxLength={3000} value={tekst} onChange={e => setTekst(e.target.value)} placeholder="Waarom past deze opdracht bij jou? Noem relevante ervaring en je beschikbaarheid." />
      </div>
      {state?.fouten?.algemeen && <p className="p-err-summary" role="alert">{state.fouten.algemeen}</p>}
      <Verzend pending={pending} bezig="Wordt verzonden…">Verstuur reactie</Verzend>
    </form>
  );
}
