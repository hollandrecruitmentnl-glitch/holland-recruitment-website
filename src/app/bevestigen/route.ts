import { NextRequest, NextResponse } from 'next/server';
import { q, one } from '@/lib/db';
import { sha256 } from '@/lib/util';
import { SITE } from '@/lib/mail';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const t = await one<{ account_id: string }>(`select account_id from tokens where token_hash = $1 and soort = 'email_bevestigen' and gebruikt is null and verloopt > now()`, [sha256(token)]);
  if (!t) return NextResponse.redirect(`${SITE}/mijn?bevestigen=verlopen`);
  await q(`update accounts set email_bevestigd = true where id = $1`, [t.account_id]);
  await q(`update tokens set gebruikt = now() where token_hash = $1`, [sha256(token)]);
  return NextResponse.redirect(`${SITE}/mijn?bevestigd=1`);
}
