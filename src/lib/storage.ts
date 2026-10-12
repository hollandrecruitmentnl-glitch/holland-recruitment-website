import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const driver = () => process.env.STORAGE_DRIVER || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'local');
const LOCAL = path.join(process.cwd(), '.storage');
const bucket = () => process.env.STORAGE_BUCKET || 'platform';

function sb(p: string) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase Storage niet ingesteld');
  return { url: `${url}/storage/v1/object/${p}`, key };
}

export async function opslaan(pad: string, data: Buffer, type: string) {
  if (driver() === 'local') {
    const f = path.join(LOCAL, pad);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, data);
    await fs.writeFile(f + '.type', type);
    return;
  }
  const { url, key } = sb(`${bucket()}/${pad}`);
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': type, 'x-upsert': 'true' }, body: new Uint8Array(data) });
  if (!r.ok) throw new Error('Upload mislukt: ' + r.status);
}

export async function ophalen(pad: string): Promise<{ data: Buffer; type: string } | null> {
  if (driver() === 'local') {
    try {
      const f = path.join(LOCAL, pad);
      return { data: await fs.readFile(f), type: await fs.readFile(f + '.type', 'utf8').catch(() => 'application/octet-stream') };
    } catch { return null; }
  }
  const { url, key } = sb(`${bucket()}/${pad}`);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) return null;
  return { data: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'application/octet-stream' };
}

export async function verwijderen(pad: string | null | undefined) {
  if (!pad) return;
  if (driver() === 'local') { await fs.rm(path.join(LOCAL, pad), { force: true }); await fs.rm(path.join(LOCAL, pad + '.type'), { force: true }); return; }
  const { url, key } = sb(bucket());
  await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [pad] }) });
}

export type Soort = 'cv' | 'foto' | 'logo' | 'bijlage';
const REGELS: Record<Soort, { max: number; types: string[] }> = {
  cv: { max: 5 * 1024 * 1024, types: ['pdf', 'doc', 'docx'] },
  foto: { max: 3 * 1024 * 1024, types: ['png', 'jpg', 'webp'] },
  logo: { max: 2 * 1024 * 1024, types: ['png', 'jpg', 'webp'] },
  bijlage: { max: 10 * 1024 * 1024, types: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'webp'] },
};
const MIME: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp',
};

function sniff(buf: Buffer, naam: string): string | null {
  const ext = (naam.split('.').pop() || '').toLowerCase();
  if (buf.subarray(0, 4).toString() === '%PDF') return 'pdf';
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString() === 'PNG') return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (buf[0] === 0x50 && buf[1] === 0x4b) return ext === 'xlsx' ? 'xlsx' : ext === 'docx' ? 'docx' : null; // zip-container
  if (buf.subarray(0, 4).toString('hex') === 'd0cf11e0') return ext === 'xls' ? 'xls' : ext === 'doc' ? 'doc' : null;
  return null;
}

export type Fout = { fout: string };
export async function controleer(file: File | null, soort: Soort): Promise<{ data: Buffer; ext: string; type: string; naam: string } | Fout> {
  if (!file || typeof file === 'string' || file.size === 0) return { fout: 'Kies een bestand.' };
  const r = REGELS[soort];
  if (file.size > r.max) return { fout: `Dit bestand is te groot. Het maximum is ${Math.round(r.max / 1024 / 1024)} MB.` };
  const data = Buffer.from(await file.arrayBuffer());
  const ext = sniff(data, file.name);
  if (!ext || !r.types.includes(ext)) {
    return { fout: `Dit bestandstype kan niet. Kies een ${r.types.map(t => t.toUpperCase()).join(', ').replace(/, ([^,]*)$/, ' of $1')}-bestand.` };
  }
  const naam = file.name.replace(/[^\w.\- ()]/g, '_').slice(0, 120);
  return { data, ext, type: MIME[ext], naam };
}

export const nieuwPad = (map: string, ext: string) => `${map}/${crypto.randomUUID()}.${ext}`;
