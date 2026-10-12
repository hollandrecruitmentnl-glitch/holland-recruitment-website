import 'server-only';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

declare global { var __hrPool: Pool | undefined; }

function pool(): Pool {
  if (!global.__hrPool) {
    // DATABASE_URL (handmatig) of POSTGRES_URL (Supabase-integratie in Vercel, transaction pooler)
    let url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL/POSTGRES_URL ontbreekt');
    url = url.replace(/([?&])(sslmode|supa)=[^&]*&?/g, '$1').replace(/[?&]$/, ''); // ssl regelen we hieronder
    const local = /localhost|127\.0\.0\.1/.test(url);
    global.__hrPool = new Pool({
      connectionString: url,
      max: local ? 1 : 5,
      ssl: local ? false : { rejectUnauthorized: false },
      idleTimeoutMillis: 10_000,
    });
    // Een verbroken idle-verbinding (bv. pooler-herstart) mag het proces niet laten crashen.
    global.__hrPool.on('error', e => console.error('db pool fout:', e.message));
  }
  return global.__hrPool;
}

const herstelbaar = (e: any) => /Connection terminated|ECONNRESET|connection timeout|Client has encountered a connection error/i.test(String(e?.message));

export async function q<T extends QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    return (await pool().query<T>(sql, params as any[])).rows;
  } catch (e) {
    if (!herstelbaar(e)) throw e;
    return (await pool().query<T>(sql, params as any[])).rows; // één nieuwe poging op een verse verbinding
  }
}

export async function one<T extends QueryResultRow = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query('begin');
    const r = await fn(c);
    await c.query('commit');
    return r;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
