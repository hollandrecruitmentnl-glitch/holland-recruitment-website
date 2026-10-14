import { chromium } from 'playwright';
import fs from 'node:fs';
const B='https://www.holland-recruitment.nl';
const OUT='/sessions/elegant-bold-dirac/mnt/Holland Recruitment/2 - Website/Audit 2026-10-14 (2) conversie/shots';
fs.mkdirSync(OUT,{recursive:true});
const PAG=[['/','home'],['/registreren','registreren-keuze'],['/registreren?rol=freelancer','registreren-freelancer'],['/registreren?rol=bedrijf','registreren-bedrijf'],['/voor-bedrijven','voor-bedrijven'],['/freelancers','freelancers'],['/professional-aanvragen','professional-aanvragen'],['/bemiddeling','bemiddeling'],['/opdrachten','opdrachten'],['/freelancers-zoeken','freelancers-zoeken'],['/expertises/it-data','expertise-it'],['/freelancer-inhuren/rotterdam','regio-rotterdam'],['/inloggen','inloggen'],['/werkwijze','werkwijze'],['/freelancers/hoe-werkt-het','freelancers-hoe-werkt-het']];
const b=await chromium.launch();
const meet={};
for (const [vp,naam] of [[{width:1440,height:900},'d'],[{width:390,height:844},'m']]) {
  const c=await b.newContext({viewport:vp, deviceScaleFactor:1, isMobile:naam==='m', hasTouch:naam==='m', locale:'nl-NL'});
  await c.addInitScript(()=>{ try{ localStorage.setItem('hr-cookie-consent', JSON.stringify({version:1,essential:true,analytics:false,marketing:false,timestamp:new Date().toISOString()})); }catch(e){} });
  const p=await c.newPage();
  for (const [u,n] of PAG) {
    await p.goto(B+u,{waitUntil:'networkidle'}).catch(()=>{});
    await p.evaluate(async()=>{ for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y); await new Promise(r=>setTimeout(r,60));} window.scrollTo(0,0); document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in','visible','is-visible')); });
    await p.waitForTimeout(400);
    await p.screenshot({path:`${OUT}/${naam}-${n}.png`, fullPage:true});
    if (naam==='d') await p.screenshot({path:`${OUT}/${naam}-${n}-boven.png`});
    if (naam==='m') await p.screenshot({path:`${OUT}/${naam}-${n}-boven.png`});
    const r=await p.evaluate(()=>{
      const H=document.documentElement.scrollHeight, W=innerWidth, VH=innerHeight;
      const links=[...document.querySelectorAll('a[href]')];
      const reg=links.filter(a=>/\/registreren/.test(a.getAttribute('href')));
      const visReg=reg.filter(a=>{const r=a.getBoundingClientRect(); return r.width>0&&r.height>0;});
      const boven=[...document.querySelectorAll('a.btn,button.btn,a[class*=btn]')].filter(a=>{const r=a.getBoundingClientRect(); return r.width>0&&r.top<VH&&r.bottom>0;}).map(a=>a.innerText.trim()).filter(Boolean);
      const main=document.querySelector('main')||document.body;
      const secties=[...main.children].filter(e=>e.getBoundingClientRect().height>40);
      const woorden=(main.innerText||'').split(/\s+/).filter(Boolean).length;
      return {hoogte:H, schermen:+(H/VH).toFixed(1), links:links.length, regLinks:reg.length, regZichtbaar:visReg.length, regTeksten:[...new Set(visReg.map(a=>a.innerText.trim()).filter(Boolean))].slice(0,8), knoppenBoven:boven, secties:secties.length, woorden, h1:document.querySelector('h1')?.innerText};
    });
    meet[`${naam} ${u}`]=r;
  }
  await c.close();
}
await b.close();
fs.writeFileSync(OUT+'/../metingen.json', JSON.stringify(meet,null,1));
for (const [k,v] of Object.entries(meet)) console.log(k.padEnd(36), `h=${v.hoogte} (${v.schermen} schermen) links=${v.links} reg=${v.regLinks}/${v.regZichtbaar} woorden=${v.woorden} | boven: ${v.knoppenBoven.join(' · ')} | reg: ${v.regTeksten.join(' · ')}`);
