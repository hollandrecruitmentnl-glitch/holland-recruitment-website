'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bevestigingOpnieuw, bevestigMetCode, type FormState } from '@/app/actions/auth';
import { useActie } from './Client';

/**
 * Banner voor accounts met een onbevestigd e-mailadres (op elke pagina).
 * Bevestigen kan met de 6-cijferige code uit de e-mail, zonder de pagina te verlaten, of met de knop in de e-mail.
 */
export default function EmailBanner({ email, u = false }: { email: string; u?: boolean }) {
  const [klaar, setKlaar] = useState(false);
  const [bezig, start] = useTransition();
  const [s, onSubmit, pending] = useActie(bevestigMetCode, undefined as FormState);
  const router = useRouter();
  useEffect(() => { if (s?.ok) router.refresh(); }, [s, router]);
  if (s?.ok) return <div className="p-emailbanner p-emailbanner-ok" role="status"><div className="p-wrap"><strong>{u ? 'Uw e-mailadres is bevestigd.' : 'Je e-mailadres is bevestigd.'}</strong> {u ? 'U kunt nu berichten sturen en opdrachten plaatsen.' : 'Je kunt nu berichten sturen en reageren op opdrachten.'}</div></div>;
  return (
    <div className="p-emailbanner">
      <div className="p-wrap p-emailbanner-in">
        <div className="p-emailbanner-tekst">
          <strong>{u ? 'Bevestig uw e-mailadres.' : 'Bevestig je e-mailadres.'}</strong>{' '}
          {u ? <>We stuurden een code naar {email}. Vul de 6 cijfers hier in, dan kunt u berichten sturen en opdrachten plaatsen.</>
            : <>We stuurden een code naar {email}. Vul de 6 cijfers hier in, dan kun je berichten sturen en reageren op opdrachten.</>}
        </div>
        <form onSubmit={onSubmit} className="p-emailbanner-form" noValidate>
          <label className="sr-only" htmlFor="bevestigcode">Code uit de e-mail</label>
          <input id="bevestigcode" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={7} placeholder="123456"
            aria-invalid={s?.fouten?.code ? true : undefined} aria-describedby={s?.fouten?.code ? 'bevestigcode-fout' : undefined} />
          <button className="btn btn-blue btn-sm" type="submit" disabled={pending}>{pending ? 'Bezig…' : 'Bevestigen'}</button>
          {klaar ? <span className="p-small" role="status">Nieuwe code verstuurd.</span>
            : <button type="button" className="p-linkbtn" disabled={bezig} onClick={() => start(async () => { await bevestigingOpnieuw(); setKlaar(true); })}>{bezig ? 'Versturen…' : 'Nieuwe code'}</button>}
        </form>
        {s?.fouten?.code && <p className="p-emailbanner-fout" id="bevestigcode-fout" role="alert">⚠ {s.fouten.code}</p>}
      </div>
    </div>
  );
}
