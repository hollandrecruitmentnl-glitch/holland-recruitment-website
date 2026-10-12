'use client';
import type { FormState } from '@/app/actions/auth';
import { vraagBemiddeling } from '@/app/actions/opdrachten';
import { FoutSamenvatting, Tekstvak, Veld } from './Velden';
import { Verzend, useActie } from './Client';

export default function BemiddelingForm({ w }: { w: Record<string, string> }) {
  const [s, onSubmit, pending] = useActie(vraagBemiddeling, undefined as FormState);
  if (s?.ok) return <div className="p-ok" role="status"><strong>Bedankt, je aanvraag is verstuurd.</strong><br />Een recruiter belt je binnen één werkdag. Je krijgt ook een bevestiging per e-mail.</div>;
  const v = { ...w, ...(s?.waarden || {}) };
  return (
    <form onSubmit={onSubmit} className="p-form" noValidate>
      <FoutSamenvatting fouten={s?.fouten} />
      <input type="hidden" name="freelancer" value={v.freelancer || ''} />
      <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      <Veld naam="naam" label="Je naam" waarde={v.naam} fout={s?.fouten?.naam} verplicht auto="name" />
      <Veld naam="bedrijfsnaam" label="Bedrijfsnaam" waarde={v.bedrijfsnaam} fout={s?.fouten?.bedrijfsnaam} verplicht auto="organization" />
      <Veld naam="email" label="Zakelijk e-mailadres" type="email" waarde={v.email} fout={s?.fouten?.email} verplicht auto="email" />
      <Veld naam="telefoon" label="Telefoonnummer" type="tel" waarde={v.telefoon} fout={s?.fouten?.telefoon} verplicht auto="tel" hint="Onze recruiter belt je binnen één werkdag." />
      <Tekstvak naam="toelichting" label="Wie zoek je?" waarde={v.toelichting} fout={s?.fouten?.toelichting} verplicht placeholder="Bijvoorbeeld: twee maintenance engineers voor een stop in Pernis, start november, 40 uur per week." />
      <Verzend pending={pending}>Vraag bemiddeling aan</Verzend>
      <p className="p-xs p-muted">We gebruiken je gegevens alleen om contact met je op te nemen over deze aanvraag. Zie de <a className="p-link" href="/privacyverklaring">privacyverklaring</a>.</p>
    </form>
  );
}
