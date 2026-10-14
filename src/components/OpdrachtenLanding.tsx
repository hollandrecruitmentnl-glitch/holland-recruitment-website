import type { Metadata } from 'next';
import Link from 'next/link';
import { huidigAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { zoekOpdrachten, landingTellingen, MIN_LANDING } from '@/lib/data/opdrachten';
import { Leeg, OpdrachtKaart, Paginering } from '@/components/Kaarten';
import { REGIOS, VAKGEBIEDEN, regioNaam, vakgebiedNaam, vakKlein } from '@/lib/constants';
import { datumNL } from '@/lib/util';
import { SITE } from '@/lib/mail';

/**
 * SEO-landingspagina's: /freelance-opdrachten/<vakgebied>, /freelance-opdrachten/<regio>, /freelance-opdrachten/<vakgebied>/<regio>.
 * Dagelijks vers door de feeds; geïndexeerd vanaf MIN_LANDING open opdrachten, anders noindex (geen dunne pagina's).
 * Geen JobPosting-markup op lijstpagina's (Google-richtlijn); die staat alleen op eigen opdrachtpagina's.
 */
export type Landing = { vakgebied: string | null; regio: string | null };

export function leesLanding(a: string, b?: string): Landing | null {
  const isVak = (s: string) => VAKGEBIEDEN.some(v => v.slug === s);
  const isReg = (s: string) => REGIOS.some(r => r.slug === s);
  if (b === undefined) return isVak(a) ? { vakgebied: a, regio: null } : isReg(a) ? { vakgebied: null, regio: a } : null;
  return isVak(a) && isReg(b) ? { vakgebied: a, regio: b } : null;
}

export const landingPad = (l: Landing) => `/freelance-opdrachten/${[l.vakgebied, l.regio].filter(Boolean).join('/')}`;

function teksten(l: Landing) {
  const v = l.vakgebied ? vakKlein(vakgebiedNaam(l.vakgebied)) : '', r = l.regio ? regioNaam(l.regio) : '';
  const titel = v && r ? `Freelance opdrachten ${v} in ${r}` : v ? `Freelance opdrachten ${v}` : `Freelance opdrachten in ${r}`;
  const kort = v && r ? `${v} in ${r}` : v ? v : `in ${r}`;
  const intro = v && r
    ? `Actuele freelance en interim opdrachten in ${v} in en rond ${r}. Direct geplaatst door bedrijven op ons platform, aangevuld met opdrachten van andere platforms. De lijst wordt elke dag bijgewerkt.`
    : v
      ? `Actuele freelance en interim opdrachten in ${v} in heel Nederland, op locatie, hybride en remote. Direct geplaatst door bedrijven op ons platform, aangevuld met opdrachten van andere platforms. De lijst wordt elke dag bijgewerkt.`
      : `Actuele freelance en interim opdrachten in en rond ${r}, in alle vakgebieden. Direct geplaatst door bedrijven op ons platform, aangevuld met opdrachten van andere platforms. De lijst wordt elke dag bijgewerkt.`;
  return { titel, kort, intro };
}

const zoek = (l: Landing, pagina: number) => zoekOpdrachten({
  vakgebied: l.vakgebied ? [l.vakgebied] : undefined, locatie: l.regio ? regioNaam(l.regio) : undefined, zonderRemote: !!l.regio, pagina, perPagina: 20,
});

export async function landingMetadata(l: Landing, pagina: number): Promise<Metadata> {
  const { titel, kort } = teksten(l);
  const res = await zoek(l, 1);
  const basis = landingPad(l);
  return {
    title: (() => { const t = pagina > 1 ? `${titel} (pagina ${pagina})` : titel; return t.length > 44 ? { absolute: t } : t; })(),
    description: `Bekijk actuele freelance en interim opdrachten ${kort}. Dagelijks bijgewerkt, met tarief, uren en startdatum waar bekend. Gratis reageren of een profiel aanmaken.`,
    alternates: { canonical: pagina > 1 ? `${basis}?pagina=${pagina}` : basis },
    robots: res.totaal < MIN_LANDING ? { index: false, follow: true } : undefined,
  };
}

export default async function OpdrachtenLanding({ l, pagina }: { l: Landing; pagina: number }) {
  const { titel, intro } = teksten(l);
  const a = await huidigAccount();
  const res = await zoek(l, pagina);
  const basis = landingPad(l);
  const gereageerd = a?.rol === 'freelancer' ? new Set((await q<{ opdracht_id: string }>('select opdracht_id from reacties where freelancer_id = $1', [a.id])).map(r => r.opdracht_id)) : new Set<string>();
  const tellingen = await landingTellingen();
  const laatst = res.items[0]?.geplaatst_op;
  // Verwante pagina's die zelf genoeg opdrachten hebben (interne links naar indexeerbare pagina's)
  const verwantRegio = tellingen.filter(t => t.n >= MIN_LANDING && t.regio && (l.vakgebied ? t.vakgebied === l.vakgebied : t.vakgebied === null) && t.regio !== l.regio).sort((x, y) => y.n - x.n).slice(0, 12);
  const verwantVak = tellingen.filter(t => t.n >= MIN_LANDING && t.vakgebied && (l.regio ? t.regio === l.regio : t.regio === null) && t.vakgebied !== l.vakgebied).sort((x, y) => y.n - x.n).slice(0, 12);
  const kruimel = [{ naam: 'Home', pad: '/' }, { naam: 'Opdrachten', pad: '/opdrachten' }, ...(l.vakgebied && l.regio ? [{ naam: vakgebiedNaam(l.vakgebied), pad: `/freelance-opdrachten/${l.vakgebied}` }] : []), { naam: titel, pad: basis }];
  const filterUrl = `/opdrachten?${new URLSearchParams([...(l.vakgebied ? [['vakgebied', l.vakgebied]] : []), ...(l.regio ? [['locatie', regioNaam(l.regio)]] : [])])}`;

  return (
    <>
      <div className="p-searchband">
        <div className="p-wrap">
          <nav aria-label="Kruimelpad" className="p-xs p-muted" style={{ paddingTop: 4 }}>{kruimel.slice(0, -1).map((k, i) => <span key={k.pad}>{i > 0 && ' › '}<Link className="p-link" href={k.pad}>{k.naam}</Link></span>)}</nav>
          <h1 className="p-h2" style={{ margin: '8px 0 8px' }}>{titel}</h1>
          <p className="p-muted" style={{ maxWidth: 760, margin: 0 }}>{intro}</p>
          <p className="p-small" style={{ margin: '10px 0 0' }}><strong>{res.totaal === 1 ? '1 open opdracht' : `${res.totaal} open opdrachten`}</strong>{laatst && <span className="p-muted"> · nieuwste geplaatst op {datumNL(laatst)}</span>} · <Link className="p-link" href={filterUrl}>Verfijn met filters</Link></p>
        </div>
      </div>
      <div className="p-wrap" style={{ display: 'grid', gap: 18, padding: '22px 26px 40px' }}>
        <div className="p-stack" style={{ maxWidth: 860 }}>
          {res.items.length ? res.items.map(o => <OpdrachtKaart key={o.id} o={o} reageerde={gereageerd.has(o.id)} />) : (
            <Leeg titel="Op dit moment geen open opdrachten" tekst="Nieuwe opdrachten komen er elke dag bij. Bekijk alle opdrachten, of maak een gratis profiel zodat bedrijven jou kunnen vinden.">
              <div className="p-row" style={{ justifyContent: 'center' }}>
                <Link className="btn btn-line btn-sm" href="/opdrachten">Alle opdrachten</Link>
                {!a && <Link className="btn btn-blue btn-sm" href="/registreren?rol=freelancer">Maak gratis profiel</Link>}
              </div>
            </Leeg>
          )}
          <Paginering pagina={res.pagina} totaal={res.totaal} per={res.perPagina} basis={p => (p > 1 ? `${basis}?pagina=${p}` : basis)} />
          {res.items.some(o => o.bron !== 'direct') && <p className="p-xs p-muted">Externe opdrachten komen van andere websites. We tonen altijd de bron; reageren gaat via die website.</p>}
        </div>
        {!a && (
          <section className="p-next" style={{ maxWidth: 860 }}>
            <div className="p-stack" style={{ gap: 4, flex: '1 1 320px' }}>
              <h2 className="p-h3">Freelancer? Laat bedrijven jou vinden</h2>
              <p className="p-small p-muted" style={{ margin: 0 }}>Maak een gratis profiel met je vakgebied, tarief en beschikbaarheid. Bedrijven zoeken op het platform en nemen direct contact op.</p>
              <p className="p-xs p-muted" style={{ margin: '4px 0 0' }}>Opdrachtgever? <Link className="p-link" href="/registreren?rol=bedrijf">Plaats zelf een opdracht</Link> of <Link className="p-link" href="/bemiddeling">laat ons bemiddelen</Link>.</p>
            </div>
            <Link className="btn btn-blue btn-sm" href="/registreren?rol=freelancer">Maak gratis profiel</Link>
          </section>
        )}
        {(verwantRegio.length > 0 || verwantVak.length > 0) && (
          <section className="p-grid2" style={{ maxWidth: 860 }}>
            {verwantVak.length > 0 && <div><h2 style={{ fontSize: 18, marginBottom: 10 }}>{l.regio ? `Andere vakgebieden in ${regioNaam(l.regio)}` : 'Andere vakgebieden'}</h2><div className="p-row" style={{ gap: 8 }}>{verwantVak.map(t => <Link key={t.pad} className="p-chip" href={t.pad}>{vakgebiedNaam(t.vakgebied)} ({t.n})</Link>)}</div></div>}
            {verwantRegio.length > 0 && <div><h2 style={{ fontSize: 18, marginBottom: 10 }}>{l.vakgebied ? `${vakgebiedNaam(l.vakgebied)} in andere regio’s` : 'Andere regio’s'}</h2><div className="p-row" style={{ gap: 8 }}>{verwantRegio.map(t => <Link key={t.pad} className="p-chip" href={t.pad}>{regioNaam(t.regio)} ({t.n})</Link>)}</div></div>}
          </section>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: kruimel.map((k, i) => ({ '@type': 'ListItem', position: i + 1, name: k.naam, item: SITE + k.pad })),
      }) }} />
    </>
  );
}
