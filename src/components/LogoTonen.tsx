'use client';
import { useState, useTransition } from 'react';
import { zetLogoTonen } from '@/app/actions/profiel';

/** Bedrijfsprofiel: zelf kiezen of het logo in de strook 'Bedrijven op ons platform' op de home staat (V36). */
export default function LogoTonen({ aan, heeftLogo, bevestigd, verborgen }: { aan: boolean; heeftLogo: boolean; bevestigd: boolean; verborgen: boolean }) {
  const [v, setV] = useState(aan);
  const [ok, setOk] = useState(false);
  const [bezig, start] = useTransition();
  const status = !v ? 'Uw logo staat niet op de homepage.'
    : !heeftLogo ? 'Upload een logo, dan verschijnt het op de homepage.'
    : !bevestigd ? 'Uw logo verschijnt op de homepage zodra uw e-mailadres is bevestigd.'
    : verborgen ? 'Uw logo staat op dit moment niet op de homepage. Vragen? Mail info@holland-recruitment.nl.'
    : 'Uw logo staat op de homepage bij ‘Bedrijven op ons platform’.';
  return (
    <div className="p-stack" style={{ gap: 4 }}>
      <label className="p-check">
        <input type="checkbox" name="logo_tonen" checked={v} disabled={bezig}
          onChange={e => { const n = e.target.checked; setV(n); setOk(false); start(async () => { await zetLogoTonen(n); setOk(true); }); }} />
        <span>Toon ons logo op de homepage bij &lsquo;Bedrijven op ons platform&rsquo;</span>
      </label>
      <span className="p-xs p-muted" role="status">{ok ? `Opgeslagen. ${status}` : status}</span>
    </div>
  );
}
