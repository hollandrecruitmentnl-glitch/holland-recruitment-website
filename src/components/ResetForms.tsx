'use client';
import type { FormState } from '@/app/actions/auth';
import Link from 'next/link';
import { nieuwWachtwoord, wachtwoordVergeten } from '@/app/actions/auth';
import { FoutSamenvatting, Veld } from './Velden';
import { Verzend, WachtwoordVeld, useActie } from './Client';

export function VergetenForm() {
  const [s, onSubmit, pending] = useActie(wachtwoordVergeten, undefined as FormState);
  if (s?.ok) return <div className="p-ok" role="status"><strong>Kijk in je mailbox.</strong><br />Als er een account bestaat met {s.waarden?.email}, sturen we een link om een nieuw wachtwoord te kiezen. De link is één uur geldig. Kijk ook in je spam.</div>;
  return (
    <form onSubmit={onSubmit} className="p-form" noValidate>
      <FoutSamenvatting fouten={s?.fouten} />
      <Veld naam="email" label="E-mailadres" type="email" waarde={s?.waarden?.email} fout={s?.fouten?.email} verplicht auto="email" />
      <Verzend pending={pending}>Stuur link</Verzend>
      <p className="p-small"><Link className="p-link" href="/inloggen">Terug naar inloggen</Link></p>
    </form>
  );
}
export function NieuwForm({ token }: { token: string }) {
  const [s, onSubmit, pending] = useActie(nieuwWachtwoord, undefined as FormState);
  return (
    <form onSubmit={onSubmit} className="p-form" noValidate>
      <input type="hidden" name="token" value={token} />
      <FoutSamenvatting fouten={s?.fouten} />
      <WachtwoordVeld id="v-wachtwoord" name="wachtwoord" label="Nieuw wachtwoord" autoComplete="new-password" invalid={!!s?.fouten?.wachtwoord} hint="Minimaal 8 tekens." />
      <WachtwoordVeld id="v-wachtwoord2" name="wachtwoord2" label="Herhaal nieuw wachtwoord" autoComplete="new-password" invalid={!!s?.fouten?.wachtwoord2} />
      <Verzend pending={pending}>Wachtwoord opslaan</Verzend>
      {s?.fouten?.algemeen && <p className="p-small"><Link className="p-link" href="/wachtwoord-vergeten">Vraag een nieuwe link aan</Link></p>}
    </form>
  );
}
