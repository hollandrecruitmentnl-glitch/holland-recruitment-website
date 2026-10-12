import { blokkeerAccount } from '@/app/actions/beheer';

export default function Blokkeer({ soort, id, status, reden, terug, fout }: { soort: 'freelancer' | 'bedrijf'; id: string; status: string; reden?: string | null; terug: string; fout?: boolean }) {
  return status === 'geblokkeerd' ? (
    <form action={blokkeerAccount} className="p-card p-stack" style={{ gap: 8 }}>
      <input type="hidden" name="soort" value={soort} /><input type="hidden" name="id" value={id} /><input type="hidden" name="actie" value="toelaten" /><input type="hidden" name="terug" value={terug} />
      <strong>Geblokkeerd</strong><span className="p-small">Reden: {reden}</span>
      <button className="btn btn-line btn-sm" style={{ alignSelf: 'flex-start' }}>Weer toelaten</button>
    </form>
  ) : (
    <details className="p-card">
      <summary className="btn btn-danger btn-sm" style={{ listStyle: 'none', display: 'inline-flex' }}>Blokkeren</summary>
      <form action={blokkeerAccount} className="p-stack" style={{ gap: 8, marginTop: 12 }}>
        <input type="hidden" name="soort" value={soort} /><input type="hidden" name="id" value={id} /><input type="hidden" name="actie" value="blokkeren" /><input type="hidden" name="terug" value={terug} />
        <div className="field"><label htmlFor={`r-${id}`}>Reden (gaat per e-mail naar het account)</label><textarea id={`r-${id}`} name="reden" rows={3} required minLength={5} aria-invalid={fout || undefined} /></div>
        {fout && <span className="err">⚠ Vul een reden in.</span>}
        <button className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }}>Blokkeer account</button>
      </form>
    </details>
  );
}
