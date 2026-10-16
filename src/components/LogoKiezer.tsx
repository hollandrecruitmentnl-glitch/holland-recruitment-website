'use client';
import { useEffect, useRef, useState } from 'react';
import { Fout } from './Velden';

const TYPES = ['png', 'jpg', 'jpeg', 'webp'];
const MAX = 2 * 1024 * 1024;

/**
 * Optioneel logo bij de registratie van een bedrijf (V36).
 * Het bestand gaat mee in hetzelfde formulier; de server controleert het opnieuw (type op inhoud, max 2 MB).
 */
export default function LogoKiezer({ fout }: { fout?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [lokaal, setLokaal] = useState('');
  const [naam, setNaam] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const leeg = () => { if (input.current) input.current.value = ''; setUrl(null); setNaam(''); };
  const kies = (f?: File) => {
    setLokaal('');
    if (!f) { setUrl(null); setNaam(''); return; }
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!TYPES.includes(ext)) { setLokaal('Dit bestandstype kan niet. Kies een PNG-, JPG- of WebP-bestand.'); leeg(); return; }
    if (f.size > MAX) { setLokaal('Dit bestand is te groot. Het maximum is 2 MB.'); leeg(); return; }
    setUrl(URL.createObjectURL(f)); setNaam(f.name);
  };
  const f = lokaal || fout;
  return (
    <div className="field">
      <label htmlFor="v-logo">Logo (optioneel)</label>
      <div className="reg-logo">
        <span className="reg-logo-vb" aria-hidden="true">{url ? <img src={url} alt="" /> : <span>Logo</span>}</span>
        <div className="reg-logo-acties">
          <input id="v-logo" ref={input} type="file" name="logo" className="sr-only" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            aria-invalid={f ? true : undefined} aria-describedby={['v-logo-hint', f ? 'v-logo-err' : ''].filter(Boolean).join(' ')} onChange={e => kies(e.target.files?.[0])} />
          <label htmlFor="v-logo" className="btn btn-line btn-sm reg-logo-knop">{url ? 'Ander logo kiezen' : 'Logo kiezen'}</label>
          {naam && <span className="p-xs p-muted reg-logo-naam">{naam}</span>}
          {url && <button type="button" className="p-linkbtn" onClick={leeg}>Logo weghalen</button>}
        </div>
      </div>
      <span className="hint" id="v-logo-hint">PNG, JPG of WebP, maximaal 2 MB. U kunt het logo later ook toevoegen of wijzigen in uw bedrijfsprofiel.</span>
      <Fout id="v-logo-err" tekst={f} />
      <input type="hidden" name="logo_keuze" value="1" />
      <label className="p-check" style={{ marginTop: 6 }}><input type="checkbox" name="logo_tonen" defaultChecked /><span>Toon ons logo op de homepage bij &lsquo;Bedrijven op ons platform&rsquo; (zodra ons e-mailadres is bevestigd)</span></label>
    </div>
  );
}
