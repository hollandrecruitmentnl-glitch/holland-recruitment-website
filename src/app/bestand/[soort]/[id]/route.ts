import { NextResponse } from 'next/server';
import { huidigAccount } from '@/lib/auth';
import { one } from '@/lib/db';
import { ophalen } from '@/lib/storage';
import { freelancerProfiel } from '@/lib/data/freelancers';

const UUID = /^[0-9a-f-]{36}$/;
const nee = () => new NextResponse('Niet gevonden', { status: 404 });

export async function GET(_: Request, { params }: { params: Promise<{ soort: string; id: string }> }) {
  const { soort, id } = await params;
  const a = await huidigAccount();
  let pad: string | null = null, naam: string | null = null, openbaar = false;

  if (soort === 'foto' && UUID.test(id)) {
    const f = await one(`select f.foto_pad, a.status from freelancers f join accounts a on a.id = f.id where f.id = $1`, [id]);
    if (!f || (f.status !== 'actief' && a?.rol !== 'beheer' && a?.id !== id)) return nee();
    pad = f.foto_pad; openbaar = true;
  } else if (soort === 'logo' && UUID.test(id)) {
    const b = await one(`select logo_pad, status from bedrijven where id = $1`, [id]);
    if (!b || (b.status !== 'actief' && a?.rol !== 'beheer' && a?.bedrijf_id !== id)) return nee();
    pad = b.logo_pad; openbaar = true;
  } else if (soort === 'cv' && (id === 'mijn' || UUID.test(id))) {
    const fid = id === 'mijn' ? a?.id : id;
    if (!fid) return nee();
    const s = await one(`select slug from freelancers where id = $1`, [fid]);
    if (!s) return nee();
    const p = await freelancerProfiel(s.slug, a);
    if (!p || !p.toon_cv) return nee();
    pad = p.cv_pad; naam = p.cv_naam;
  } else if (soort === 'bijlage' && UUID.test(id)) {
    if (!a) return nee();
    const m = await one(`select m.bijlage_pad, m.bijlage_naam, g.id as gesprek, g.freelancer_id, g.bedrijf_id from berichten m join gesprekken g on g.id = m.gesprek_id where m.id = $1`, [id]);
    if (!m) return nee();
    const deelnemer = m.freelancer_id === a.id || (a.bedrijf_id && m.bedrijf_id === a.bedrijf_id);
    const beheerInzage = a.rol === 'beheer' && await one(`select 1 from logboek where actor_id = $1 and actie = 'gesprek_inzage' and object_id = $2 and aangemaakt > now() - interval '2 hours'`, [a.id, m.gesprek]);
    if (!deelnemer && !beheerInzage) return nee();
    pad = m.bijlage_pad; naam = m.bijlage_naam;
  } else return nee();

  if (!pad) return nee();
  const f = await ophalen(pad);
  if (!f) return nee();
  const headers: Record<string, string> = { 'Content-Type': f.type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': openbaar ? 'public, max-age=3600' : 'private, no-store' };
  if (naam) headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(naam)}`;
  if (!f.type.startsWith('image/')) headers['Content-Security-Policy'] = "default-src 'none'";
  return new NextResponse(new Uint8Array(f.data), { headers });
}
