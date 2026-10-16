import React from 'react';

export function Fout({ id, tekst }: { id: string; tekst?: string }) {
  if (!tekst) return null;
  return <span className="err" id={id}><span aria-hidden="true">⚠</span>{tekst}</span>;
}

export function Veld(p: { naam: string; label: string; type?: string; waarde?: string | number | null; fout?: string; hint?: string; verplicht?: boolean; auto?: string; placeholder?: string; max?: number; min?: number; maxLength?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; full?: boolean; pattern?: string; step?: string }) {
  const id = `v-${p.naam}`;
  const desc = [p.fout ? `${id}-err` : '', p.hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={'field' + (p.full ? ' full' : '')}>
      <label htmlFor={id}>{p.label}{p.verplicht && <span className="req" aria-hidden="true"> *</span>}</label>
      <input id={id} name={p.naam} type={p.type || 'text'} defaultValue={p.waarde ?? ''} required={p.verplicht} autoComplete={p.auto} placeholder={p.placeholder}
        max={p.max} min={p.min} maxLength={p.maxLength} inputMode={p.inputMode} pattern={p.pattern} step={p.step} aria-invalid={p.fout ? true : undefined} aria-describedby={desc} />
      {p.hint && <span className="hint" id={`${id}-hint`}>{p.hint}</span>}
      <Fout id={`${id}-err`} tekst={p.fout} />
    </div>
  );
}

export function Tekstvak(p: { naam: string; label: string; waarde?: string | null; fout?: string; hint?: string; verplicht?: boolean; placeholder?: string; rows?: number; maxLength?: number; full?: boolean }) {
  const id = `v-${p.naam}`;
  const desc = [p.fout ? `${id}-err` : '', p.hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={'field' + (p.full ? ' full' : '')}>
      <label htmlFor={id}>{p.label}{p.verplicht && <span className="req" aria-hidden="true"> *</span>}</label>
      <textarea id={id} name={p.naam} defaultValue={p.waarde ?? ''} required={p.verplicht} placeholder={p.placeholder} rows={p.rows || 5} maxLength={p.maxLength} aria-invalid={p.fout ? true : undefined} aria-describedby={desc} />
      {p.hint && <span className="hint" id={`${id}-hint`}>{p.hint}</span>}
      <Fout id={`${id}-err`} tekst={p.fout} />
    </div>
  );
}

export function Keuze(p: { naam: string; label: string; opties: { v: string; l: string }[]; waarde?: string | null; fout?: string; verplicht?: boolean; leeg?: string; hint?: string; full?: boolean }) {
  const id = `v-${p.naam}`;
  return (
    <div className={'field' + (p.full ? ' full' : '')}>
      <label htmlFor={id}>{p.label}{p.verplicht && <span className="req" aria-hidden="true"> *</span>}</label>
      <select id={id} name={p.naam} defaultValue={p.waarde ?? ''} required={p.verplicht} aria-invalid={p.fout ? true : undefined} aria-describedby={p.fout ? `${id}-err` : p.hint ? `${id}-hint` : undefined}>
        {p.leeg !== undefined && <option value="">{p.leeg}</option>}
        {p.opties.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {p.hint && <span className="hint" id={`${id}-hint`}>{p.hint}</span>}
      <Fout id={`${id}-err`} tekst={p.fout} />
    </div>
  );
}

const LABELS: Record<string, string> = {
  voornaam: 'Voornaam', achternaam: 'Achternaam', email: 'E-mailadres', wachtwoord: 'Wachtwoord', wachtwoord2: 'Herhaal wachtwoord', functietitel: 'Functietitel', vakgebied: 'Vakgebied', regio: 'Regio',
  contactnaam: 'Naam contactpersoon', bedrijfsnaam: 'Bedrijfsnaam', kvk: 'KvK-nummer', website: 'Website', plaats: 'Plaats', titel: 'Titel', omschrijving: 'Omschrijving',
  werkvorm: 'Werkvorm', locatie: 'Locatie', uren: 'Uren per week', tarief: 'Tarief', reactietermijn: 'Reactietermijn', reageren_tot: 'Reageren kan tot', telefoon: 'Telefoonnummer',
  postcode: 'Postcode', start: 'Start', looptijd: 'Looptijd', dagen_op_locatie: 'Dagen op locatie', uurtarief: 'Uurtarief', introductie: 'Introductie', beschikbaarheid: 'Beschikbaarheid',
  naam: 'Naam', reden: 'Reden', tekst: 'Bericht', functie: 'Functie', van: 'Van', tot: 'Tot', rol: 'Rol', bestand: 'Bestand', logo: 'Logo',
};
export function FoutSamenvatting({ fouten }: { fouten?: Record<string, string> }) {
  if (!fouten || !Object.keys(fouten).length) return null;
  const items = Object.entries(fouten).filter(([k]) => k !== 'algemeen');
  return (
    <div className="p-err-summary" role="alert" tabIndex={-1}>
      <strong>{fouten.algemeen || (items.length === 1 ? 'Controleer dit veld:' : `Controleer deze ${items.length} velden:`)}</strong>
      {items.length > 0 && <ul>{items.map(([k, v]) => <li key={k}><a className="p-link" href={`#v-${k}`}>{LABELS[k] || k}</a>: {v}</li>)}</ul>}
    </div>
  );
}
