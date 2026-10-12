import 'server-only';

export type KvkResultaat = { ok: true; naam?: string; plaats?: string; gecontroleerd: boolean } | { ok: false; fout: string };

/** Controleert of een KvK-nummer bestaat en actief is (KvK Zoeken API v2). Zonder key: alleen formaat. */
export async function controleerKvk(nummer: string): Promise<KvkResultaat> {
  if (!/^\d{8}$/.test(nummer)) return { ok: false, fout: 'Een KvK-nummer heeft 8 cijfers.' };
  const key = process.env.KVK_API_KEY;
  if (!key) return { ok: true, gecontroleerd: false };
  try {
    const r = await fetch(`https://api.kvk.nl/api/v2/zoeken?kvkNummer=${nummer}&resultatenPerPagina=1`, { headers: { apikey: key }, signal: AbortSignal.timeout(6000) });
    if (r.status === 404) return { ok: false, fout: 'We vinden dit KvK-nummer niet als actieve inschrijving. Controleer het nummer.' };
    if (!r.ok) return { ok: true, gecontroleerd: false }; // KvK tijdelijk niet bereikbaar: niet blokkeren, beheer ziet "niet gecontroleerd"
    const j: any = await r.json();
    const res = j?.resultaten?.[0];
    if (!res) return { ok: false, fout: 'We vinden dit KvK-nummer niet als actieve inschrijving. Controleer het nummer.' };
    return { ok: true, gecontroleerd: true, naam: res.naam, plaats: res.adres?.binnenlandsAdres?.plaats };
  } catch {
    return { ok: true, gecontroleerd: false };
  }
}
export const kvkActief = () => !!process.env.KVK_API_KEY;
