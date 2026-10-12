import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BottomBar from '@/components/BottomBar';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="inhoud">{children}</main>
      <SiteFooter />
      <BottomBar />
    </>
  );
}
