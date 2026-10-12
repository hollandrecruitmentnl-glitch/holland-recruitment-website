'use client';
import { useState } from 'react';

/** Chipinvoer met suggesties. Waarde gaat als komma-gescheiden hidden input mee. */
export default function ChipInvoer({ naam, label, waarde, suggesties = [], placeholder, max = 30 }: { naam: string; label: string; waarde: string[]; suggesties?: string[]; placeholder?: string; max?: number }) {
  const [items, setItems] = useState<string[]>(waarde || []);
  const [t, setT] = useState('');
  const id = `chip-${naam}`;
  const voeg = (s: string) => { const v = s.trim().replace(/,/g, ''); if (v && !items.some(i => i.toLowerCase() === v.toLowerCase()) && items.length < max) setItems([...items, v.slice(0, 60)]); setT(''); };
  const sug = suggesties.filter(s => !items.includes(s) && (!t || s.toLowerCase().includes(t.toLowerCase()))).slice(0, 8);
  return (
    <div className="field full">
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={naam} value={items.join(', ')} />
      {items.length > 0 && <ul className="p-row" style={{ gap: 6 }} aria-label={`${label}: gekozen`}>{items.map(i => (
        <li key={i} className="p-filterchip" style={{ padding: '4px 4px 4px 12px' }}>{i}<button type="button" onClick={() => setItems(items.filter(x => x !== i))} aria-label={`${i} verwijderen`}>×</button></li>))}</ul>}
      <input id={id} value={t} onChange={e => setT(e.target.value)} placeholder={placeholder || 'Typ en druk op Enter'}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); voeg(t); } else if (e.key === 'Backspace' && !t && items.length) setItems(items.slice(0, -1)); }}
        onBlur={() => t && voeg(t)} />
      {sug.length > 0 && <div className="p-row" style={{ gap: 6 }}><span className="p-xs p-muted">Suggesties:</span>{sug.map(s => <button type="button" key={s} className="p-chip" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => voeg(s)}>+ {s}</button>)}</div>}
    </div>
  );
}
