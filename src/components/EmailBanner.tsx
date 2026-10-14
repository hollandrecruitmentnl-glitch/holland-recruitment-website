'use client';
import { useState, useTransition } from 'react';
import { bevestigingOpnieuw } from '@/app/actions/auth';

export default function EmailBanner({ email, u = false }: { email: string; u?: boolean }) {
  const [klaar, setKlaar] = useState(false);
  const [bezig, start] = useTransition();
  return (
    <div style={{ background: 'var(--lime-soft)', borderBottom: '1.5px solid var(--lime-deep)' }}>
      <div className="p-wrap p-between" style={{ padding: '12px 26px', fontSize: 14.5 }}>
        <span>{u ? <><strong>Bevestig uw e-mailadres.</strong> We stuurden een link naar {email}. Daarna kunt u berichten sturen en opdrachten plaatsen.</> : <><strong>Bevestig je e-mailadres.</strong> We stuurden een link naar {email}. Daarna kun je berichten sturen en reageren op opdrachten.</>}</span>
        {klaar ? <span role="status">Nieuwe e-mail verstuurd.</span> : <button className="p-linkbtn" disabled={bezig} onClick={() => start(async () => { await bevestigingOpnieuw(); setKlaar(true); })}>{bezig ? 'Versturen…' : 'Stuur opnieuw'}</button>}
      </div>
    </div>
  );
}
