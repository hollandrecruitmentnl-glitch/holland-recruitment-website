'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startGesprek } from '@/app/actions/berichten';

export default function StartGesprekKnop({ freelancerId, opdrachtId, naam }: { freelancerId: string; opdrachtId: string; naam: string }) {
  const [open, setOpen] = useState(false);
  const [tekst, setTekst] = useState(`Hallo ${naam}, bedankt voor je reactie. `);
  const [fout, setFout] = useState('');
  const [bezig, start] = useTransition();
  const router = useRouter();
  if (!open) return <button type="button" className="btn btn-blue btn-sm" onClick={() => setOpen(true)}>Start gesprek</button>;
  return (
    <div className="p-stack" style={{ gap: 8, width: '100%' }}>
      <label className="sr-only" htmlFor={`sg-${freelancerId}`}>Bericht aan {naam}</label>
      <textarea id={`sg-${freelancerId}`} rows={3} value={tekst} onChange={e => setTekst(e.target.value)} style={{ font: 'inherit', fontSize: 15, padding: '11px 13px', border: '2px solid var(--field)', borderRadius: 13 }} />
      {fout && <span className="err" style={{ color: '#B4331A', fontWeight: 600, fontSize: 13.5 }}>⚠ {fout}</span>}
      <div className="p-row"><button type="button" className="btn btn-blue btn-sm" disabled={bezig} onClick={() => start(async () => { const r = await startGesprek('freelancer', freelancerId, tekst, opdrachtId); if (r.fout) setFout(r.fout); else router.push(`/mijn/berichten/${r.gesprek}`); })}>{bezig ? 'Wordt verzonden…' : 'Verstuur'}</button><button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(false)}>Annuleren</button></div>
    </div>
  );
}
