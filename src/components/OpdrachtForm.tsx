'use client';
import type { FormState } from '@/app/actions/auth';
import { useEffect, useRef, useState } from 'react';
import { indienen, opslaanConcept } from '@/app/actions/opdrachten';
import { FoutSamenvatting, Fout } from './Velden';
import { Verzend, useActie } from './Client';
import ChipInvoer from './ChipInvoer';
import { PERSPECTIEF, REACTIETERMIJN, VAKGEBIEDEN, WERKVORMEN, vakgebiedNaam, werkvormNaam } from '@/lib/constants';

const VOORBEELD = `Bijvoorbeeld:\nVoor de onderhoudsstop van onze kraakinstallatie zoeken we een werkvoorbereider E&I. Je maakt werkpakketten, stemt af met de uitvoering en bewaakt de planning.\n\nWerkzaamheden:\n- werkpakketten opstellen in SAP PM\n- …`;

function Sectie({ nr, titel, children }: { nr: number; titel: string; children: React.ReactNode }) {
  return (
    <fieldset className="p-card p-stack" style={{ gap: 16 }}>
      <legend className="sr-only">{titel}</legend>
      <div className="p-row" style={{ gap: 12 }} aria-hidden="true"><span style={{ width: 30, height: 30, borderRadius: 9, background: nr === 6 ? 'var(--lime)' : 'var(--blue)', color: nr === 6 ? 'var(--ink)' : '#fff', display: 'grid', placeItems: 'center', fontFamily: 'Poppins', fontWeight: 700 }}>{nr}</span><strong className="p-h3">{titel}</strong></div>
      {children}
    </fieldset>
  );
}

