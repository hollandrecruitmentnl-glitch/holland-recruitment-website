'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
    if (!ingelogd) { router.push(`/registreren?rol=${doel === 'freelancer' ? 'bedrijf' : 'freelancer'}&terug=${encodeURIComponent(terug)}&ctx=bericht`); return; }
    start(async () => {
      const r = await startGesprek(doel, doelId, tekst, opdrachtId);
      if (r?.fout) { setFout(r.fout); return; }
      try { sessionStorage.removeItem(sleutel); } catch {}
      if (r?.gesprek) router.push(`/mijn/berichten/${r.gesprek}?melding=verstuurd`);
    });
  };
  if (ingelogd && !magSturen) return null;
  return (
    <div id="bericht" className="p-card p-stack" style={{ scrollMarginTop: 100 }}>
      <strong className="p-h3">Stuur {naam} een bericht</strong>
      {hersteld && ingelogd && <p className="p-ok p-small" role="status">Je bericht staat nog klaar. Controleer het en verstuur.</p>}
      <div className="field">
        <label htmlFor="bericht-tekst">Je bericht</label>
        <textarea id="bericht-tekst" rows={5} value={tekst} onChange={e => setTekst(e.target.value)} maxLength={4000} placeholder={placeholder || 'Stel jezelf kort voor en vertel waarover je contact zoekt.'} aria-invalid={fout ? true : undefined} aria-describedby={fout ? 'bericht-fout' : undefined}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) verstuur(); }} />
        {fout && <span className="err" id="bericht-fout"><span aria-hidden="true">⚠</span>{fout}</span>}
      </div>
      <button type="button" className="btn btn-blue" onClick={verstuur} disabled={bezig} aria-disabled={bezig}>{bezig ? 'Wordt verzonden…' : 'Stuur bericht'}</button>
      {!ingelogd && <p className="p-xs p-muted">Je maakt eerst gratis een account aan in twee stappen. Je bericht blijft bewaard.</p>}
    </div>
  );
}
