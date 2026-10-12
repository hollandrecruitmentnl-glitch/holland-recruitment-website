import 'server-only';
import { q } from './db';
export async function logboek(actor: string | null, actie: string, objectType?: string, objectId?: string, details: Record<string, unknown> = {}) {
  await q('insert into logboek (actor_id, actie, object_type, object_id, details) values ($1,$2,$3,$4,$5)', [actor, actie, objectType ?? null, objectId ?? null, JSON.stringify(details)]);
}
