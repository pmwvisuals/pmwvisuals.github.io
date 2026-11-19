const {chromium}=require(process.env.PMW_PLAYWRIGHT_MODULE||'playwright');
const {launch}=require('./browser-preview.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.env.PMW_PREVIEW_URL||'http://127.0.0.1:8774';
(async()=>{
 const browser=await launch(chromium);
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.route(/^https:\/\/(?:www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com|www\.google-analytics\.com|firestore\.googleapis\.com)\//,route=>route.abort());
  await context.addInitScript(()=>{if(!localStorage.getItem('pmw_theme_preference'))localStorage.setItem('pmw_theme_preference','light');});
  const page=await context.newPage();
  const open=async(query='')=>{
   await page.goto(base+'/'+query,{waitUntil:'domcontentloaded'});
   await page.locator('#wallpaperPagePopup').waitFor({state:'attached'});
   await page.locator('#wallpapersGrid .wa-card-link').first().waitFor();
  };
  const frame=()=>page.frameLocator('#wallpaperPagePopup iframe');
  const popup=()=>page.locator('#wallpaperPagePopup');
  await open();
  const card=page.locator('#wallpapersGrid .wa-card-link').first();
  const href=await card.getAttribute('href');
  const direct=await context.newPage();
  await direct.goto(new URL(href,base).href,{waitUntil:'domcontentloaded'});
  await direct.locator('.ws-studio').waitFor();
  const expected=await direct.locator('main').innerText();
  const collectionURL=new URL(await direct.locator('nav.breadcrumb a').nth(1).getAttribute('href'),base).href;
  const originalDownload=await direct.locator('[data-protected-wallpaper]').getAttribute('data-download-url');
  await direct.close();
  await card.scrollIntoViewIfNeeded();
  const scroll=await page.evaluate(()=>scrollY),galleryURL=page.url();
  await card.click();
  await frame().locator('.ws-studio').waitFor();
  await page.locator('#wallpaperPagePopup iframe.is-ready').waitFor();
  assert.equal(page.url(),galleryURL,'Gallery URL must stay unchanged');
  assert.equal(await frame().locator('main').innerText(),expected,'Full original page content must match');
  assert.equal(await frame().locator('[data-protected-wallpaper]').getAttribute('data-download-url'),originalDownload);
  assert.equal(await frame().locator('#downloadButton').isEnabled(),true);
  assert.equal(await frame().locator('#wallpaperPagePopup').count(),0,'No nested popup');
  await fs.mkdir('work/popup-qa',{recursive:true});
  await page.screenshot({path:'work/popup-qa/desktop.png'});
  await frame().locator('#wsPreset').selectOption('instagram-square');
  assert.ok((await frame().locator('.ws-editor').getAttribute('href')).includes('preset=instagram-square'));
  const related=frame().locator('a.related-card,.wa-card-link').first();
  const relatedURL=new URL(await related.getAttribute('href'),base);
  await related.click();
  await page.waitForFunction(path=>document.querySelector('#wallpaperPagePopup iframe')?.contentDocument?.location.pathname===path,relatedURL.pathname);
  await frame().locator('.ws-studio').waitFor();
  await frame().locator('h1').click();
  await page.keyboard.press('Escape');
  await popup().waitFor({state:'hidden'});
  assert.equal(await card.evaluate(el=>el===document.activeElement),true);
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<3,'Gallery scroll must be retained');
  // Keyboard opening, separate preview menu Escape, then modal Escape.
  await card.focus();await page.keyboard.press('Enter');
  await frame().locator('.wa-detail-tools').waitFor();
  await frame().locator('.wa-detail-tools [data-wa-action="formats"]').click();
  await frame().locator('#waDropdown:popover-open').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await popup().isVisible(),true,'Escape from a format menu should only close that menu');
  await page.keyboard.press('Escape');await popup().waitFor({state:'hidden'});
  // A close event queued by the previous dialog must not clear a newly opened page.
  await card.click();await frame().locator('.ws-studio').waitFor();
  await page.evaluate(()=>{
   document.querySelector('.wallpaper-popup-close').click();
   document.querySelector('#wallpapersGrid .wa-card-link').click();
  });
  await frame().locator('.ws-studio').waitFor();
  await page.locator('.wallpaper-popup-close').click();
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  // Opening editor from inside the popup must use the full browser viewport.
  await card.click();await frame().locator('.ws-editor').waitFor();
  await frame().locator('.ws-editor').click();
  await page.waitForURL('**/editor/**');
  // Mobile, dark theme and close affordance.
  await page.setViewportSize({width:390,height:844});await open();
  await page.evaluate(()=>window.PMWTheme.set('dark'));
  await page.locator('#wallpapersGrid .wa-card-link').first().click();
  await frame().locator('.ws-studio').waitFor();
  assert.equal(await popup().evaluate(el=>Math.round(el.getBoundingClientRect().width)),390);
  assert.equal(await frame().locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await frame().locator('html').evaluate(el=>el.scrollWidth<=innerWidth+1),true);
  await fs.mkdir('work/popup-qa',{recursive:true});
  await page.screenshot({path:'work/popup-qa/mobile.png'});
  await page.locator('.wallpaper-popup-close').click();
  await popup().waitFor({state:'hidden'});
  // Failure state retries the same page and retains an escape route.
  const failureURL=new URL(await page.locator('#wallpapersGrid .wa-card-link').first().getAttribute('href'),base).href;
  await context.route(failureURL,route=>route.fulfill({status:503,contentType:'text/html',body:'Unavailable'}));
  await page.locator('#wallpapersGrid .wa-card-link').first().click();
  await page.locator('.wallpaper-popup-error').waitFor({state:'visible'});
  assert.equal(await page.locator('.wallpaper-popup-error a').getAttribute('href'),failureURL);
  await context.unroute(failureURL);
  await page.locator('.wallpaper-popup-error button').click();
  await frame().locator('.ws-studio').waitFor();
  await page.locator('.wallpaper-popup-close').click();
  // Single-visit rollback and untouched standalone pages.
  await page.goto(base+'/?wallpaperView=page',{waitUntil:'domcontentloaded'});
  await page.locator('#wallpapersGrid .wa-card-link').first().waitFor();
  assert.equal(await popup().count(),0);
  const standaloneURL=new URL(await page.locator('#wallpapersGrid .wa-card-link').first().getAttribute('href'),base).href;
  await page.locator('#wallpapersGrid .wa-card-link').first().click();
  await page.waitForURL(standaloneURL);
  await page.locator('.ws-studio').waitFor();
  // Collection cards and the full artwork directory use the same popup behavior.
  await page.goto(collectionURL,{waitUntil:'domcontentloaded'});
  await popup().waitFor({state:'attached'});
  await page.locator('.ed-grid .wa-card-link').first().click();
  await frame().locator('.ws-studio').waitFor();
  assert.equal(page.url(),collectionURL);
  await page.locator('.wallpaper-popup-close').click();
  await page.goto(base+'/wallpapers/',{waitUntil:'domcontentloaded'});
  await popup().waitFor({state:'attached'});
  // Expanding an artwork group exposes its original links, which stay crawlable.
  await page.locator('.ed-directory details').first().locator('summary').click();
  const detail=page.locator('.ed-directory details').first().locator('li a').first();
  await detail.click();
  await frame().locator('.ws-studio').waitFor();
  assert.equal(page.url(),base+'/wallpapers/');
  console.log('PASS: Full wallpaper content, original download access, studio controls, related artwork, editor navigation, keyboard and Escape, focus/scroll restoration, mobile/dark, failure retry, and rollback.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
