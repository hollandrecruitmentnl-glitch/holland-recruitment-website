import { NextRequest, NextResponse } from 'next/server';
import { limiet } from '@/lib/ratelimit';
import { bewaakFeeds } from '@/lib/feedbewaking';

/** Controle 's ochtends: is de nachtelijke update gedraaid en zijn er opdrachten live gegaan? Zo niet: mail naar info@. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ fout: 'Niet toegestaan' }, { status: 401 });
  } else if (!/vercel-cron/i.test(req.headers.get('user-agent') || '') || !(await limiet('cron:controle', 2, 3600))) {
    return NextResponse.json({ fout: 'Niet toegestaan' }, { status: 401 });
  }
  return NextResponse.json(await bewaakFeeds());
}
