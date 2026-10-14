'use client';
import type { FormState } from '@/app/actions/auth';
import { vraagBemiddeling } from '@/app/actions/opdrachten';
import { FoutSamenvatting, Tekstvak, Veld } from './Velden';
import { useEffect } from 'react';
import { Verzend, useActie } from './Client';
import { meet } from '@/lib/meten';

export default function BemiddelingForm({ w }: { w: Record<string, string> }) {
  const [s, onSubmit, pending] = useActie(vraagBemiddeling, undefined as FormState);
  useEffect(() => { if (s?.ok) meet('generate_lead', { form: 'bemiddeling' }); }, [s]);
  if (s?.ok) return <div className="p-ok" role="status"><strong>Bedankt, uw aanvraag is verstuurd.</strong><br />Een recruiter belt u binnen één werkdag. U krijgt ook een bevestiging per e-mail.</div>;
  const v = { ...w, ...(s?.waarden || {}) };
  return (
    <form onSubmit={onSubmit} className="p-form" noValidate>
      <FoutSamenvatting fouten={s?.fouten} />
      <input type="hidden" name="freelancer" value={v.freelancer || ''} />
      <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      <Veld naam="naam" label="Uw naam" waarde={v.naam} fout={s?.fouten?.naam} verplicht auto="name" />
      <Veld naam="bedrijfsnaam" label="Bedrijfsnaam" waarde={v.bedrijfsnaam} fout={s?.fouten?.bedrijfsnaam} verplicht auto="organization" />
      <Veld naam="email" label="Zakelijk e-mailadres" type="email" waarde={v.email} fout={s?.fouten?.email} verplicht auto="email" />
      <Veld naam="telefoon" label="Telefoonnummer" type="tel" waarde={v.telefoon} fout={s?.fouten?.telefoon} verplicht auto="tel" hint="Onze recruiter belt u binnen één werkdag." />
      <Tekstvak naam="toelichting" label="Wie zoekt u?" waarde={v.toelichting} fout={s?.fouten?.toelichting} verplicht placeholder="Bijvoorbeeld: twee maintenance engineers voor een stop in Pernis, start november, 40 uur per week." />
      <Verzend pending={pending}>Vraag bemiddeling aan</Verzend>
      <p className="p-xs p-muted">We gebruiken uw gegevens alleen om contact met u op te nemen over deze aanvraag. Zie de <a className="p-link" href="/privacyverklaring">privacyverklaring</a>.</p>
    </form>
  );
}
