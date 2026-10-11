// Capture publicly served HTML, rendered DOM, layout evidence and screenshots.
// This is not the site's private/backend source code.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const output = process.env.GITHUB_WORKSPACE
  ? path.join(process.env.GITHUB_WORKSPACE, 'white-harvest-inspection')
  : path.resolve('./white-harvest-inspection');
fs.mkdirSync(output, { recursive: true });
const url = 'https://zaap.bio/whiteharvestorg';
const report = { url, observedAt: new Date().toISOString(), visits: {}, errors: [], network: [] };
(async () => {
  const browser = await chromium.launch({headless:true});
  for (const view of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport: { width:view.width, height:view.height }, deviceScaleFactor: 1, isMobile: view.name === 'mobile', hasTouch: view.name === 'mobile' });
    page.on('pageerror', e => report.errors.push(view.name + ': ' + String(e).slice(0,350)));
    page.on('response', r => { if (report.network.length < 180) report.network.push({status:r.status(), type:r.request().resourceType(),url:r.url().slice(0,400)}); });
    try {
      const response = await page.goto(url, {waitUntil:'domcontentloaded', timeout:45000});
      await page.waitForTimeout(4000);
      const status = response?.status() ?? null;
      const finalUrl = page.url();
      const title = await page.title();
      const html = await page.content();
      fs.writeFileSync(path.join(output, view.name + '-rendered.html'), html);
      await page.screenshot({ path: path.join(output, view.name + '.png'), fullPage:true, timeout:20000 }).catch(e => {report.errors.push('screenshot '+view.name+': '+e.message);});
      const elements = await page.evaluate(() => {
        const q = (sel) => [...document.querySelectorAll(sel)];
        const clean = s => (s || '').trim().replace(/\s+/g,' ').slice(0,500);
        const rect = e => { const r=e.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y+scrollY),width:Math.round(r.width),height:Math.round(r.height)}; };
        const sample = q('header, main, footer, section, h1, h2, h3, button, a, img').slice(0,140).map(e=>{const c=getComputedStyle(e);return{tag:e.tagName.toLowerCase(),text:clean(e.innerText||e.alt),url:e.href||e.src||null,box:rect(e),styles:{color:c.color,background:c.backgroundColor,font:c.fontFamily,fontSize:c.fontSize,borderRadius:c.borderRadius},className:String(e.className).slice(0,120)};});
        return { title:document.title, description:document.querySelector('meta[name="description"]')?.content||'', headings:q('h1,h2,h3').map(e=>clean(e.innerText)), links:q('a[href]').map(e=>({title:clean(e.innerText),href:e.href})), images:q('img').map(e=>({alt:e.alt,src:e.src,box:rect(e)})), stylesheets:q('link[rel="stylesheet"]').map(e=>e.href), scripts:q('script[src]').map(e=>e.src), inlineCss:q('style').map(e=>e.textContent.slice(0,120000)), elements:sample, bodyBackground:getComputedStyle(document.body).backgroundColor, bodyText:clean(document.body.innerText).slice(0,10000), dimensions:{scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}};
      });
      report.visits[view.name] = {status,finalUrl,title,length:html.length,elements};
      console.log(view.name.toUpperCase(),JSON.stringify({status,finalUrl,title,htmlBytes:html.length, headings:elements.headings,links:elements.links.length,images:elements.images.length}));
    } catch(e) {
      report.visits[view.name] = {error:String(e)};
      report.errors.push(view.name+': '+String(e));
      console.error('Navigation error',view.name,String(e));
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(output, 'README.txt'), 'PUBLIC browser-delivered material only. Does not include Zaap private/server-side source code.\nTarget: '+url+'\n'+JSON.stringify(Object.fromEntries(Object.entries(report.visits).map(([k,v])=>[k,{httpStatus:v.status,finalUrl:v.finalUrl,title:v.title,error:v.error}])),null,2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ['## White Harvest browser inspection','','Source: '+url,'','| View | HTTP status | Page title |','|---|---|---|'];
    for(const [key,value] of Object.entries(report.visits))lines.push('| '+key+' | '+(value.status ?? 'error')+' | '+String(value.title||value.error||'').replace(/[|\n]/g,' ').slice(0,90)+' |');
    lines.push('','Artifact: white-harvest-reference-capture (HTML + screenshots + layout metadata).');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
  }
})().catch(e=>{console.error(e);process.exitCode=1});