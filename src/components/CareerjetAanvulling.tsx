import { careerjetZoek } from '@/lib/careerjet';
import { SITE } from '@/lib/mail';

/** Live aanvulling onder de zoekresultaten (wordt niet opgeslagen, conform de Careerjet-voorwaarden). */
export default async function CareerjetAanvulling({ q, locatie }: { q: string; locatie: string }) {
  const res = await careerjetZoek(q, locatie, `${SITE}/opdrachten`);
  if (!res.length) return null;
  return (
    <section className="p-stack" aria-labelledby="cj-kop" style={{ marginTop: 18 }}>
      <div className="p-between"><h2 id="cj-kop" className="p-h3">Meer opdrachten op andere websites</h2>
        <span className="p-xs p-muted">Live via <a className="p-link" href="https://www.careerjet.nl" target="_blank" rel="noopener">Careerjet</a></span></div>
      {res.map(x => (
        <article key={x.url} className="p-result" style={{ gap: 6 }}>
          <span className="p-src">Externe opdracht · via Careerjet</span>
          <h3><a href={x.url} target="_blank" rel="noopener nofollow">{x.titel} ↗</a></h3>
          <p className="p-muted p-small">{[x.bedrijf, x.locatie, x.salaris].filter(Boolean).join(' · ')}</p>
          {x.omschrijving && <p className="p-small">{x.omschrijving}</p>}
        </article>
      ))}
    </section>
  );
}
