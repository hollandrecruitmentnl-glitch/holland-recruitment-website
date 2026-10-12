'use server';
import { huidigAccount } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function bewaarZoekopdracht(soort: 'freelancers' | 'opdrachten', filtersJson: string, naam: string) {
  const a = await huidigAccount();
  if (!a || a.status !== 'actief') return { ok: false };
  if (soort === 'freelancers' && a.rol !== 'bedrijf') return { ok: false };
  if (soort === 'opdrachten' && a.rol !== 'freelancer') return { ok: false };
  let filters: unknown; try { filters = JSON.parse(filtersJson); } catch { return { ok: false }; }
  const n = await one<{ n: number }>('select count(*)::int as n from bewaarde_zoekopdrachten where account_id = $1', [a.id]);
  if ((n?.n ?? 0) >= 20) return { ok: false };
  await q('insert into bewaarde_zoekopdrachten (account_id, soort, naam, filters) values ($1,$2,$3,$4)', [a.id, soort, naam.slice(0, 120) || 'Zoekopdracht', JSON.stringify(filters)]);
  revalidatePath('/mijn/instellingen');
  return { ok: true };
}

export async function verwijderZoekopdracht(fd: FormData) {
  const a = await huidigAccount(); if (!a) return;
  await q('delete from bewaarde_zoekopdrachten where id = $1 and account_id = $2', [String(fd.get('id')), a.id]);
  revalidatePath('/mijn/instellingen');
}
export async function zoekopdrachtEmail(fd: FormData) {
  const a = await huidigAccount(); if (!a) return;
  await q('update bewaarde_zoekopdrachten set email = not email where id = $1 and account_id = $2', [String(fd.get('id')), a.id]);
  revalidatePath('/mijn/instellingen');
}
