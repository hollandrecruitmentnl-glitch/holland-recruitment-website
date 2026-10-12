import { redirect } from 'next/navigation';
import { vereis } from '@/lib/auth';
import { q, one } from '@/lib/db';
import { mails } from '@/lib/emails';
import { SITE } from '@/lib/mail';
import { limiet } from '@/lib/ratelimit';

async function meld(fd: FormData) {
  'use server';
  const a = await vereis();
  const soort = String(fd.get('soort')), id = String(fd.get('id')), reden = String(fd.get('reden') || '').slice(0, 80), toel = String(fd.get('toelichting') || '').slice(0, 1000);
  if (!reden || !['profiel', 'opdracht'].includes(soort)) redirect(`/melden?soort=${soort}&id=${id}&fout=1`);
  if (await limiet(`meld:${a.id}`, 10, 86400)) {
    await q(`insert into meldingen (soort, reden, toelichting, door_id, freelancer_id, opdracht_id) values ($1,$2,$3,$4,$5,$6)`, [soort, reden, toel, a.id, soort === 'profiel' ? id : null, soort === 'opdracht' ? id : null]);
    await mails.intern('info', `Nieuwe melding: ${soort}`, [['Reden', reden], ['Toelichting', toel]], `${SITE}/beheer/moderatie`);
  }
  redirect('/mijn?melding=gemeld');
}

export default async function Melden({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await vereis(undefined, `/melden?soort=${sp.soort}&id=${sp.id}`);
  const doel = sp.soort === 'profiel' ? await one(`select a.voornaam || ' ' || a.achternaam as naam from accounts a where a.id = $1`, [sp.id]) : await one(`select titel as naam from opdrachten where id = $1`, [sp.id]);
  if (!doel) redirect('/mijn');
  const redenen = ['Nep of misleidend', 'Ongepaste inhoud', 'Spam of reclame', 'Vraagt om betaling of gevoelige gegevens', 'Iets anders'];
  return (
    <div className="p-narrow" style={{ padding: '36px 26px 56px', maxWidth: 620 }}>
      <h1 className="p-h2" style={{ marginBottom: 8 }}>{sp.soort === 'profiel' ? 'Profiel' : 'Opdracht'} melden</h1>
      <p className="p-muted" style={{ marginBottom: 18 }}>Je meldt: <strong>{doel.naam}</strong>. Beheer van Holland Recruitment bekijkt je melding vertrouwelijk.</p>
      <form action={meld} className="p-form">
        <input type="hidden" name="soort" value={sp.soort} /><input type="hidden" name="id" value={sp.id} />
        {sp.fout && <p className="p-err-summary" role="alert">Kies een reden.</p>}
        <fieldset className="p-stack" style={{ border: 0, gap: 10 }}><legend className="p-h3" style={{ marginBottom: 8, fontSize: 16 }}>Reden</legend>
          {redenen.map(r => <label key={r} className="p-check"><input type="radio" name="reden" value={r} required />{r}</label>)}</fieldset>
        <div className="field"><label htmlFor="toel">Toelichting (optioneel)</label><textarea id="toel" name="toelichting" rows={4} maxLength={1000} /></div>
        <button className="btn btn-blue" type="submit">Verstuur melding</button>
      </form>
    </div>
  );
}
