import { NextRequest, NextResponse } from 'next/server';
import { uploadBestand } from '@/app/actions/profiel';
import { SITE } from '@/lib/mail';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const ok = !origin || origin === SITE || origin === new URL(req.url).origin || /^https:\/\/(www\.)?holland-recruitment\.nl$/.test(origin);
  if (!ok) return NextResponse.json({ fout: 'Niet toegestaan.' }, { status: 403 });
  const fd = await req.formData();
  const r = await uploadBestand(fd);
  return NextResponse.json(r, { status: r.fout ? 400 : 200 });
}
