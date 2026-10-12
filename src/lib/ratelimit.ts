import 'server-only';
import { one } from './db';

/** Simpele vaste-venster limiet in Postgres. true = toegestaan. */
export async function limiet(sleutel: string, max: number, seconden: number): Promise<boolean> {
  const r = await one<{ aantal: number }>(`
    insert into rate_limits (sleutel, aantal, venster_start) values ($1, 1, now())
    on conflict (sleutel) do update set
      aantal = case when rate_limits.venster_start < now() - make_interval(secs => $2) then 1 else rate_limits.aantal + 1 end,
      venster_start = case when rate_limits.venster_start < now() - make_interval(secs => $2) then now() else rate_limits.venster_start end
    returning aantal`, [sleutel, seconden]);
  return (r?.aantal ?? 1) <= max;
}
