import type { Metadata } from 'next';
import { huidigAccount } from '@/lib/auth';
import BemiddelingForm from '@/components/BemiddelingForm';

export const metadata: Metadata = { title: 'Laat Holland Recruitment bemiddelen', description: 'Geen tijd om zelf te zoeken? Wij zoeken, selecteren en voeren de gesprekken. Je betaalt alleen bij een plaatsing.', alternates: { canonical: '/bemiddeling' } };

export default async function Bemiddeling({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const a = await huidigAccount();
  const sp = await searchParams;
  return (
    <div className="p-narrow" style={{ padding: '36px 26px 56px' }}>
      <div className="p-eyebrow">Bemiddeling</div>
      <h1 className="p-h2" style={{ margin: '8px 0 10px' }}>Laat Holland Recruitment voor je zoeken</h1>
      <p className="p-muted" style={{ maxWidth: 680, marginBottom: 22 }}>Wij doen de intake, zoeken actief in ons netwerk, selecteren kandidaten en voeren de gesprekken. Je betaalt alleen bij een plaatsing; het tarief is op aanvraag en spreken we vooraf met je af. Een recruiter belt je binnen één werkdag.</p>
      <div className="p-grid2" style={{ gap: 28, alignItems: 'start' }}>
        <BemiddelingForm w={{ naam: a && a.rol === 'bedrijf' ? `${a.voornaam} ${a.achternaam}` : '', bedrijfsnaam: a?.bedrijf_naam || '', email: a?.rol === 'bedrijf' ? a.email : '', telefoon: a?.telefoon || '', freelancer: sp.freelancer || '' }} />
        <ol className="p-panel p-stack" style={{ listStyle: 'none' }}>
          {['We bellen je voor een korte intake over de opdracht, je wensen en eisen.', 'We zoeken en spreken passende professionals.', 'Je ontvangt een beperkte selectie met toelichting en kiest zelf wie je spreekt.', 'We regelen de afspraken en blijven je aanspreekpunt.'].map((s, i, l) => (
            <li key={s} className="p-row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><span style={{ flex: 'none', width: 28, height: 28, borderRadius: 8, background: i === l.length - 1 ? 'var(--lime)' : 'var(--blue)', color: i === l.length - 1 ? 'var(--ink)' : '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontFamily: 'Poppins' }}>{i + 1}</span><span>{s}</span></li>))}
        </ol>
      </div>
    </div>
  );
}
