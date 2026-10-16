import { NextResponse } from 'next/server';
import { logoStrookAantal } from '@/lib/data/bedrijven';
import { EERDERE_SAMENWERKINGEN, LOGO_STROOK_MIN } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * V38: 'Eerder samengewerkt met' (Albeda, Zadkine) pas tonen als er minimaal 10 bedrijven met logo op het platform staan.
 * De statische websitepagina's (over-ons, voor-bedrijven) vragen dit op via site.js; de namen komen pas mee als het zover is.
 */
export async function GET() {
  const aantal = await logoStrookAantal().catch(() => 0);
  const toon = aantal >= LOGO_STROOK_MIN;
  return NextResponse.json({ toon, namen: toon ? EERDERE_SAMENWERKINGEN : [] }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
}
