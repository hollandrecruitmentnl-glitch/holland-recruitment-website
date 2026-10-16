import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BottomBar from '@/components/BottomBar';
import EmailBanner from '@/components/EmailBanner';
import { huidigAccount } from '@/lib/auth';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const a = await huidigAccount();
  // Onbevestigd e-mailadres: banner met code-invoer op elke pagina (niet alleen in Mijn omgeving).
  const banner = a && a.rol !== 'beheer' && !a.email_bevestigd;
  return (
    <>
      <SiteHeader />
      {banner && <EmailBanner email={a!.email} u={a!.rol === 'bedrijf'} />}
      <main id="inhoud">{children}</main>
      <SiteFooter />
      <BottomBar />
    </>
  );
}
