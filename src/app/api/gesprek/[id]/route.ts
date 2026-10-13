import { NextRequest, NextResponse } from 'next/server';
import { huidigAccount } from '@/lib/auth';
import { andereGelezenTot, berichtenVan, gesprekVoor, markeerGelezen } from '@/lib/data/berichten';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await huidigAccount();
  const { id } = await params;
  if (!a || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({}, { status: 401 });
  const g = await gesprekVoor(a, id);
  if (!g) return NextResponse.json({}, { status: 404 });
  const na = req.nextUrl.searchParams.get('na') || undefined;
  const nieuw = await berichtenVan(id, na && /^[0-9a-f-]{36}$/.test(na) ? na : undefined);
  await markeerGelezen(id, a.id); // ook als 'aanwezig'-signaal: wie het gesprek open heeft, krijgt geen e-mail
  const gelezen = await andereGelezenTot(id, a);
  return NextResponse.json({ berichten: nieuw.map((m: any) => ({ ...m, aangemaakt: new Date(m.aangemaakt).toISOString() })), gelezenTot: gelezen ? new Date(gelezen).toISOString() : null, label: g.statuslabel, geblokkeerd: g.geblokkeerd }, { headers: { 'Cache-Control': 'no-store' } });
}
