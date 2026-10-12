'use client';
import type { FormState } from '@/app/actions/auth';
import { verwijderAccount, wijzigWachtwoord } from '@/app/actions/profiel';
import { FoutSamenvatting, Veld } from './Velden';
import { Verzend, WachtwoordVeld, useActie } from './Client';

export function WachtwoordForm() {
  const [s, onSubmit, pending] = useActie(wijzigWachtwoord, undefined as FormState);
  return (
    <form onSubmit={onSubmit} className="p-form" noValidate>
      {s?.ok && <p className="p-ok" role="status">{s.melding}</p>}
      <FoutSamenvatting fouten={s?.fouten} />
      <div className="p-grid2"><WachtwoordVeld id="v-oud" name="oud" label="Huidig wachtwoord" autoComplete="current-password" invalid={!!s?.fouten?.oud} /><WachtwoordVeld id="v-nieuw" name="nieuw" label="Nieuw wachtwoord" autoComplete="new-password" invalid={!!s?.fouten?.nieuw} hint="Minimaal 8 tekens." /></div>
      <Verzend pending={pending} className="btn btn-line">Wachtwoord wijzigen</Verzend>
    </form>
  );
}
export function VerwijderForm({ rol }: { rol: string }) {
  const [s, onSubmit, pending] = useActie(verwijderAccount, undefined as FormState);
  return (
    <details>
      <summary className="btn btn-danger btn-sm" style={{ listStyle: 'none', display: 'inline-flex' }}>Account verwijderen</summary>
      <form onSubmit={onSubmit} className="p-form" noValidate style={{ marginTop: 14 }}>
        <p className="p-small">Dit kan niet ongedaan worden gemaakt. {rol === 'freelancer' ? 'Je profiel, cv, reacties en gesprekken worden verwijderd.' : 'Je account wordt verwijderd. Ben je de laatste in je team, dan worden ook het bedrijf, de opdrachten en gesprekken verwijderd.'}</p>
        <FoutSamenvatting fouten={s?.fouten} />
        <Veld naam="bevestig" label="Typ VERWIJDER om te bevestigen" fout={s?.fouten?.bevestig} />
        <WachtwoordVeld id="v-wachtwoord" name="wachtwoord" label="Je wachtwoord" autoComplete="current-password" invalid={!!s?.fouten?.wachtwoord} />
        <Verzend pending={pending} className="btn btn-danger">Definitief verwijderen</Verzend>
      </form>
    </details>
  );
}
