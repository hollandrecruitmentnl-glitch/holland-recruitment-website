'use client';
import type { FormState } from '@/app/actions/auth';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { registreren } from '@/app/actions/auth';
import { FoutSamenvatting, Keuze, Veld } from './Velden';
import { Verzend, WachtwoordVeld, useActie } from './Client';
import { VAKGEBIEDEN, GRATIS_MAILDIENSTEN } from '@/lib/constants';

const STAP1 = { freelancer: ['voornaam', 'achternaam', 'email', 'wachtwoord'], bedrijf: ['contactnaam', 'email', 'wachtwoord'] } as const;

export default function RegistratieForm({ rolStart, terug, ctx, uitnodiging, uitnodigingBedrijf, uitnodigingEmail }: { rolStart?: string; terug?: string; ctx?: string; uitnodiging?: string; uitnodigingBedrijf?: string; uitnodigingEmail?: string }) {
  const [s, onSubmit, pending] = useActie(registreren, undefined as FormState);
  const [rol, setRol] = useState<'freelancer' | 'bedrijf' | ''>(uitnodiging ? 'bedrijf' : (rolStart === 'freelancer' || rolStart === 'bedrijf' ? rolStart : ''));
  const [stap, setStap] = useState(1);
  const [lokaal, setLokaal] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const kop = useRef<HTMLHeadingElement>(null);
  const fouten = { ...(s?.fouten || {}), ...lokaal };
  const w = s?.waarden || {};
  useEffect(() => {
    if (!s?.fouten) return;
    const st1 = rol ? (STAP1[rol] as readonly string[]) : [];
    if (Object.keys(s.fouten).some(k => st1.includes(k))) setStap(1);
    (document.querySelector('.p-err-summary') as HTMLElement | null)?.focus();
  }, [s, rol]);
  useEffect(() => { kop.current?.focus(); }, [stap, rol]);

  const volgende = () => {
    if (!form.current || !rol) return;
    const fd = new FormData(form.current); const f: Record<string, string> = {};
    const email = String(fd.get('email') || '').trim().toLowerCase();
    if (rol === 'freelancer') { if (!String(fd.get('voornaam')).trim()) f.voornaam = 'Vul je voornaam in.'; if (!String(fd.get('achternaam')).trim()) f.achternaam = 'Vul je achternaam in.'; }
    else if (String(fd.get('contactnaam')).trim().split(/\s+/).filter(Boolean).length < 2) f.contactnaam = 'Vul uw voor- en achternaam in.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) f.email = 'Vul een geldig e-mailadres in, bijvoorbeeld naam@bedrijf.nl.';
    else if (rol === 'bedrijf' && GRATIS_MAILDIENSTEN.includes(email.split('@')[1])) f.email = 'Gebruik uw zakelijke e-mailadres. Adressen van gratis maildiensten zoals Gmail of Hotmail kunnen niet.';
    if (String(fd.get('wachtwoord') || '').length < 8) f.wachtwoord = 'Kies een wachtwoord van minimaal 8 tekens.';
    setLokaal(f);
    if (Object.keys(f).length) { setTimeout(() => (document.querySelector('.p-err-summary') as HTMLElement | null)?.focus(), 0); return; }
    if (uitnodiging) { form.current.requestSubmit(); return; }
    setStap(2);
  };

  if (!rol) return (
    <div className="p-stack reg-keuze" style={{ gap: 22 }}>
      <div>
        <h1 className="p-h2" tabIndex={-1} ref={kop}>Maak een gratis account</h1>
        <p className="p-muted" style={{ margin: '8px 0 0' }}>Gratis · klaar in 2 minuten · geen verplichtingen</p>
      </div>
      {ctx && <p className="p-note">{ctx === 'bericht' ? 'Maak eerst een gratis account aan. Daarna kom je direct terug en kun je je bericht sturen.' : 'Maak eerst een account aan. Daarna kun je direct reageren.'}</p>}
      <div className="reg-kaarten" role="group" aria-label="Kies je rol">
        <button type="button" className="reg-kaart" onClick={() => setRol('bedrijf')}>
          <span className="reg-tag">Voor bedrijven</span>
          <strong className="p-h3">Ik zoek een freelancer</strong>
          <ul><li>Plaats gratis een opdracht</li><li>Zoek zelf in profielen en stuur direct een bericht</li><li>De eerste 6 maanden is alles gratis</li></ul>
          <span className="btn btn-blue">Account voor bedrijven →</span>
        </button>
        <button type="button" className="reg-kaart" onClick={() => setRol('freelancer')}>
          <span className="reg-tag">Voor freelancers</span>
          <strong className="p-h3">Ik ben freelancer</strong>
          <ul><li>Gratis profiel, gevonden worden door bedrijven</li><li>Reageer direct op opdrachten</li><li>Optioneel: ook voorgesteld via onze bemiddeling</li></ul>
          <span className="btn btn-ink">Profiel voor freelancers →</span>
        </button>
      </div>
      <p className="p-small">Heb je al een account? <Link className="p-link" href={`/inloggen${terug ? `?terug=${encodeURIComponent(terug)}` : ''}`}>Log in</Link></p>
      <p className="p-small p-muted">Liever dat wij voor u zoeken? <a className="p-link" href="/professional-aanvragen">Vraag bemiddeling aan</a>. Daarvoor is geen account nodig.</p>
    </div>
  );

  return (
    <form ref={form} className="p-form" noValidate onSubmit={e => { if (stap === 1 && !uitnodiging) { e.preventDefault(); volgende(); } else onSubmit(e); }}>
      <input type="hidden" name="rol" value={rol} />
      <input type="hidden" name="terug" value={terug || ''} />
      <input type="hidden" name="uitnodiging" value={uitnodiging || ''} />
      <input type="text" name="website_hp" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      <div className="p-between">
        <span className="p-small p-muted">{uitnodiging ? `Uitnodiging voor ${uitnodigingBedrijf}` : `Stap ${stap} van 2 · ${rol === 'freelancer' ? 'Freelancer' : 'Bedrijf'}`}</span>
        {!uitnodiging && <button type="button" className="p-linkbtn" onClick={() => (stap === 2 ? setStap(1) : setRol(''))}>← Terug</button>}
      </div>
      <h1 className="p-h2" tabIndex={-1} ref={kop}>{stap === 1 ? (rol === 'freelancer' ? 'Maak je freelancerprofiel' : 'Maak een account voor uw bedrijf') : (rol === 'freelancer' ? 'Wat voor werk doe je?' : 'Over uw bedrijf')}</h1>
      {stap === 1 && !uitnodiging && <p className="p-small p-muted" style={{ margin: 0 }}>Gratis · klaar in 2 minuten{rol === 'bedrijf' ? <> · liever dat wij zoeken? <a className="p-link" href="/professional-aanvragen">Vraag bemiddeling aan</a></> : ''}</p>}
      {ctx && stap === 1 && <p className="p-note">{ctx === 'bericht' ? (rol === 'bedrijf' ? 'Maak eerst een gratis account aan. Daarna komt u direct terug en kunt u uw bericht sturen.' : 'Maak eerst een gratis account aan. Daarna kom je direct terug en kun je je bericht sturen.') : 'Maak eerst een account aan. Daarna kun je direct reageren.'}</p>}
      <FoutSamenvatting fouten={fouten} />
      <div style={{ display: stap === 1 ? 'contents' : 'none' }}>
        {rol === 'freelancer' ? (
          <div className="p-grid2"><Veld naam="voornaam" label="Voornaam" waarde={w.voornaam} fout={fouten.voornaam} verplicht auto="given-name" /><Veld naam="achternaam" label="Achternaam" waarde={w.achternaam} fout={fouten.achternaam} verplicht auto="family-name" /></div>
        ) : <Veld naam="contactnaam" label="Uw naam" waarde={w.contactnaam} fout={fouten.contactnaam} verplicht auto="name" hint="Voor- en achternaam" />}
        <Veld naam="email" label={rol === 'bedrijf' ? 'Zakelijk e-mailadres' : 'E-mailadres'} type="email" waarde={w.email || uitnodigingEmail} fout={fouten.email} verplicht auto="email" />
        <WachtwoordVeld id="v-wachtwoord" name="wachtwoord" label="Wachtwoord" autoComplete="new-password" invalid={!!fouten.wachtwoord} hint="Minimaal 8 tekens." />
        {fouten.wachtwoord && <span className="err" style={{ color: '#B4331A', fontSize: 13.5, fontWeight: 600 }}>⚠ {fouten.wachtwoord}</span>}
        {uitnodiging ? <Verzend pending={pending}>Account aanmaken</Verzend> : <button type="button" className="btn btn-blue" onClick={volgende}>Volgende</button>}
      </div>
      <div style={{ display: stap === 2 ? 'contents' : 'none' }}>
        {rol === 'freelancer' ? <>
          <Veld naam="functietitel" label="Functietitel" waarde={w.functietitel} fout={fouten.functietitel} verplicht placeholder="Bijvoorbeeld Maintenance Engineer" />
          <Keuze naam="vakgebied" label="Vakgebied" opties={VAKGEBIEDEN.map(v => ({ v: v.slug, l: v.naam }))} waarde={w.vakgebied} fout={fouten.vakgebied} verplicht leeg="Kies je vakgebied" />
          <Veld naam="regio" label="Regio" waarde={w.regio} fout={fouten.regio} verplicht placeholder="Bijvoorbeeld Rotterdam" auto="address-level2" />
          <label className="p-check"><input type="checkbox" name="ook_bemiddeld" defaultChecked /><span>Holland Recruitment mag mij ook voorstellen voor opdrachten via bemiddeling</span></label>
        </> : <>
          <Veld naam="bedrijfsnaam" label="Bedrijfsnaam" waarde={w.bedrijfsnaam} fout={fouten.bedrijfsnaam} verplicht auto="organization" />
          <Veld naam="kvk" label="KvK-nummer" waarde={w.kvk} fout={fouten.kvk} verplicht inputMode="numeric" maxLength={8} pattern="\d{8}" hint="8 cijfers. We controleren het nummer bij de KvK." />
          <Veld naam="website" label="Website (optioneel)" waarde={w.website} fout={fouten.website} placeholder="www.bedrijf.nl" auto="url" />
          <Veld naam="plaats" label="Plaats" waarde={w.plaats} fout={fouten.plaats} verplicht auto="address-level2" />
        </>}
        {rol === 'bedrijf'
          ? <p className="p-xs p-muted">Door een account te maken gaat u akkoord met de <a className="p-link" href="/voorwaarden" target="_blank">gebruiksvoorwaarden</a>. Hoe we met uw gegevens omgaan, leest u in de <a className="p-link" href="/privacyverklaring" target="_blank">privacyverklaring</a>.</p>
          : <p className="p-xs p-muted">Door een account te maken ga je akkoord met de <a className="p-link" href="/voorwaarden" target="_blank">gebruiksvoorwaarden</a>. Hoe we met je gegevens omgaan, lees je in de <a className="p-link" href="/privacyverklaring" target="_blank">privacyverklaring</a>.</p>}
        <Verzend pending={pending} bezig="Account wordt aangemaakt…">Account aanmaken</Verzend>
      </div>
      {stap === 1 && !uitnodiging && <p className="p-small">{rol === 'bedrijf' ? 'Heeft u al een account?' : 'Heb je al een account?'} <Link className="p-link" href={`/inloggen${terug ? `?terug=${encodeURIComponent(terug)}` : ''}`}>Log in</Link></p>}
    </form>
  );
}
