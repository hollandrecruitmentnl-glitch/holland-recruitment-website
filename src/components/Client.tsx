'use client';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';

/** Balk bovenaan bij geen verbinding. */
export function OfflineBalk() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const upd = () => setOffline(!navigator.onLine);
    upd(); window.addEventListener('online', upd); window.addEventListener('offline', upd);
    return () => { window.removeEventListener('online', upd); window.removeEventListener('offline', upd); };
  }, []);
  if (!offline) return null;
  return <div className="p-offline" role="status"><strong>Geen internetverbinding.</strong> Je werk blijft bewaard. Berichten gaan pas weg als je weer online bent.</div>;
}

const TOASTS: Record<string, string> = {
  opgeslagen: 'Opgeslagen.', verstuurd: 'Verstuurd.', ingediend: 'Je opdracht is ingediend. Na controle wordt deze zichtbaar voor freelancers.',
  gesloten: 'De opdracht is gesloten.', bevestigd: 'Je e-mailadres is bevestigd.', wachtwoord: 'Je wachtwoord is gewijzigd.', welkom: 'Welkom! Je account is aangemaakt.',
  verwijderd: 'Verwijderd.', uitgenodigd: 'De uitnodiging is verstuurd.', bemiddeling: 'Je aanvraag is verstuurd. Een recruiter belt je binnen één werkdag.',
  gemeld: 'Bedankt. We bekijken je melding.', geblokkeerd: 'Je ziet dit gesprek niet meer.', reactie: 'Je reactie is verstuurd.', live: 'Je opdracht staat live.',
  bewaard: 'Je zoekopdracht is bewaard. Je krijgt een e-mail bij nieuwe resultaten.', bijgewerkt: 'Bijgewerkt.',
};

/** Toast op basis van ?melding=… of ?welkom=1 (4,2 s). */
export function Toast({ tekst }: { tekst?: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const key = sp.get('melding') || (sp.get('welkom') ? 'welkom' : sp.get('wachtwoord') ? 'wachtwoord' : sp.get('bevestigd') ? 'bevestigd' : '');
  const [zicht, setZicht] = useState<string | null>(null);
  useEffect(() => {
    const t = tekst || TOASTS[key];
    if (!t) return;
    setZicht(t);
    const n = new URLSearchParams(sp.toString()); ['melding', 'welkom', 'wachtwoord', 'bevestigd'].forEach(k => n.delete(k));
    router.replace(path + (n.toString() ? '?' + n : ''), { scroll: false });
    const id = setTimeout(() => setZicht(null), 4200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tekst]);
  if (!zicht) return null;
  return <div className="p-toast" role="status" aria-live="polite">{zicht}</div>;
}

export function WachtwoordVeld({ id, name, label, autoComplete, invalid, describedBy, hint }: { id: string; name: string; label: string; autoComplete: string; invalid?: boolean; describedBy?: string; hint?: string }) {
  const [toon, setToon] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} name={name} type={toon ? 'text' : 'password'} autoComplete={autoComplete} minLength={8} required aria-invalid={invalid || undefined} aria-describedby={describedBy} style={{ paddingRight: 92 }} />
        <button type="button" onClick={() => setToon(!toon)} className="p-linkbtn" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} aria-pressed={toon}>{toon ? 'Verbergen' : 'Tonen'}</button>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Verzendknop met directe feedback (<100 ms). */
export function Verzend({ children, className = 'btn btn-blue', bezig = 'Bezig…', pending: extern, ...rest }: { children: React.ReactNode; className?: string; bezig?: string; pending?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const status = useFormStatus();
  const pending = extern ?? status.pending;
  return <button type="submit" className={className} aria-disabled={pending} disabled={pending} {...rest}>{pending ? bezig : children}</button>;
}

/**
 * Formulier-actie zonder automatische reset (React 19 reset uncontrolled velden na een action-submit;
 * bij validatiefouten wil je de invoer juist behouden).
 */
export function useActie<S>(fn: (s: S, fd: FormData) => Promise<S>, init: S) {
  const [state, action, pending] = useActionState<S, FormData>(fn as (s: Awaited<S>, fd: FormData) => Promise<S>, init as Awaited<S>);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter ?? undefined);
    startTransition(() => action(fd));
  };
  return [state, onSubmit, pending] as const;
}
