const { chromium } = require('playwright');
const { strict: assert } = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const url = 'https://white-harvest-source-preview.vercel.app/';
const out = path.join(process.env.GITHUB_WORKSPACE || process.cwd(), 'linkhub-v2-check');
fs.mkdirSync(out, {recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 for(const width of [1440,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#movies-items .link-card').first().waitFor({timeout:20000});
  const title=await page.locator('#site-name').innerText();
  assert.equal(title,'Name coming soon');
  assert.equal(await page.locator('#movies-items .link-card').count(),4);
  const size=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,windowWidth:innerWidth}));
  assert.ok(size.documentWidth<=size.windowWidth+1,'Horizontal viewport overflow @'+width+': '+JSON.stringify(size));
  assert.deepEqual(errors,[],'JavaScript errors at '+width);
  await page.screenshot({path:path.join(out,width+'.png'),fullPage:true});
  if(width===390){
    await page.getByRole('button',{name:/show 3 more movies/i}).click();
    assert.equal(await page.locator('#movies-items .link-card').count(),7);
    await page.locator('#search').fill('behind the scenes');
    assert.equal(await page.locator('.link-card').count(),1);
    assert.match(await page.locator('.link-card h3').innerText(),/Behind the scenes/i);
    await page.locator('#search').fill('nothing-will-match-hopefully');
    assert.equal(await page.locator('.empty-state').count(),1);
  }
  results.push({width,status:response.status(),title,noHorizontalOverflow:true,consoleErrors:errors.length,searchAndShowMore:width===390?'passed':'not-run'});
  await page.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
