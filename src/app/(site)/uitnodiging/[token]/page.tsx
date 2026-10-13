import Link from 'next/link';
import { one } from '@/lib/db';
import { sha256 } from '@/lib/util';
import { vakgebiedNaam, werkvormNaam } from '@/lib/constants';
import UitnodigingForm from '@/components/UitnodigingForm';

export const metadata = { title: 'Profiel activeren', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const VOORBEELD = { voornaam: 'Sanne', achternaam: 'de Vries', functietitel: 'Projectmanager', vakgebied: 'projectmanagement', regio: 'Rotterdam', jaren_ervaring: 12,
  vaardigheden: ['Prince2', 'Stakeholdermanagement', 'Planning'], talen: ['Nederlands', 'Engels'], werkvormen: ['hybride'], uren_per_week: 32, cv_naam: 'cv-sanne.pdf' };

export default async function Activeren({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const voorbeeld = token === 'voorbeeld';
  const p = voorbeeld ? VOORBEELD : await one(`select a.voornaam, a.achternaam, a.status, f.functietitel, f.vakgebied, f.regio, f.jaren_ervaring, f.vaardigheden, f.talen, f.werkvormen, f.uren_per_week, f.cv_naam
      from tokens t join accounts a on a.id = t.account_id join freelancers f on f.id = a.id
      where t.token_hash = $1 and t.soort = 'uitnodiging' and t.gebruikt is null and t.verloopt > now() and a.status = 'uitgenodigd'`, [sha256(token)]);
  if (!p) return (
    <div className="p-narrow" style={{ maxWidth: 560, padding: '48px 26px 64px' }}>
      <h1 className="p-h2" style={{ marginBottom: 12 }}>Deze link werkt niet meer</h1>
      <p>De link is verlopen of al gebruikt. Heb je je profiel al geactiveerd? Log dan in. Anders vraag je via "Wachtwoord vergeten" een nieuwe activatielink aan.</p>
      <div className="p-row" style={{ gap: 10, marginTop: 16 }}><Link className="btn btn-blue btn-sm" href="/inloggen">Inloggen</Link><Link className="btn btn-line btn-sm" href="/wachtwoord-vergeten">Nieuwe link aanvragen</Link></div>
    </div>
  );
  const rij = (l: string, w: string) => <div className="p-between p-small" style={{ gap: 12 }}><span className="p-muted">{l}</span><span style={{ textAlign: 'right' }}>{w || '–'}</span></div>;
  return (
    <div className="p-wrap" style={{ padding: '36px 26px 64px', maxWidth: 980 }}>
      <h1 className="p-h2">Welkom, {p.voornaam}. Activeer je profiel</h1>
      <p className="p-muted" style={{ maxWidth: 680, margin: '8px 0 22px' }}>Op basis van je aanmelding bij Holland Recruitment hebben we dit profiel voor je klaargezet. Het is nog niet zichtbaar. Kies een wachtwoord en bepaal wat zichtbaar is; daarna kunnen bedrijven je vinden en een bericht sturen. Na het activeren kun je alles aanpassen en aanvullen, zoals je uurtarief en een korte introductie.</p>
      <div className="p-grid2" style={{ alignItems: 'start', gap: 18 }}>
        <section className="p-card p-stack" style={{ gap: 10 }} aria-label="Je klaargezette profiel">
          <h2 className="p-h3">Je profiel</h2>
          {rij('Naam', `${p.voornaam} ${p.achternaam}`)}{rij('Functie', p.functietitel)}{rij('Vakgebied', vakgebiedNaam(p.vakgebied))}{rij('Regio', p.regio)}
          {rij('Ervaring', p.jaren_ervaring != null ? `${p.jaren_ervaring} jaar` : '')}{rij('Uren per week', p.uren_per_week ? String(p.uren_per_week) : '')}
          {rij('Werkvorm', (p.werkvormen || []).map((w: string) => werkvormNaam(w)).join(', '))}{rij('Vaardigheden', (p.vaardigheden || []).join(', '))}
          {rij('Talen', (p.talen || []).join(', '))}{rij('Cv', p.cv_naam || 'Nog niet toegevoegd')}
          <p className="p-xs p-muted" style={{ margin: 0 }}>Je telefoonnummer en e-mailadres zijn nooit openbaar. Je uurtarief uit je aanmelding hebben we niet overgenomen; dat vul je zelf in als je wilt.</p>
        </section>
        <section className="p-card"><UitnodigingForm token={token} voorbeeld={voorbeeld} /></section>
      </div>
    </div>
  );
}
