import { NextResponse } from 'next/server';
import { huidigAccount } from '@/lib/auth';
import { q, one } from '@/lib/db';

export async function GET() {
  const a = await huidigAccount();
  if (!a) return NextResponse.json({ fout: 'Niet ingelogd' }, { status: 401 });
  const account = await one(`select id, rol, email, voornaam, achternaam, telefoon, aangemaakt, laatst_actief, meldingen from accounts where id = $1`, [a.id]);
  const data: Record<string, unknown> = { account };
  if (a.rol === 'freelancer') {
    data.profiel = await one(`select * from freelancers where id = $1`, [a.id]);
    data.werkervaring = await q(`select * from werkervaring where freelancer_id = $1`, [a.id]);
    data.reacties = await q(`select r.*, o.titel from reacties r join opdrachten o on o.id = r.opdracht_id where r.freelancer_id = $1`, [a.id]);
  }
  if (a.bedrijf_id) data.bedrijf = await one(`select * from bedrijven where id = $1`, [a.bedrijf_id]);
  data.berichten = await q(`select m.gesprek_id, m.tekst, m.bijlage_naam, m.aangemaakt from berichten m where m.afzender_id = $1 order by m.aangemaakt`, [a.id]);
  data.bewaarde_zoekopdrachten = await q(`select * from bewaarde_zoekopdrachten where account_id = $1`, [a.id]);
  return new NextResponse(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="mijn-gegevens-holland-recruitment.json"' } });
}