export default function OpdrachtForm({ o, collegas, bedrijfNaam, telefoon }: { o?: any; collegas: { id: string; naam: string }[]; bedrijfNaam: string; telefoon: string }) {
  const [s, onSubmit, pending] = useActie(indienen, undefined as FormState);
  const [id, setId] = useState<string>(o?.id || '');
  const [opslag, setOpslag] = useState('');
  const [v, setV] = useState<Record<string, any>>({
    titel: o?.titel === 'Concept-opdracht' ? '' : o?.titel || '', vakgebied: o?.vakgebied || '', werkvorm: o?.werkvorm || '', locatie: o?.locatie || '', dagen: o?.dagen_op_locatie ?? '',
    start_type: o ? (o.start_asap ? 'asap' : o.start_datum ? 'datum' : '') : '', looptijd_type: o?.looptijd_onbekend ? 'onbekend' : 'bekend',
    tarief_type: o?.tarief_in_overleg ? 'overleg' : 'bereik', tarief_min: o?.tarief_min ?? '', tarief_max: o?.tarief_max ?? '', uren_min: o?.uren_min ?? '', uren_max: o?.uren_max ?? '',
    modus: o?.bemiddeling ? 'bemiddeling' : 'zelf',
  });
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = o && ['live', 'in_controle'].includes(o.status);
  const f = s?.fouten || {};
  useEffect(() => { if (s?.fouten) (document.querySelector('.p-err-summary') as HTMLElement | null)?.focus(); }, [s]);

  const wijzig = (e: React.FormEvent<HTMLFormElement>) => {
    const t = e.target as HTMLInputElement;
    if (t.name) setV(x => ({ ...x, [t.name === 'dagen_op_locatie' ? 'dagen' : t.name]: t.value }));
    if (live) { setOpslag('Niet opgeslagen wijzigingen. Klik op "Wijzigingen opslaan".'); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!form.current) return;
      setOpslag('Concept opslaan…');
      try { const r = await opslaanConcept(new FormData(form.current)); if (r.id) { setId(r.id); setOpslag('Concept opgeslagen.'); } else setOpslag(''); }
      catch { setOpslag('Niet opgeslagen. Je invoer blijft staan; controleer je verbinding.'); }
    }, 900);
  };
  const snel = (min: number, max: number) => setV(x => ({ ...x, uren_min: min, uren_max: max }));
  const vandaag = new Date().toISOString().slice(0, 10);
  const tariefTekst = v.tarief_type === 'overleg' ? 'Tarief in overleg' : v.tarief_min && v.tarief_max ? `€ ${v.tarief_min}–${v.tarief_max} per uur` : v.tarief_max ? `Tot € ${v.tarief_max} per uur` : v.tarief_min ? `Vanaf € ${v.tarief_min} per uur` : 'Tarief';

  return (
    <div className="p-opdracht-grid">
      <form ref={form} onSubmit={onSubmit} onChange={wijzig} className="p-stack" style={{ gap: 18 }} noValidate>
        <input type="hidden" name="id" value={id} />
        <FoutSamenvatting fouten={s?.fouten} />
        <div className="p-card p-stack">
          <strong className="p-h3">Hoe wil je zoeken?</strong>
          <div className="p-radio-cards">
            <label className="p-radio-card"><input type="radio" name="modus" value="zelf" checked={v.modus === 'zelf'} onChange={() => setV(x => ({ ...x, modus: 'zelf' }))} /><strong>Zelf zoeken via het platform</strong><span className="p-small p-muted">Freelancers reageren direct bij jou. Gratis de eerste 6 maanden.</span></label>
            <label className="p-radio-card"><input type="radio" name="modus" value="bemiddeling" checked={v.modus === 'bemiddeling'} onChange={() => setV(x => ({ ...x, modus: 'bemiddeling' }))} /><strong>Laat Holland Recruitment bemiddelen</strong><span className="p-small p-muted">Wij zoeken, selecteren en voeren de gesprekken. Fee per plaatsing, op aanvraag.</span></label>
          </div>
          {v.modus === 'bemiddeling' && <div className="field"><label htmlFor="v-telefoon">Telefoonnummer<span className="req" aria-hidden="true"> *</span></label><input id="v-telefoon" name="telefoon" type="tel" defaultValue={telefoon} autoComplete="tel" aria-invalid={f.telefoon ? true : undefined} /><span className="hint">Een recruiter belt je binnen één werkdag.</span><Fout id="v-telefoon-err" tekst={f.telefoon} /></div>}
        </div>

        <Sectie nr={1} titel="De opdracht">
          <div className="field"><label htmlFor="v-titel">Titel<span className="req" aria-hidden="true"> *</span></label><input id="v-titel" name="titel" defaultValue={v.titel} maxLength={120} placeholder="Bijvoorbeeld Werkvoorbereider E&I" aria-invalid={f.titel ? true : undefined} /><Fout id="e1" tekst={f.titel} /></div>
          <div className="field"><label htmlFor="v-vakgebied">Vakgebied<span className="req" aria-hidden="true"> *</span></label><select id="v-vakgebied" name="vakgebied" defaultValue={v.vakgebied} aria-invalid={f.vakgebied ? true : undefined}><option value="">Kies een vakgebied</option>{VAKGEBIEDEN.map(x => <option key={x.slug} value={x.slug}>{x.naam}</option>)}</select><Fout id="e2" tekst={f.vakgebied} /></div>
          <div className="field"><label htmlFor="v-omschrijving">Omschrijving<span className="req" aria-hidden="true"> *</span></label><textarea id="v-omschrijving" name="omschrijving" rows={8} defaultValue={o?.omschrijving || ''} placeholder={VOORBEELD} maxLength={8000} aria-invalid={f.omschrijving ? true : undefined} /><span className="hint">Minimaal 40 tekens. Wat ga je doen, voor wie en waarom.</span><Fout id="e3" tekst={f.omschrijving} /></div>
          <div className="field"><label htmlFor="v-meebrengen">Wat je meebrengt</label><textarea id="v-meebrengen" name="meebrengen" rows={4} defaultValue={o?.meebrengen || ''} maxLength={4000} placeholder="Ervaring, kennis en eigenschappen die je zoekt." /></div>
        </Sectie>

        <Sectie nr={2} titel="Locatie en planning">
          <div className="field"><span className="label">Werkvorm<span className="req" aria-hidden="true"> *</span></span>
            <div className="p-row" role="radiogroup" aria-label="Werkvorm">{WERKVORMEN.map(w => <label key={w.v} className={`p-chip ${v.werkvorm === w.v ? 'on' : ''}`}><input type="radio" name="werkvorm" value={w.v} defaultChecked={v.werkvorm === w.v} style={{ position: 'absolute', opacity: 0 }} />{w.l}</label>)}</div><Fout id="e4" tekst={f.werkvorm} /></div>
          {v.werkvorm !== 'remote' && <div className="field"><label htmlFor="v-locatie">Locatie<span className="req" aria-hidden="true"> *</span></label><input id="v-locatie" name="locatie" defaultValue={v.locatie} placeholder="Bijvoorbeeld Rotterdam-Pernis" aria-invalid={f.locatie ? true : undefined} /><Fout id="e5" tekst={f.locatie} /></div>}
          {v.werkvorm === 'hybride' && <div className="field"><label htmlFor="v-dagen_op_locatie">Dagen op locatie per week</label><select id="v-dagen_op_locatie" name="dagen_op_locatie" defaultValue={String(v.dagen)}>{['', '1', '2', '3', '4', '5'].map(d => <option key={d} value={d}>{d || 'Kies'}</option>)}</select><Fout id="e6" tekst={f.dagen_op_locatie} /></div>}
          <div className="field" id="v-start"><span className="label">Start<span className="req" aria-hidden="true"> *</span></span>
            <div className="p-row"><label className="p-check"><input type="radio" name="start_type" value="asap" defaultChecked={v.start_type === 'asap'} />Zo snel mogelijk</label><label className="p-check"><input type="radio" name="start_type" value="datum" defaultChecked={v.start_type === 'datum'} />Vaste datum</label></div>
            {v.start_type === 'datum' && <input type="date" name="start_datum" min={vandaag} defaultValue={o?.start_datum || ''} aria-label="Startdatum" />}
            <Fout id="e7" tekst={f.start} /></div>
          <div className="field" id="v-looptijd"><span className="label">Looptijd</span>
            <div className="p-row"><label className="p-check"><input type="radio" name="looptijd_type" value="bekend" defaultChecked={v.looptijd_type === 'bekend'} />Bekend</label><label className="p-check"><input type="radio" name="looptijd_type" value="onbekend" defaultChecked={v.looptijd_type === 'onbekend'} />Nog niet bekend</label></div>
            {v.looptijd_type === 'bekend' && <div className="p-row" style={{ flexWrap: 'nowrap' }}><input type="number" name="looptijd_n" min={1} max={104} defaultValue={o?.looptijd_n ?? ''} aria-label="Looptijd aantal" style={{ maxWidth: 120 }} /><select name="looptijd_eenheid" defaultValue={o?.looptijd_eenheid || 'maanden'} aria-label="Eenheid" style={{ maxWidth: 160 }}><option value="weken">weken</option><option value="maanden">maanden</option></select></div>}
            <Fout id="e8" tekst={f.looptijd} /></div>
          <div className="field" id="v-uren"><span className="label">Uren per week<span className="req" aria-hidden="true"> *</span></span>
            <div className="p-row" style={{ flexWrap: 'nowrap' }}><input type="number" name="uren_min" min={1} max={60} value={v.uren_min} onChange={e => setV(x => ({ ...x, uren_min: e.target.value }))} aria-label="Minimaal aantal uren" style={{ maxWidth: 110 }} /><span>tot</span><input type="number" name="uren_max" min={1} max={60} value={v.uren_max} onChange={e => setV(x => ({ ...x, uren_max: e.target.value }))} aria-label="Maximaal aantal uren" style={{ maxWidth: 110 }} /></div>
            <div className="p-row" style={{ gap: 6 }}>{[[16, 24], [24, 32], [32, 40], [36, 40], [40, 40]].map(([a, b]) => <button type="button" key={`${a}-${b}`} className="p-chip" style={{ padding: '4px 11px', fontSize: 13 }} onClick={() => snel(a, b)}>{a === b ? `${a} uur` : `${a}–${b} uur`}</button>)}</div>
            <Fout id="e9" tekst={f.uren} /></div>
        </Sectie>

        <Sectie nr={3} titel="Tarief">
          <div className="field" id="v-tarief">
            <div className="p-row"><label className="p-check"><input type="radio" name="tarief_type" value="bereik" defaultChecked={v.tarief_type === 'bereik'} />Uurtarief</label><label className="p-check"><input type="radio" name="tarief_type" value="overleg" defaultChecked={v.tarief_type === 'overleg'} />In overleg</label></div>
            {v.tarief_type === 'bereik' && <div className="p-row" style={{ flexWrap: 'nowrap' }}><span>€</span><input type="number" name="tarief_min" min={0} max={1000} defaultValue={v.tarief_min} aria-label="Minimaal uurtarief" style={{ maxWidth: 120 }} /><span>tot €</span><input type="number" name="tarief_max" min={0} max={1000} defaultValue={v.tarief_max} aria-label="Maximaal uurtarief" style={{ maxWidth: 120 }} /><span className="p-small p-muted">per uur, excl. btw</span></div>}
            <Fout id="e10" tekst={f.tarief} /></div>
        </Sectie>

        <Sectie nr={4} titel="Wie zoek je?">
          <div className="p-grid2">
            <div className="field"><label htmlFor="v-ervaring">Jaren ervaring (minimaal)</label><input id="v-ervaring" type="number" name="ervaring_jaren" min={0} max={40} defaultValue={o?.ervaring_jaren ?? ''} /></div>
            <div className="field"><label htmlFor="v-aantal">Aantal professionals</label><input id="v-aantal" type="number" name="aantal" min={1} max={50} defaultValue={o?.aantal ?? 1} /></div>
          </div>
          <ChipInvoer naam="vaardigheden" label="Vaardigheden" waarde={o?.vaardigheden || []} placeholder="Bijvoorbeeld SAP PM" />
          <ChipInvoer naam="certificeringen" label="Certificeringen" waarde={o?.certificeringen || []} suggesties={['VCA-VOL', 'VCA-Basis', 'NEN 3140', 'Prince2']} />
          <ChipInvoer naam="talen" label="Talen" waarde={o?.talen || []} suggesties={['Nederlands', 'Engels', 'Duits']} max={10} />
        </Sectie>

        <Sectie nr={5} titel="Perspectief">
          <div className="p-stack" style={{ gap: 10 }}>{Object.entries(PERSPECTIEF).map(([k, l]) => <label key={k} className="p-check"><input type="checkbox" name="perspectief" value={k} defaultChecked={o?.perspectief?.includes(k)} />{l}</label>)}</div>
        </Sectie>

        <Sectie nr={6} titel="Reacties">
          <div className="field" id="v-reactietermijn"><span className="label">Je reageert op reacties<span className="req" aria-hidden="true"> *</span></span>
            <div className="p-row">{Object.entries(REACTIETERMIJN).map(([k, l]) => <label key={k} className="p-check"><input type="radio" name="reactietermijn" value={k} defaultChecked={(o?.reactietermijn || '5_werkdagen') === k} />{l}</label>)}</div><Fout id="e11" tekst={f.reactietermijn} /></div>
          <div className="p-grid2">
            <div className="field"><label htmlFor="v-reageren_tot">Reageren kan tot<span className="req" aria-hidden="true"> *</span></label><input id="v-reageren_tot" type="date" name="reageren_tot" min={vandaag} defaultValue={o?.reageren_tot || ''} aria-invalid={f.reageren_tot ? true : undefined} /><Fout id="e12" tekst={f.reageren_tot} /></div>
            <div className="field"><label htmlFor="v-contact">Contactpersoon</label><select id="v-contact" name="contactpersoon" defaultValue={o?.contactpersoon_id || collegas[0]?.id}>{collegas.map(c => <option key={c.id} value={c.id}>{c.naam}</option>)}</select></div>
          </div>
        </Sectie>
        <div className="p-between">
          <span className="p-small p-muted" role="status" aria-live="polite">{opslag}</span>
          <Verzend pending={pending} bezig="Bezig…">{live ? 'Wijzigingen opslaan' : v.modus === 'bemiddeling' ? 'Opdracht en bemiddeling indienen' : 'Opdracht indienen'}</Verzend>
        </div>
      </form>
      <aside className="p-opdracht-voorbeeld" aria-label="Voorbeeld van je opdracht">
        <p className="p-small p-muted" style={{ marginBottom: 8 }}>Zo zien freelancers je opdracht</p>
        <article className="p-result">
          <span className="p-src direct">Direct geplaatst</span>
          <h3>{v.titel || 'Titel van je opdracht'}</h3>
          <p className="p-muted p-small">{[bedrijfNaam, v.werkvorm === 'remote' ? 'Remote' : v.locatie, werkvormNaam(v.werkvorm), vakgebiedNaam(v.vakgebied)].filter(Boolean).join(' · ')}</p>
          <div className="p-between p-small"><strong>{tariefTekst}</strong><span className="p-muted">{v.uren_min && v.uren_max ? `${v.uren_min}–${v.uren_max} uur` : ''}</span></div>
        </article>
      </aside>
    </div>
  );
}
