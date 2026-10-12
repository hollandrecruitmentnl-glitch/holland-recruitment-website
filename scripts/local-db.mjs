// Lokale Postgres (PGlite) voor ontwikkelen en testen. NIET voor productie.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const vers = process.argv.includes('--vers');
if (vers) fs.rmSync('.pgdata', { recursive: true, force: true });
const db = await PGlite.create('./.pgdata');
await db.exec(fs.readFileSync('db/schema.sql', 'utf8'));
await db.exec(fs.readFileSync('db/seed_basis.sql', 'utf8'));
if (process.argv.includes('--demo')) {
  const n = (await db.query('select count(*)::int as n from accounts')).rows[0].n;
  if (!n) {
    const h = bcrypt.hashSync('Test1234!', 10);
    await db.exec(fs.readFileSync('db/seed_demo.sql', 'utf8').replaceAll('{{HASH}}', h));
    console.log('demo-data geladen (wachtwoord voor alle testaccounts: Test1234!)');
  }
}
const server = new PGLiteSocketServer({ db, port: 5433, host: '127.0.0.1', maxConnections: 10 });
await server.start();
console.log('PGlite luistert op 127.0.0.1:5433');
process.on('SIGTERM', async () => { await server.stop(); await db.close(); process.exit(0); });
process.on('SIGINT', async () => { await server.stop(); await db.close(); process.exit(0); });
