'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { verwijderBestand } from '@/app/actions/profiel';

const INFO = {
  cv: { accept: '.pdf,.doc,.docx', tekst: 'pdf, doc of docx, maximaal 5 MB', max: 5 },
  foto: { accept: '.png,.jpg,.jpeg,.webp', tekst: 'png, jpg of webp, maximaal 3 MB', max: 3 },
  logo: { accept: '.png,.jpg,.jpeg,.webp', tekst: 'png, jpg of webp, maximaal 2 MB', max: 2 },
};

export default function BestandUpload({ soort, huidig, label }: { soort: 'cv' | 'foto' | 'logo'; huidig: string | null; label: string }) {
  const [naam, setNaam] = useState(huidig);
  const [pct, setPct] = useState<number | null>(null);
  const [fout, setFout] = useState('');
  const [ongedaan, setOngedaan] = useState<string | null>(null);
  const [sleep, setSleep] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const i = INFO[soort];

  const upload = (file: File) => {
    setFout('');
    if (!navigator.onLine) { setFout('Geen verbinding. Probeer het opnieuw als je weer online bent.'); return; }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!i.accept.includes(ext)) { setFout(`Dit bestandstype kan niet. Kies een bestand van het type ${i.tekst.split(',')[0].replace(' of', ',')}.`); return; }
    if (file.size > i.max * 1024 * 1024) { setFout(`Dit bestand is te groot. Het maximum is ${i.max} MB.`); return; }
    const fd = new FormData(); fd.append('soort', soort); fd.append('bestand', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = e => e.lengthComputable && setPct(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setPct(null);
      let r: any = {}; try { r = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 400 || r.fout) { setFout(r.fout || 'Uploaden is niet gelukt. Probeer het opnieuw.'); return; }
      setNaam(r.naam || file.name); router.refresh();
    };
    xhr.onerror = () => { setPct(null); setFout('Geen verbinding. Probeer het opnieuw als je weer online bent.'); };
    setPct(0); xhr.send(fd);
  };
  const verwijder = () => {
    setOngedaan(naam); setNaam(null);
    timer.current = setTimeout(async () => { await verwijderBestand(soort); setOngedaan(null); router.refresh(); }, 6000);
  };
  const herstel = () => { if (timer.current) clearTimeout(timer.current); setNaam(ongedaan); setOngedaan(null); };

  return (
    <div className="p-stack" style={{ gap: 10 }} id={soort}>
      <strong className="p-small">{label}</strong>
      {naam && (
        <div className="p-between p-panel" style={{ padding: '12px 16px' }}>
          <span className="p-small">{soort === 'cv' ? <a className="p-link" href="/bestand/cv/mijn">{naam}</a> : naam}</span>
          <span className="p-row" style={{ gap: 10 }}>
            <button type="button" className="p-linkbtn" onClick={() => input.current?.click()}>Vervangen</button>
            <button type="button" className="p-linkbtn" style={{ color: '#B4331A' }} onClick={verwijder}>Verwijderen</button>
          </span>
        </div>
      )}
      {ongedaan && <p className="p-note p-small p-between" role="status"><span>{soort === 'cv' ? 'Cv' : soort === 'foto' ? 'Foto' : 'Logo'} verwijderd.</span><button type="button" className="p-linkbtn" onClick={herstel}>Ongedaan maken</button></p>}
      {!naam && !ongedaan && (
        <div onDragOver={e => { e.preventDefault(); setSleep(true); }} onDragLeave={() => setSleep(false)}
          onDrop={e => { e.preventDefault(); setSleep(false); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
          style={{ border: `2px dashed ${sleep ? 'var(--blue)' : 'var(--field)'}`, borderRadius: 18, padding: 22, textAlign: 'center', background: sleep ? 'var(--blue-soft)' : 'var(--cream)' }}>
          <p className="p-small">Sleep je bestand hierheen of <button type="button" className="p-linkbtn" onClick={() => input.current?.click()}>kies een bestand</button></p>
          <p className="p-xs p-muted">{i.tekst}</p>
        </div>
      )}
      <input ref={input} type="file" accept={i.accept} className="sr-only" aria-label={label} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      {pct !== null && <div className="p-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Uploaden"><span style={{ width: `${pct}%` }} /></div>}
      {fout && <p className="err p-small" role="alert" style={{ color: '#B4331A', fontWeight: 600 }}>⚠ {fout}</p>}
    </div>
  );
}
