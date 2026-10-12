'use client';
import type { FormState } from '@/app/actions/auth';
import Link from 'next/link';
import { inloggen } from '@/app/actions/auth';
import { FoutSamenvatting, Veld } from './Velden';
import { Verzend, WachtwoordVeld, useActie } from './Client';

export default function LoginForm({ terug }: { terug?: string }) {
  const [s, onSubmit, pending] = useActie(inloggen, undefined as FormState);
  return (
    <form onSubmit={onSubmit} className="p-form" noValidate>
      <input type="hidden" name="terug" value={terug || ''} />
      <FoutSamenvatting fouten={s?.fouten} />
      <Veld naam="email" label="E-mailadres" type="email" waarde={s?.waarden?.email} verplicht auto="email" />
      <WachtwoordVeld id="v-wachtwoord" name="wachtwoord" label="Wachtwoord" autoComplete="current-password" />
      <p className="p-small"><Link className="p-link" href="/wachtwoord-vergeten">Wachtwoord vergeten?</Link></p>
      <Verzend pending={pending} bezig="Inloggen…">Inloggen</Verzend>
      <p className="p-small">Nog geen account? <Link className="p-link" href={`/registreren${terug ? `?terug=${encodeURIComponent(terug)}` : ''}`}>Maak gratis een account</Link></p>
    </form>
  );
}
