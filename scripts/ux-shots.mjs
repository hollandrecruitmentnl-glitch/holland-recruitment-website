import { chromium } from 'playwright';
const B='http://localhost:3100'; const OUT='test-results/ux';
import fs from 'node:fs'; fs.mkdirSync(OUT,{recursive:true});
const b=await chromium.launch();
async function als(email, naam, paginas, vp={width:1280,height:900}) {
  const p=await (await b.newContext({viewport:vp})).newPage();
  await p.goto(`${B}/inloggen`); await p.fill('#v-email',email); await p.fill('#v-wachtwoord','Test1234!');
  await Promise.all([p.waitForURL(u=>!u.pathname.startsWith('/inloggen')), p.click('button[type=submit]')]);
  const ck=p.getByRole('button',{name:'Alleen essentieel'}); if (await ck.isVisible().catch(()=>false)) await ck.click();
  for (const [u,f] of paginas) { await p.goto(B+u); await p.waitForTimeout(800); await p.screenshot({path:`${OUT}/${naam}-${f}.png`, fullPage:true}); }
  return p;
}
await als('eva@rijnmond-test.nl','bedrijf',[['/mijn','overzicht'],['/mijn/opdrachten','opdrachten'],['/freelancers-zoeken','zoeken']]);
const pb = await als('eva@rijnmond-test.nl','bedrijf-mobiel',[['/mijn','overzicht']],{width:390,height:844});
await pb.click('.burger'); await pb.waitForTimeout(300); await pb.screenshot({path:`${OUT}/bedrijf-mobiel-menu.png`, fullPage:true});
await als('sanne@test.local','freelancer',[['/mijn','overzicht'],['/mijn/profiel','profiel'],['/opdrachten','opdrachten']]);
const pf = await als('sanne@test.local','freelancer-mobiel',[['/mijn','overzicht']],{width:390,height:844});
await pf.click('.burger'); await pf.waitForTimeout(300); await pf.screenshot({path:`${OUT}/freelancer-mobiel-menu.png`, fullPage:true});
const pfh = await als('sanne@test.local','freelancer-menu',[['/mijn','x']]);
await pfh.click('summary[aria-label=Accountmenu]'); await pfh.waitForTimeout(300); await pfh.screenshot({path:`${OUT}/freelancer-accountmenu.png`});
const pbh = await als('eva@rijnmond-test.nl','bedrijf-menu',[['/mijn/opdrachten','x']]);
await pbh.click('summary[aria-label=Accountmenu]'); await pbh.waitForTimeout(300); await pbh.screenshot({path:`${OUT}/bedrijf-accountmenu.png`});
const pu = await (await b.newContext({viewport:{width:1280,height:900}})).newPage(); await pu.goto(B+'/'); await pu.screenshot({path:`${OUT}/uitgelogd-home.png`});
await b.close(); console.log('klaar');
