'use client';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { blokkeerGesprek, meldGesprek, stuurBericht, zetLabel } from '@/app/actions/berichten';
import { GESPREK_LABELS } from '@/lib/constants';

type M = { id: string; afzender_id: string | null; systeem: boolean; tekst: string; bijlage_naam: string | null; bijlage_grootte: number | null; heeft_bijlage: boolean; aangemaakt: string; voornaam?: string; status?: 'bezig' | 'mislukt'; tmp?: string; file?: File | null; fout?: string };

const tijd = (d: string) => new Date(d).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
const dag = (d: string) => new Date(d).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
const kb = (n: number | null) => (n == null ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} kB`);

export default function Chat({ gesprek, ander, mijnId, rol, start, gelezenTot }: {
  gesprek: { id: string; label: string; geblokkeerd: boolean; opdracht: { titel: string; slug: string } | null };
  ander: { naam: string; link: string; linkTekst: string }; mijnId: string; rol: string; start: M[]; gelezenTot: string | null;
}) {
  const [msgs, setMsgs] = useState<M[]>(start);
  const [gelezen, setGelezen] = useState(gelezenTot);
  const [label, setLabelState] = useState(gesprek.label);
  const [geblokt, setGeblokt] = useState(gesprek.geblokkeerd);
  const [tekst, setTekst] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fout, setFout] = useState('');
  const [menu, setMenu] = useState<'' | 'menu' | 'melden' | 'blok'>('');
  const [gemeld, setGemeld] = useState(false);
  const lijst = useRef<HTMLDivElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const sleutel = `hr-chat-${gesprek.id}`;

  useEffect(() => { try { const t = sessionStorage.getItem(sleutel); if (t) setTekst(t); } catch {} }, [sleutel]);
  useEffect(() => { try { tekst ? sessionStorage.setItem(sleutel, tekst) : sessionStorage.removeItem(sleutel); } catch {} }, [tekst, sleutel]);
  useLayoutEffect(() => { lijst.current?.scrollTo({ top: lijst.current.scrollHeight }); }, [msgs.length]);

  const poll = useCallback(async () => {
    const laatste = [...msgs].reverse().find(m => !m.tmp);
    try {
      const r = await fetch(`/api/gesprek/${gesprek.id}${laatste ? `?na=${laatste.id}` : ''}`, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (j.berichten?.length) setMsgs(x => { const ids = new Set(x.map(m => m.id)); return [...x, ...j.berichten.filter((m: M) => !ids.has(m.id))]; });
      setGelezen(j.gelezenTot); setLabelState(j.label); setGeblokt(j.geblokkeerd);
    } catch {}
  }, [msgs, gesprek.id]);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) poll(); }, 5000);
    const on = () => poll(); window.addEventListener('online', on);
    return () => { clearInterval(id); window.removeEventListener('online', on); };
  }, [poll]);

  const verzend = async (m: M) => {
    const fd = new FormData(); fd.set('gesprek', gesprek.id); fd.set('tekst', m.tekst); if (m.file) fd.set('bijlage', m.file);
    if (!navigator.onLine) { setMsgs(x => x.map(y => (y.tmp === m.tmp ? { ...y, status: 'mislukt', fout: 'Geen verbinding' } : y))); return; }
    try {
      const r = await stuurBericht(fd);
      if (r.fout || !r.bericht) setMsgs(x => x.map(y => (y.tmp === m.tmp ? { ...y, status: 'mislukt', fout: r.fout } : y)));
      else setMsgs(x => x.map(y => (y.tmp === m.tmp ? { ...y, ...r.bericht!, status: undefined, tmp: undefined, file: null, afzender_id: mijnId, systeem: false } : y)));
    } catch { setMsgs(x => x.map(y => (y.tmp === m.tmp ? { ...y, status: 'mislukt', fout: 'Geen verbinding' } : y))); }
  };
  const stuur = () => {
    setFout('');
    const t = tekst.trim();
    if (!t && !file) return;
    if (file && file.size > 10 * 1024 * 1024) { setFout('Dit bestand is te groot. Het maximum is 10 MB.'); return; }
    const m: M = { id: `tmp-${Date.now()}`, tmp: `tmp-${Date.now()}`, afzender_id: mijnId, systeem: false, tekst: t, bijlage_naam: file?.name ?? null, bijlage_grootte: file?.size ?? null, heeft_bijlage: false, aangemaakt: new Date().toISOString(), status: 'bezig', file };
    setMsgs(x => [...x, m]); setTekst(''); setFile(null);
    verzend(m);
  };
  const opnieuw = (m: M) => { setMsgs(x => x.map(y => (y.tmp === m.tmp ? { ...y, status: 'bezig', fout: undefined } : y))); verzend({ ...m, status: 'bezig' }); };
  const kiesLabel = async (l: string) => { setLabelState(l); await zetLabel(gesprek.id, l); poll(); };

  const laatsteEigen = [...msgs].reverse().find(m => m.afzender_id === mijnId && !m.systeem && !m.tmp);
  let vorigeDag = '';
  return (
    <section className="p-chat-main" aria-label={`Gesprek met ${ander.naam}`}>
      <div className="p-chat-ctx">
        <div className="p-row" style={{ gap: 10, minWidth: 0 }}>
          <Link href="/mijn/berichten" className="p-linkbtn" aria-label="Terug naar gesprekken">←</Link>
          <span style={{ minWidth: 0 }}><strong>{ander.naam}</strong><br /><span className="p-xs p-muted">{gesprek.opdracht ? <>Over: <Link className="p-link" href={`/opdrachten/${gesprek.opdracht.slug}`}>{gesprek.opdracht.titel}</Link></> : <>Over: <Link className="p-link" href={ander.link}>{rol === 'bedrijf' ? 'profiel' : 'bedrijf'}</Link></>}</span></span>
        </div>
        <div className="p-row" style={{ gap: 8 }}>
          <label className="sr-only" htmlFor="label">Status van dit gesprek</label>
          <select id="label" value={label} onChange={e => kiesLabel(e.target.value)} disabled={geblokt} style={{ font: 'inherit', fontSize: 14, padding: '8px 10px', border: '1.5px solid var(--line)', borderRadius: 100 }}>{Object.entries(GESPREK_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <div style={{ position: 'relative' }}>
            <button type="button" className="p-chip" aria-haspopup="menu" aria-expanded={menu === 'menu'} onClick={() => setMenu(menu ? '' : 'menu')} aria-label="Meer acties">⋯</button>
            {menu === 'menu' && (
              <div className="p-acct-menu" role="menu" onKeyDown={e => e.key === 'Escape' && setMenu('')}>
                <Link role="menuitem" href={ander.link}>{ander.linkTekst}</Link>
                {gesprek.opdracht && <Link role="menuitem" href={`/opdrachten/${gesprek.opdracht.slug}`}>Bekijk opdracht</Link>}
                <button role="menuitem" type="button" onClick={() => setMenu('melden')}>Meld gesprek</button>
                <button role="menuitem" type="button" onClick={() => setMenu('blok')}>Blokkeer</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {menu === 'melden' && (
        <form className="p-panel p-stack" style={{ margin: 12, gap: 10 }} action={async fd => { await meldGesprek(fd); setGemeld(true); setMenu(''); }}>
          <input type="hidden" name="gesprek" value={gesprek.id} />
          <strong>Gesprek melden</strong><span className="p-small p-muted">Beheer ziet alleen het laatste bericht van de ander, niet het hele gesprek.</span>
          <select name="reden" required aria-label="Reden" style={{ font: 'inherit', padding: 10, border: '2px solid var(--field)', borderRadius: 13 }}><option value="">Kies een reden</option>{['Ongepast of beledigend', 'Spam of reclame', 'Vraagt om betaling of gevoelige gegevens', 'Nep-account', 'Iets anders'].map(r => <option key={r}>{r}</option>)}</select>
          <textarea name="toelichting" rows={2} placeholder="Toelichting (optioneel)" aria-label="Toelichting" style={{ font: 'inherit', padding: 10, border: '2px solid var(--field)', borderRadius: 13 }} />
          <div className="p-row"><button className="btn btn-blue btn-sm">Verstuur melding</button><button type="button" className="btn btn-line btn-sm" onClick={() => setMenu('')}>Annuleren</button></div>
        </form>
      )}
      {menu === 'blok' && (
        <form className="p-panel p-stack" style={{ margin: 12, gap: 10 }} action={async fd => { await blokkeerGesprek(fd); window.location.href = '/mijn/berichten?melding=geblokkeerd'; }}>
          <input type="hidden" name="gesprek" value={gesprek.id} />
          <strong>{ander.naam} blokkeren?</strong><span className="p-small">Jullie kunnen elkaar in dit gesprek geen berichten meer sturen en het verdwijnt uit je lijst.</span>
          <div className="p-row"><button className="btn btn-danger btn-sm">Blokkeer</button><button type="button" className="btn btn-line btn-sm" onClick={() => setMenu('')}>Annuleren</button></div>
        </form>
      )}
      {gemeld && <p className="p-ok p-small" role="status" style={{ margin: 12 }}>Bedankt. We bekijken je melding.</p>}
      <div className="p-chat-msgs" ref={lijst} role="log" aria-live="polite" aria-label="Berichten">
        {msgs.map(m => {
          const d = dag(m.aangemaakt); const nieuweDag = d !== vorigeDag; vorigeDag = d;
          const mijn = m.afzender_id === mijnId;
          return (
            <div key={m.tmp || m.id} style={{ display: 'contents' }}>
              {nieuweDag && <div className="p-sys" style={{ border: 0 }}>{d}</div>}
              {m.systeem ? <div className="p-sys">{m.tekst}</div> : <>
                <div className={`p-msg ${mijn ? 'mine' : 'theirs'}`}>
                  {m.tekst}
                  {m.bijlage_naam && (m.heeft_bijlage ? <a className="p-file" href={`/bestand/bijlage/${m.id}`} download><span aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></svg></span><span>{m.bijlage_naam}<br /><span className="p-xs p-muted">{kb(m.bijlage_grootte)} · Download</span></span></a>
                    : <span className="p-file"><span aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></svg></span>{m.bijlage_naam}</span>)}
                </div>
                <div className={`p-msg-meta ${mijn ? 'mine' : ''}`}>
                  {tijd(m.aangemaakt)}
                  {mijn && (m.status === 'bezig' ? ' · Wordt verzonden…' : m.status === 'mislukt' ? <> · <span style={{ color: '#B4331A', fontWeight: 600 }}>Niet verzonden{m.fout && m.fout !== 'Geen verbinding' ? ` (${m.fout})` : ''}</span> · <button type="button" className="p-linkbtn" style={{ padding: 0, fontSize: 12.5 }} onClick={() => opnieuw(m)}>Opnieuw proberen</button></>
                    : m.id === laatsteEigen?.id ? (gelezen && gelezen >= m.aangemaakt ? ' · Gelezen' : ' · Verzonden') : '')}
                </div>
              </>}
            </div>
          );
        })}
      </div>
      {geblokt ? <p className="p-note p-small" style={{ margin: 12 }}>Dit gesprek is gesloten. Je kunt geen berichten meer sturen.</p> : (
        <div className="p-chat-input">
          <input ref={fileIn} type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" onChange={e => { setFile(e.target.files?.[0] || null); e.target.value = ''; }} aria-label="Bijlage toevoegen" />
          <button type="button" className="p-chip" onClick={() => fileIn.current?.click()} aria-label="Bijlage toevoegen" title="Bijlage (pdf, Word, Excel of afbeelding, max. 10 MB)"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></svg></button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {file && <span className="p-file" style={{ marginTop: 0 }}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></svg> {file.name} · {kb(file.size)} <button type="button" className="p-linkbtn" onClick={() => setFile(null)} aria-label="Bijlage weghalen">×</button></span>}
            <label className="sr-only" htmlFor="chat-tekst">Bericht</label>
            <textarea id="chat-tekst" rows={1} value={tekst} onChange={e => setTekst(e.target.value)} placeholder="Schrijf een bericht" maxLength={4000}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); stuur(); } }} />
            {fout && <span className="err p-small" style={{ color: '#B4331A', fontWeight: 600 }}>⚠ {fout}</span>}
          </div>
          <button type="button" className="btn btn-blue btn-sm" onClick={stuur} disabled={!tekst.trim() && !file}>Verstuur</button>
        </div>
      )}
    </section>
  );
}
