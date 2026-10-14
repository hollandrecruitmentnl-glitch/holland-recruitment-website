// Mobiele testmatrix: overflow, tapdoelen, lettergrootte, overlappende vaste elementen. Draait tegen localhost:3100 (demo-data).
import { chromium } from 'playwright';
import fs from 'node:fs';
import pg from 'pg';

const B = process.env.BASIS || 'http://localhost:3100';
const OUT = 'test-results/mobiel'; fs.mkdirSync(OUT, { recursive: true });
const BREEDTES = [320, 360, 375, 390, 430];
const db = new pg.Client('postgres://postgres:postgres@127.0.0.1:5433/postgres'); await db.connect();
const fl = (await db.query(`select f.slug from freelancers f join accounts a on a.id=f.id where a.status='actief' and f.slug is not null order by f.bijgewerkt desc limit 1`)).rows[0]?.slug;
const op = (await db.query(`select slug from opdrachten where status='live' and bedrijf_id is not null order by geplaatst_op desc limit 1`)).rows[0]?.slug;
await db.end();

const PUBLIEK = ['/', '/?zoek=opdrachten', '/opdrachten', `/opdrachten/${op}`, '/freelancers-zoeken', `/freelancer/${fl}`, '/freelance-opdrachten', '/freelance-opdrachten/rotterdam',
  '/registreren', '/registreren?rol=bedrijf&ctx=bericht&terug=%2Ffreelancer%2Fx', '/registreren?rol=freelancer', '/inloggen', '/bemiddeling', '/bedrijven', '/uitnodiging/voorbeeld', '/wachtwoord-vergeten'];
const FREELANCER = ['/mijn', '/mijn/profiel', '/mijn/reacties', '/mijn/berichten', '/mijn/account'];
const BEDRIJF = ['/mijn', '/mijn/opdrachten', '/mijn/opdrachten/nieuw', '/mijn/berichten', '/freelancers-zoeken', `/freelancer/${fl}`];

const meet = () => {
  const W = window.innerWidth, r = [];
  const zichtbaar = el => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 && el.checkVisibility?.() !== false; };
  const inScroller = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
  const naam = el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30) + '"');
  const sw = document.documentElement.scrollWidth;
  if (sw > W + 1) r.push(`OVERFLOW pagina ${sw}px > ${W}px`);
  for (const el of document.querySelectorAll('body *')) {
    if (!zichtbaar(el) || inScroller(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.right > W + 1 && b.width < W * 3) r.push(`OVERFLOW ${naam(el)} rechts=${Math.round(b.right)}`);
  }
  for (const el of document.querySelectorAll('a,button,input:not([type=hidden]),select,textarea,summary,[role=button]')) {
    if (!zichtbaar(el)) continue;
    const s = getComputedStyle(el); const b = el.getBoundingClientRect();
    if (b.right < 0 || el.getAttribute('aria-hidden') === 'true' || el.classList.contains('sr-only') || el.classList.contains('p-filters-toggle')) continue;
    if (s.display === 'inline' && el.closest('p,li,td,label,small,.p-muted,.footer-regio,h1,h2,h3,dd')) continue;
    if (el.type === 'checkbox' || el.type === 'radio') { const l = el.closest('label'); if (l && l.getBoundingClientRect().height >= 24) continue; }
    if (b.height < 24 || b.width < 24) r.push(`TAP<24 ${naam(el)} ${Math.round(b.width)}x${Math.round(b.height)}`);
    else if ((el.tagName === 'BUTTON' || /\bbtn\b/.test(el.className)) && b.height < 36) r.push(`KNOP<36 ${naam(el)} ${Math.round(b.width)}x${Math.round(b.height)}`);
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !['checkbox', 'radio', 'file'].includes(el.type) && parseFloat(s.fontSize) < 16) r.push(`INPUT-ZOOM ${naam(el)} font ${s.fontSize}`);
  }
  for (const el of document.querySelectorAll('p,li,span,a,label,small,td,th,h1,h2,h3,h4,button,dd,dt,div,strong,em')) {
    if (!zichtbaar(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const f = parseFloat(getComputedStyle(el).fontSize); if (f < 12) r.push(`FONT<12 ${naam(el)} ${f}px`);
  }
  const vast = [...document.querySelectorAll('body *')].filter(el => { const p = getComputedStyle(el).position; return p === 'fixed' && zichtbaar(el); });
  for (let i = 0; i < vast.length; i++) for (let j = i + 1; j < vast.length; j++) {
    if (vast[i].contains(vast[j]) || vast[j].contains(vast[i])) continue;
    const a = vast[i].getBoundingClientRect(), c = vast[j].getBoundingClientRect();
    const ov = Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) * Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top));
    if (ov > 200) r.push(`VAST-OVERLAP ${naam(vast[i])} × ${naam(vast[j])}`);
  }
  for (const el of vast) { const b = el.getBoundingClientRect(); if (b.height > window.innerHeight * 0.3 && b.height < window.innerHeight * 0.95) r.push(`INFO vast element ${naam(el)} ${Math.round(b.height / window.innerHeight * 100)}% van scherm`); }
  return [...new Set(r)];
};

