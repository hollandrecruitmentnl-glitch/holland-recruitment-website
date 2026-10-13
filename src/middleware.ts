import { NextResponse, type NextRequest } from 'next/server';

/** Op alles behalve www.holland-recruitment.nl (bv. de preview op vercel.app): niet indexeren. */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  if (!/^(www\.)?holland-recruitment\.nl$/i.test(host)) res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}
export const config = { matcher: '/((?!_next/static|_next/image|favicon).*)' };
