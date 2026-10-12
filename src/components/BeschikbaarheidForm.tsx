'use client';
import { useRef, useState } from 'react';
import { bewaarBeschikbaarheid } from '@/app/actions/profiel';
import { WERKVORMEN } from '@/lib/constants';

export default function BeschikbaarheidForm({ f }: { f: any }) {
  const [b, setB] = useState<string>(f.beschikbaarheid);
  const [status, setStatus] = useState<'' | 'bezig' | 'ok' | string>('');
  const form = useRef<HTMLFormElement>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = () => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      if (!form.current) return;
      setStatus('bezig');
      try { const r = await bewaarBeschikbaarheid(new FormData(form.current)); setStatus(r.fout || 'ok'); }
      catch { setStatus('Niet opgeslagen. Controleer je verbinding.'); }
    }, 500);
  };
  return (
    <form ref={form} onChange={save} onSubmit={e => e.preventDefault()} className="p-stack" style={{ gap: 12 }}>
      <fieldset style={{ border: 0 }} className="p-stack"><legend className="sr-only">Beschikbaarheid</legend>
        <div className="p-row" style={{ gap: 8 }}>
          {[['nu', 'Beschikbaar'], ['vanaf', 'Vanaf een datum'], ['periode', 'In een periode'], ['niet', 'Niet beschikbaar']].map(([v, l]) => (
            <label key={v} className={`p-chip ${b === v ? 'on' : ''}`}><input type="radio" name="beschikbaarheid" value={v} checked={b === v} onChange={() => setB(v)} style={{ position: 'absolute', opacity: 0 }} />{l}</label>
          ))}
        </div>
      </fieldset>
      {(b === 'vanaf' || b === 'periode') && (
        <div className="p-grid2">
          <div className="field"><label htmlFor="b-vanaf">{b === 'periode' ? 'Van' : 'Beschikbaar vanaf'}</label><input id="b-vanaf" type="date" name="vanaf" defaultValue={f.beschikbaar_vanaf || ''} /></div>
          {b === 'periode' && <div className="field"><label htmlFor="b-tot">Tot en met</label><input id="b-tot" type="date" name="tot" defaultValue={f.beschikbaar_tot || ''} /></div>}
        </div>
      )}
      <div className="p-grid2">
        <div className="field"><label htmlFor="b-uren">Uren per week</label><input id="b-uren" type="number" name="uren" min={1} max={60} defaultValue={f.uren_per_week ?? ''} /></div>
        <fieldset className="field" style={{ border: 0 }}><legend className="label">Werkvorm</legend>
          <div className="p-row" style={{ gap: 12 }}>{WERKVORMEN.map(w => <label key={w.v} className="p-check"><input type="checkbox" name="werkvormen" value={w.v} defaultChecked={f.werkvormen?.includes(w.v)} />{w.l}</label>)}</div>
        </fieldset>
      </div>
      <p className="p-xs" role="status" aria-live="polite" style={{ color: status && status !== 'ok' && status !== 'bezig' ? '#B4331A' : 'var(--muted)' }}>
        {status === 'bezig' ? 'Opslaan…' : status === 'ok' ? 'Automatisch opgeslagen.' : status || 'Wijzigingen worden automatisch opgeslagen.'}
      </p>
    </form>
  );
}
