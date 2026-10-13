'use client';
import { useFormStatus } from 'react-dom';

/** Verzendknop voor beheerformulieren: toont "Bezig…" en voorkomt dubbel klikken. */
export default function BeheerKnop({ children, className = 'btn btn-line btn-sm', disabled, bezig = 'Bezig… even geduld' }: { children: React.ReactNode; className?: string; disabled?: boolean; bezig?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={disabled || pending} aria-busy={pending}>{pending ? bezig : children}</button>;
}
