'use client';
import type { FormState } from '@/app/actions/auth';
import { activeren } from '@/app/actions/uitnodigen';
import { FoutSamenvatting } from './Velden';
import { Verzend, WachtwoordVeld, useActie } from './Client';

export default function UitnodigingForm({ token, voorbeeld = false }: { token: string; voorbeeld?: boolean }) {
  const [s, onSubmit, pending] = useActie(activeren, undefined as FormState);
  return (
    <form onSubmit={voorbeeld ? e => e.preventDefault() : onSubmit} className="p-form" noValidate>
      <input type="hidden" name="token" value={token} />
      <FoutSamenvatting fouten={s?.fouten} />
      <WachtwoordVeld id="v-wachtwoord" name="wachtwoord" label="Kies een wachtwoord" autoComplete="new-password" invalid={!!s?.fouten?.wachtwoord} hint="Minimaal 8 tekens." />
      <fieldset className="p-stack" style={{ gap: 8 }} aria-invalid={!!s?.fouten?.zichtbaar_cv}>
        <legend style={{ fontWeight: 600, marginBottom: 6 }}>Wie mag je cv zien?</legend>
        <label className="p-check"><input type="radio" name="zichtbaar_cv" value="na_contact" defaultChecked />Alleen bedrijven waarmee je contact hebt (aanbevolen)</label>
        <label className="p-check"><input type="radio" name="zichtbaar_cv" value="publiek" />Iedereen die je profiel bekijkt</label>
        <label className="p-check"><input type="radio" name="zichtbaar_cv" value="verborgen" />Niemand, ik deel mijn cv zelf</label>
      </fieldset>
      <label className="p-check"><input type="checkbox" name="vindbaar_google" value="ja" />Mijn profiel mag ook via zoekmachines zoals Google gevonden worden</label>
      <label className="p-check" aria-invalid={!!s?.fouten?.voorwaarden}><input type="checkbox" name="voorwaarden" value="ja" required />
        <span>Ik ga akkoord met de <a className="p-link" href="/voorwaarden" target="_blank">gebruiksvoorwaarden</a>. Hoe we met mijn gegevens omgaan, staat in de <a className="p-link" href="/privacyverklaring" target="_blank">privacyverklaring</a>.</span></label>
      {voorbeeld ? <p className="p-note p-small">Dit is een voorbeeld van de activatiepagina. Hier kun je niets opslaan.</p>
        : <Verzend pending={pending}>Profiel activeren</Verzend>}
    </form>
  );
}
