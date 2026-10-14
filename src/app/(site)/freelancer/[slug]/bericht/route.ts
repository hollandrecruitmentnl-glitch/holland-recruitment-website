import { NextResponse } from 'next/server';
import { huidigAccount } from '@/lib/auth';

/** "Stuur bericht" op kaarten: bezoekers direct naar een gratis account, ingelogde bedrijven naar het berichtvak. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const veilig = slug.replace(/[^a-z0-9-]/gi, '');
  const a = await huidigAccount();
  const profiel = `/freelancer/${veilig}#bericht`;
  const doel = a ? profiel : `/registreren?rol=bedrijf&terug=${encodeURIComponent(profiel)}&ctx=bericht`;
  // Relatieve Location: blijft op www (achter de rewrite ziet de server het platform-domein).
  return new NextResponse(null, { status: 303, headers: { Location: doel, 'Cache-Control': 'no-store' } });
}
