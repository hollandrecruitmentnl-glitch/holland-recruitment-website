import crypto from 'node:crypto';

export function slugify(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' en ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'item';
}
export function kort(): string { return crypto.randomBytes(3).toString('hex'); }
export function randomToken(): string { return crypto.randomBytes(32).toString('base64url'); }
export function sha256(s: string): string { return crypto.createHash('sha256').update(s).digest('hex'); }

export function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const euro = (n: number | null | undefined) => (n == null ? '' : `€ ${n.toLocaleString('nl-NL')}`);

const MAANDEN = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
export function datumNL(d: string | Date | null | undefined, opts: { jaar?: boolean } = {}): string {
  if (!d) return '';
  const x = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T12:00:00' : d) : d;
  return `${x.getDate()} ${MAANDEN[x.getMonth()]}${opts.jaar === false ? '' : ' ' + x.getFullYear()}`;
}
export function relatief(d: string | Date | null | undefined): string {
  if (!d) return '';
  const x = typeof d === 'string' ? new Date(d) : d;
  const diff = (Date.now() - x.getTime()) / 1000;
  if (diff < 60) return 'zojuist';
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`;
  const vandaag = new Date(); vandaag.setHours(0, 0, 0, 0);
  if (x >= vandaag) return 'vandaag';
  const gisteren = new Date(vandaag); gisteren.setDate(gisteren.getDate() - 1);
  if (x >= gisteren) return 'gisteren';
  const dagen = Math.floor((vandaag.getTime() - x.getTime()) / 86400000) + 1;
  if (dagen < 7) return `${dagen} dagen geleden`;
  return datumNL(x);
}
export function tijd(d: string | Date): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return x.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
}
export function initialen(voornaam: string, achternaam: string): string {
  const a = (voornaam || '').trim()[0] || '';
  const parts = (achternaam || '').trim().split(/\s+/).filter(Boolean);
  const b = parts.length ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase() || '?';
}
export function lijst(v: FormDataEntryValue | null, max = 30): string[] {
  return String(v ?? '').split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, max).map(s => s.slice(0, 60));
}
export function int(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim(); if (!s) return null;
  const n = Number(s.replace(',', '.')); return Number.isFinite(n) ? Math.round(n) : null;
}
export function str(v: FormDataEntryValue | null, max = 500): string { return String(v ?? '').trim().slice(0, max); }
export function werkdagenErbij(start: Date, n: number): Date {
  const d = new Date(start); let k = 0;
  while (k < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) k++; }
  return d;
}
