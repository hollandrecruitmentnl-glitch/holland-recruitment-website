'use client';
import type { FormState } from '@/app/actions/auth';
import { bewaarBedrijf, nodigUit } from '@/app/actions/profiel';
import { FoutSamenvatting, Keuze, Tekstvak, Veld } from './Velden';
import { Verzend, useActie } from './Client';
import { BRANCHES, GROOTTES } from '@/lib/constants';

export function BedrijfForm({ b, telefoon }: { b: any; telefoon: string | null }) {
  const [s, onSubmit, pending] = useActie(bewaarBedrijf, undefined as FormState);
  const v = { ...b, ...(s?.waarden || {}) };
  return (
    <form onSubmit={onSubmit} className="p-form" noValidate>
      <FoutSamenvatting fouten={s?.fouten} />
      {s?.ok && <p className="p-ok" role="status">{s.melding}</p>}
      <div className="p-grid2">
        <Veld naam="naam" label="Bedrijfsnaam" waarde={v.naam} fout={s?.fouten?.naam} verplicht />
        <Veld naam="kvk" label="KvK-nummer" waarde={v.kvk} fout={s?.fouten?.kvk} verplicht inputMode="numeric" maxLength={8} />
        <Veld naam="btw" label="Btw-nummer" waarde={v.btw} />
        <Veld naam="website" label="Website" waarde={v.website} fout={s?.fouten?.website} />
        <Keuze naam="branche" label="Branche" opties={BRANCHES.map(x => ({ v: x, l: x }))} waarde={v.branche} leeg="Kies een branche" />
        <Keuze naam="grootte" label="Aantal medewerkers" opties={GROOTTES.map(x => ({ v: x, l: x }))} waarde={v.grootte} leeg="Kies" />
        <Veld naam="straat" label="Straat en huisnummer" waarde={v.straat} auto="street-address" />
        <Veld naam="postcode" label="Postcode" waarde={v.postcode} fout={s?.fouten?.postcode} auto="postal-code" placeholder="3081 LR" />
        <Veld naam="plaats" label="Plaats" waarde={v.plaats} fout={s?.fouten?.plaats} verplicht />
        <Veld naam="telefoon" label="Uw telefoonnummer" type="tel" waarde={telefoon} hint="Alleen zichtbaar voor Holland Recruitment." />
      </div>
      <Tekstvak naam="omschrijving" label="Over uw bedrijf" waarde={v.omschrijving} rows={5} maxLength={4000} hint="Wat doet uw bedrijf en waarom werken freelancers graag met u?" />
      <Verzend pending={pending}>Opslaan</Verzend>
    </form>
  );
}

export function UitnodigForm() {
  const [s, onSubmit, pending] = useActie(nodigUit, undefined as FormState);
  return (
    <form onSubmit={onSubmit} className="p-stack" style={{ gap: 10 }} noValidate>
      {s?.ok && <p className="p-ok p-small" role="status">{s.melding}</p>}
      <div className="p-row" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
        <div style={{ flex: 1 }}><Veld naam="email" label="E-mailadres van uw collega" type="email" fout={s?.fouten?.email} /></div>
        <Verzend pending={pending} className="btn btn-line">Uitnodigen</Verzend>
      </div>
    </form>
  );
}
