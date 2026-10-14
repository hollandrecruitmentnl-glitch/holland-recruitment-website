import { headers } from 'next/headers';
import { LogoSvg } from './Logo';
import { huidigAccount } from '@/lib/auth';
import { OMGEVING, HULP, isRol, EXPERTISES, REGIO_FOOTER } from '@/lib/navigatie';

export default async function SiteFooter() {
  const a = await huidigAccount();
  const rol = isRol(a?.rol) ? a!.rol as 'bedrijf' | 'freelancer' : null;
  const pad = (await headers()).get('x-pad') || '';
  if (!a && pad.startsWith('/registreren')) return (
    <footer className="footer footer-focus">
      <div className="wrap footer-bot">
        <span>© {new Date().getFullYear()} Holland Recruitment BV · KvK 96618914 · Rotterdam</span>
        <span><a href="/privacyverklaring">Privacyverklaring</a> · <a href="/voorwaarden">Voorwaarden</a> · <a href="/contact">Contact</a></span>
      </div>
    </footer>
  );
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <a href="/" className="brand" aria-label="Holland Recruitment — home"><LogoSvg /><b>Holland<span>.</span></b></a>
            <p className="footer-about">Holland Recruitment verbindt bedrijven en zelfstandige professionals. Zelf zoeken via het platform, of laat ons bemiddelen.</p>
            <p className="footer-about"><a href="mailto:info@holland-recruitment.nl">info@holland-recruitment.nl</a></p>
            <div className="footer-social">
              <a href="https://www.linkedin.com/company/hollandrecruitment/" target="_blank" rel="noopener" aria-label="Holland Recruitment op LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.1c0-1.22-.02-2.79-1.7-2.79-1.7 0-1.96 1.33-1.96 2.7V21h-4z" /></svg></a>
              <a href="https://www.instagram.com/hollandrecruitment/" target="_blank" rel="noopener" aria-label="Holland Recruitment op Instagram"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" /></svg></a>
              <a href="https://www.facebook.com/profile.php?id=61575356589438" target="_blank" rel="noopener" aria-label="Holland Recruitment op Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.27 4.3c-2.3 0-3.87 1.4-3.87 3.98v2.22H7.8v3h2.6V21z" /></svg></a>
            </div>
          </div>
          {rol ? (
            <>
              <div className="footer-col"><h2>{rol === 'bedrijf' ? 'Mijn bedrijf' : 'Mijn omgeving'}</h2>{OMGEVING[rol].slice(0, 5).map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
              <div className="footer-col"><h2>Hulp en uitleg</h2>{HULP[rol].filter(([h]) => h !== '/contact').map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
              <div className="footer-col"><h2>Account</h2><a href="/mijn/instellingen">Instellingen</a><a href="/mijn/berichten">Berichten</a><a href="/">Home</a></div>
              <div className="footer-col"><h2>Holland Recruitment</h2><a href="/over-ons">Over ons</a><a href="/contact">Contact</a></div>
            </>
          ) : (
            <>
              <div className="footer-col"><h2>Voor bedrijven</h2><a href="/freelancers-zoeken">Freelancers zoeken</a><a href="/registreren?rol=bedrijf&terug=%2Fmijn%2Fopdrachten%2Fnieuw">Gratis opdracht plaatsen</a><a href="/professional-aanvragen">Professional aanvragen (bemiddeling)</a><a href="/bemiddeling">Laat ons bemiddelen</a><a href="/werkwijze">Onze werkwijze</a></div>
              <div className="footer-col"><h2>Voor freelancers</h2><a href="/opdrachten">Opdrachten zoeken</a><a href="/registreren?rol=freelancer">Gratis profiel maken</a><a href="/bedrijven">Bedrijven</a><a href="/freelancers/hoe-werkt-het">Hoe werkt het?</a><a href="/freelancers/veelgestelde-vragen">Veelgestelde vragen</a></div>
              <div className="footer-col"><h2>Expertises</h2>{EXPERTISES.slice(1).map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>
              <div className="footer-col"><h2>Holland Recruitment</h2><a href="/over-ons">Over ons</a><a href="/kennisbank">Kennisbank</a><a href="/contact">Contact</a><a href="/inloggen">Inloggen</a></div>
            </>
          )}
        </div>
        {!rol && <div className="footer-regio"><span>Freelancer inhuren in:</span> {REGIO_FOOTER.flatMap(([h, l], i) => [i > 0 ? ' · ' : null, <a key={h} href={h}>{l}</a>])}</div>}
        <div className="footer-bot">
          <span>© {new Date().getFullYear()} Holland Recruitment BV · KvK 96618914 · Brielselaan 278, 3081 LR Rotterdam</span>
          <span><a href="/privacyverklaring">Privacyverklaring</a> · <a href="/voorwaarden">Voorwaarden</a></span>
        </div>
      </div>
    </footer>
  );
}
