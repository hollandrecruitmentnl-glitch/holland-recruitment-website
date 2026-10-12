import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import '../../public/assets/site.css';
import './platform.css';
import { OfflineBalk, Toast } from '@/components/Client';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'https://www.holland-recruitment.nl'),
  title: { default: 'Freelancers en opdrachten | Holland Recruitment', template: '%s | Holland Recruitment' },
  description: 'Vind zelfstandige professionals en freelance opdrachten. Kom rechtstreeks met elkaar in contact, of laat Holland Recruitment bemiddelen.',
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon-32x32.png', sizes: '32x32' }], apple: '/apple-touch-icon.png' },
  openGraph: { siteName: 'Holland Recruitment', locale: 'nl_NL', type: 'website', images: ['/og-image.png'] },
};
export const viewport: Viewport = { themeColor: '#3551E6', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js');" }} />
      </head>
      <body>
        <a className="skip" href="#inhoud">Naar de inhoud</a>
        <OfflineBalk />
        {children}
        <Suspense fallback={null}><Toast /></Suspense>
        <script src="/cookie-banner.js" defer />
      </body>
    </html>
  );
}
