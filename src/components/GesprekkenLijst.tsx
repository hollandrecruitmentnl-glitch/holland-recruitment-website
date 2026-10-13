import Link from 'next/link';
import { Avatar, Logo } from './Kaarten';
import { relatief } from '@/lib/util';
import { GESPREK_LABELS } from '@/lib/constants';

export default function GesprekkenLijst({ items, actief, rol }: { items: any[]; actief?: string; rol: string }) {
  return (
    <nav className="p-chat-list" aria-label="Gesprekken">
      {items.length === 0 && <p className="p-small p-muted" style={{ padding: 18 }}>Nog geen gesprekken. {rol === 'bedrijf' ? 'Zoek een freelancer en stuur een bericht.' : 'Reageer op een opdracht of stuur een bedrijf een bericht.'}</p>}
      {items.map(g => (
        <Link key={g.id} href={`/mijn/berichten/${g.id}`} className="p-chat-item" aria-current={actief === g.id ? 'true' : undefined}>
          {rol === 'bedrijf' ? <Avatar id={g.freelancer_id || g.id} foto={null} voornaam={g.f_voornaam} achternaam={g.f_achternaam} /> : <Logo id={g.b_id || g.id} logo={null} naam={g.b_naam} />}
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="p-between" style={{ flexWrap: 'nowrap' }}><strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rol === 'bedrijf' ? `${g.f_voornaam} ${g.f_achternaam}` : g.b_naam}</strong><span className="p-xs p-muted" style={{ flex: 'none' }}>{relatief(g.laatste_bericht)}</span></span>
            {g.opdracht_titel && <span className="p-xs p-muted" style={{ display: 'block' }}>Over: {g.opdracht_titel}</span>}
            <span className="p-small" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: g.ongelezen ? 700 : 400, color: g.ongelezen ? 'var(--ink)' : 'var(--muted)' }}>{g.laatste_tekst || (g.laatste_bijlage ? `📎 ${g.laatste_bijlage}` : '')}</span>
            {g.statuslabel !== 'geen' && <span className="p-status" style={{ marginTop: 4, fontSize: 11.5, padding: '2px 8px' }}>{GESPREK_LABELS[g.statuslabel]}</span>}
          </span>
          {g.ongelezen && <span className="p-dot nu" style={{ marginTop: 8 }} aria-label="Ongelezen" />}
        </Link>
      ))}
      <p className="p-xs p-muted" style={{ padding: '14px 16px', marginTop: 'auto' }}>Beheer van Holland Recruitment leest gesprekken alleen bij een melding, fraudecontrole, support of bemiddeling. Elke inzage wordt vastgelegd. <a className="p-link" href="/privacyverklaring">Privacyverklaring</a></p>
    </nav>
  );
}
