'use client';
import { useEffect, useRef, useState } from 'react';
import { sluitOpdracht } from '@/app/actions/opdrachten';
import type { FormState } from '@/app/actions/auth';
import { Verzend, useActie } from './Client';

export default function SluitOpdracht({ id, titel, bedrijf, reageerders }: { id: string; titel: string; bedrijf: string; reageerders: { id: string; naam: string }[] }) {
  const [s, onSubmit, pending] = useActie(sluitOpdracht, undefined as FormState);
  const [open, setOpen] = useState(false);
  const [met, setMet] = useState('');
  const [wie, setWie] = useState('');
  const dlg = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dlg.current?.showModal(); else dlg.current?.close(); }, [open]);
  const overig = reageerders.filter(r => !(met === 'reageerder' && r.id === wie)).length;
  return (
    <>
      <div className="p-card p-between" style={{ marginTop: 24 }}><span><strong>Gevonden wie u zocht?</strong><br /><span className="p-small p-muted">Sluit de opdracht. Andere reageerders krijgen automatisch bericht.</span></span><button type="button" className="btn btn-line btn-sm" onClick={() => setOpen(true)}>Opdracht sluiten</button></div>
      <dialog ref={dlg} onClose={() => setOpen(false)} aria-labelledby="sluit-titel" style={{ border: 0, borderRadius: 24, padding: 0, maxWidth: 560, width: 'calc(100% - 32px)', boxShadow: 'var(--shadow)' }}>
        <form onSubmit={onSubmit} className="p-stack" style={{ padding: 24 }}>
          <input type="hidden" name="id" value={id} />
          <h2 id="sluit-titel" className="p-h3">{titel} sluiten</h2>
          <fieldset className="p-stack" style={{ border: 0, gap: 10 }}><legend className="p-small" style={{ fontWeight: 700, marginBottom: 8 }}>Wie gaat de opdracht doen?</legend>
            {reageerders.length > 0 && <label className="p-check"><input type="radio" name="gesloten_met" value="reageerder" onChange={() => setMet('reageerder')} />Een freelancer die reageerde</label>}
            {met === 'reageerder' && <select name="freelancer" value={wie} onChange={e => setWie(e.target.value)} aria-label="Kies de freelancer" style={{ font: 'inherit', padding: 12, border: '2px solid var(--field)', borderRadius: 13 }}><option value="">Kies de freelancer</option>{reageerders.map(r => <option key={r.id} value={r.id}>{r.naam}</option>)}</select>}
            <label className="p-check"><input type="radio" name="gesloten_met" value="extern" onChange={() => setMet('extern')} />Iemand buiten het platform</label>
            <label className="p-check"><input type="radio" name="gesloten_met" value="niemand" onChange={() => setMet('niemand')} />Niemand, de opdracht gaat niet door</label>
          </fieldset>
          {(s?.fouten?.gesloten_met || s?.fouten?.algemeen) && <p className="p-err-summary" role="alert">{s.fouten.gesloten_met || s.fouten.algemeen}</p>}
          {met && overig > 0 && (
            <div className="p-panel p-small"><strong>Voorbeeld van het bericht aan {overig} {overig === 1 ? 'andere reageerder' : 'andere reageerders'}</strong>
              <p style={{ marginTop: 6 }}>“Bedankt voor je reactie op {titel}. {bedrijf} heeft iemand gevonden. We wensen je veel succes met je volgende opdracht.”</p></div>
          )}
          <div className="p-row"><Verzend pending={pending} bezig="Sluiten…">Opdracht sluiten</Verzend><button type="button" className="btn btn-line" onClick={() => setOpen(false)}>Annuleren</button></div>
        </form>
      </dialog>
    </>
  );
}
