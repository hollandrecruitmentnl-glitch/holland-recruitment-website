'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { startGesprek } from '@/app/actions/berichten';

/** Bericht starten vanaf profiel, bedrijfspagina of opdracht. Bezoekers: tekst blijft bewaard tijdens registratie (contextbehoud). */
export default function BerichtStarter({ doel, doelId, opdrachtId, naam, ingelogd, magSturen, terug, placeholder }: {
  doel: 'freelancer' | 'bedrijf'; doelId: string; opdrachtId?: string; naam: string; ingelogd: boolean; magSturen: boolean; terug: string; placeholder?: string;
}) {
  const sleutel = `hr-concept-${doel}-${doelId}-${opdrachtId || ''}`;
  const [tekst, setTekst] = useState('');
  const [fout, setFout] = useState('');
  const [hersteld, setHersteld] = useState(false);
  const [bezig, start] = useTransition();
  const router = useRouter();
  useEffect(() => {
    try { const t = sessionStorage.getItem(sleutel); if (t) { setTekst(t); setHersteld(true); } } catch {}
  }, [sleutel]);
  useEffect(() => { try { if (tekst) sessionStorage.setItem(sleutel, tekst); } catch {} }, [tekst, sleutel]);

  const verstuur = () => {
    setFout('');
    if (tekst.trim().length < 2) { setFout('Schrijf eerst een bericht.'); return; }
    start(async () => {
      const r = await startGesprek(doel, doelId, tekst, opdrachtId);
      if (r?.fout) { setFout(r.fout); return; }
      try { sessionStorage.removeItem(sleutel); } catch {}
      if (r?.gesprek) router.push(`/mijn/berichten/${r.gesprek}?melding=verstuurd`);
    });
  };
  if (ingelogd && !magSturen) return null;
  // Bericht aan een freelancer komt van een (toekomstig) bedrijf: u-vorm.
  const u = doel === 'freelancer';
  if (!ingelogd) {
    // Bezoekers: eerst een (gratis) account, daarna direct terug naar dit berichtvak.
    const q = `terug=${encodeURIComponent(terug)}`;
    return (
      <div id="bericht" className="p-card p-stack" style={{ scrollMarginTop: 100 }}>
        <strong className="p-h3">Stuur {naam} een bericht</strong>
        <p className="p-small p-muted" style={{ margin: 0 }}>{u ? 'Om een bericht te sturen heeft u een gratis account nodig. Dat kost twee stappen; daarna komt u direct hier terug.' : 'Om een bericht te sturen heb je een gratis account nodig. Dat kost twee stappen; daarna kom je direct hier terug.'}</p>
        <div className="p-row" style={{ gap: 10 }}>
          <Link className="btn btn-blue" href={`/registreren?rol=${doel === 'freelancer' ? 'bedrijf' : 'freelancer'}&${q}&ctx=bericht`}>Maak gratis account</Link>
          <Link className="btn btn-line" href={`/inloggen?${q}`}>Inloggen</Link>
        </div>
      </div>
    );
  }
  return (
    <div id="bericht" className="p-card p-stack" style={{ scrollMarginTop: 100 }}>
      <strong className="p-h3">Stuur {naam} een bericht</strong>
      {hersteld && ingelogd && <p className="p-ok p-small" role="status">{u ? 'Uw' : 'Je'} bericht staat nog klaar. Controleer het en verstuur.</p>}
      <div className="field">
        <label htmlFor="bericht-tekst">{u ? 'Uw bericht' : 'Je bericht'}</label>
        <textarea id="bericht-tekst" rows={5} value={tekst} onChange={e => setTekst(e.target.value)} maxLength={4000} placeholder={placeholder || (u ? 'Stel uzelf kort voor en vertel waarover u contact zoekt.' : 'Stel jezelf kort voor en vertel waarover je contact zoekt.')} aria-invalid={fout ? true : undefined} aria-describedby={fout ? 'bericht-fout' : undefined}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) verstuur(); }} />
        {fout && <span className="err" id="bericht-fout"><span aria-hidden="true">⚠</span>{fout}</span>}
      </div>
      <button type="button" className="btn btn-blue" onClick={verstuur} disabled={bezig} aria-disabled={bezig}>{bezig ? 'Wordt verzonden…' : 'Stuur bericht'}</button>
    </div>
  );
}