const b = await chromium.launch();
const totaal = {};
async function ronde(label, paginas, email) {
  for (const w of BREEDTES) {
    const c = await b.newContext({ viewport: { width: w, height: w < 360 ? 568 : 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'nl-NL' });
    const p = await c.newPage();
    if (email) {
      await p.goto(`${B}/inloggen`); await p.fill('#v-email', email); await p.fill('#v-wachtwoord', 'Test1234!');
      await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/inloggen')), p.click('button[type=submit]')]);
    }
    let eerste = !email;
    for (const u of paginas) {
      await p.goto(B + u, { waitUntil: 'networkidle' }).catch(() => {});
      await p.waitForTimeout(250);
      if (eerste) {
        const rs = await p.evaluate(meet); (totaal[`${label} ${u} @${w} (eerste bezoek, cookiebalk)`] = rs.filter(x => x.startsWith('INFO') || x.startsWith('VAST')));
        if (w === 320 || w === 390) await p.screenshot({ path: `${OUT}/${label}-eerste-bezoek-${w}.png` });
      }
      const ck = p.getByRole('button', { name: /Alleen essentieel|Weigeren/ }); if (await ck.first().isVisible().catch(() => false)) { await ck.first().click(); await p.waitForTimeout(200); }
      eerste = false;
      const rs = (await p.evaluate(meet)).filter(x => !x.startsWith('INFO'));
      if (rs.length) totaal[`${label} ${u} @${w}`] = rs;
      if (w === 320 || w === 390) await p.screenshot({ path: `${OUT}/${label}-${u.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}-${w}.png`, fullPage: true });
    }
    const burger = p.locator('.burger'); if (await burger.isVisible().catch(() => false)) {
      await burger.click(); await p.waitForTimeout(350);
      const rs = (await p.evaluate(meet)).filter(x => !x.startsWith('INFO')); if (rs.length) totaal[`${label} menu-open @${w}`] = rs;
      if (w === 320 || w === 390) await p.screenshot({ path: `${OUT}/${label}-menu-${w}.png` });
    }
    await c.close();
  }
}
await ronde('publiek', PUBLIEK);
await ronde('freelancer', FREELANCER, 'sanne@test.local');
await ronde('bedrijf', BEDRIJF, 'eva@rijnmond-test.nl');
await b.close();
fs.writeFileSync(`${OUT}/rapport.json`, JSON.stringify(totaal, null, 1));
// Samenvatting: groepeer per bevinding over breedtes heen
const groep = {};
for (const [k, v] of Object.entries(totaal)) for (const x of v) { const sleutel = k.replace(/ @\d+/, '') + ' | ' + x.replace(/rechts=\d+|\d+x\d+|\d+% /g, ''); (groep[sleutel] ||= new Set()).add(k.match(/@(\d+)/)[1]); }
for (const [k, v] of Object.entries(groep).sort()) console.log(`${k}  [${[...v].join(',')}]`);
console.log(`\nUnieke bevindingen: ${Object.keys(groep).length}`);
