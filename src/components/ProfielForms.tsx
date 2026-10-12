'use client';
import type { FormState } from '@/app/actions/auth';
import { useEffect, useState } from 'react';
import { bewaarBasis, bewaarWerkervaring, verwijderWerkervaring } from '@/app/actions/profiel';
import { FoutSamenvatting, Keuze, Tekstvak, Veld } from './Velden';
import { Verzend, useActie } from './Client';
import ChipInvoer from './ChipInvoer';
import { VAKGEBIEDEN } from '@/lib/constants';

export function BasisForm({ f, telefoon, suggesties }: { f: any; telefoon: string | null; suggesties: { vaardigheden: string[]; certificeringen: string[]; sectoren: string[] } }) {
  const [s, onSubmit, pending] = useActie(bewaarBasis, undefined as FormState);
  return (
    <form onSubmit={onSubmit} className="p-form" noValidate>
      <FoutSamenvatting fouten={s?.fouten} />
      {s?.ok && <p className="p-ok" role="status">{s.melding}</p>}
      <div className="p-grid2">
        <Veld naam="functietitel" label="Functietitel" waarde={f.functietitel} fout={s?.fouten?.functietitel} verplicht />
        <Keuze naam="vakgebied" label="Vakgebied" opties={VAKGEBIEDEN.map(v => ({ v: v.slug, l: v.naam }))} waarde={f.vakgebied} fout={s?.fouten?.vakgebied} verplicht leeg="Kies je vakgebied" />
        <Veld naam="regio" label="Regio" waarde={f.regio} fout={s?.fouten?.regio} verplicht />
        <Veld naam="uurtarief" label="Uurtarief (€)" type="number" min={10} max={500} waarde={f.uurtarief} fout={s?.fouten?.uurtarief} hint="Exclusief btw. Bij Zichtbaarheid kies je wie dit ziet." />
        <Veld naam="jaren_ervaring" label="Jaren ervaring" type="number" min={0} max={60} waarde={f.jaren_ervaring} fout={s?.fouten?.jaren_ervaring} />
        <Veld naam="telefoon" label="Telefoonnummer" type="tel" waarde={telefoon} fout={s?.fouten?.telefoon} hint="Nooit openbaar. Alleen Holland Recruitment ziet dit." auto="tel" />
      </div>
      <Tekstvak naam="introductie" label="Introductie" waarde={f.introductie} rows={6} maxLength={3000} hint="Wie ben je, wat is je specialisme en wat zoek je? Minimaal 80 tekens voor een compleet profiel." />
      <ChipInvoer naam="vaardigheden" label="Vaardigheden" waarde={f.vaardigheden} suggesties={suggesties.vaardigheden} placeholder="Bijvoorbeeld SAP PM" />
      <ChipInvoer naam="certificeringen" label="Certificeringen" waarde={f.certificeringen} suggesties={suggesties.certificeringen} placeholder="Bijvoorbeeld VCA-VOL" />
      <ChipInvoer naam="sectoren" label="Sectorervaring" waarde={f.sectoren} suggesties={suggesties.sectoren} placeholder="Bijvoorbeeld Petrochemie" />
      <ChipInvoer naam="talen" label="Talen" waarde={f.talen} suggesties={['Nederlands', 'Engels', 'Duits', 'Frans']} max={10} />
      <Verzend pending={pending}>Profiel opslaan</Verzend>
    </form>
  );
}

function WerkForm({ w, klaar }: { w?: any; klaar: () => void }) {
  const [s, onSubmit, pending] = useActie(bewaarWerkervaring, undefined as FormState);
  const [huidig, setHuidig] = useState<boolean>(!!w?.huidig);
  useEffect(() => { if (s?.ok) klaar(); }, [s, klaar]);
  const v = { ...(w || {}), ...(s?.waarden || {}) };
  return (
    <form onSubmit={onSubmit} className="p-form p-panel" noValidate>
      {w?.id && <input type="hidden" name="id" value={w.id} />}
      <FoutSamenvatting fouten={s?.fouten} />
      <div className="p-grid2">
        <Veld naam="functie" label="Functie" waarde={v.functie} fout={s?.fouten?.functie} verplicht />
        <Veld naam="opdrachtgever" label="Opdrachtgever" waarde={v.opdrachtgever} />
        <Veld naam="van" label="Van (jaar)" type="number" min={1960} max={2100} waarde={v.van} fout={s?.fouten?.van} verplicht />
        {!huidig ? <Veld naam="tot" label="Tot (jaar)" type="number" min={1960} max={2100} waarde={v.tot} fout={s?.fouten?.tot} /> : <div />}
      </div>
      <label className="p-check"><input type="checkbox" name="huidig" checked={huidig} onChange={e => setHuidig(e.target.checked)} />Huidige opdracht</label>
      <Tekstvak naam="omschrijving" label="Omschrijving" waarde={v.omschrijving} rows={3} maxLength={2000} />
      <div className="p-row"><Verzend pending={pending} className="btn btn-blue btn-sm">Opslaan</Verzend><button type="button" className="btn btn-line btn-sm" onClick={klaar}>Annuleren</button></div>
    </form>
  );
}

export function Werkervaring({ items }: { items: any[] }) {
  const [bewerk, setBewerk] = useState<string | null>(null);
  return (
    <div className="p-stack">
      {items.map(w => bewerk === w.id ? <WerkForm key={w.id} w={w} klaar={() => setBewerk(null)} /> : (
        <div key={w.id} className="p-card p-between" style={{ padding: 16, alignItems: 'flex-start' }}>
          <div><strong>{w.functie}</strong>{w.opdrachtgever && <span className="p-muted"> · {w.opdrachtgever}</span>}<div className="p-small p-muted">{w.van} – {w.huidig ? 'heden' : w.tot}</div>{w.omschrijving && <p className="p-small" style={{ marginTop: 4 }}>{w.omschrijving}</p>}</div>
          <div className="p-row" style={{ gap: 8 }}>
            <button type="button" className="p-linkbtn" onClick={() => setBewerk(w.id)}>Bewerken</button>
            <form action={verwijderWerkervaring} onSubmit={e => { if (!confirm('Deze werkervaring verwijderen?')) e.preventDefault(); }}><input type="hidden" name="id" value={w.id} /><button className="p-linkbtn" style={{ color: '#B4331A' }}>Verwijderen</button></form>
          </div>
        </div>
      ))}
      {bewerk === 'nieuw' ? <WerkForm klaar={() => setBewerk(null)} /> : <button type="button" className="btn btn-line btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setBewerk('nieuw')}>+ Werkervaring toevoegen</button>}
    </div>
  );
}
