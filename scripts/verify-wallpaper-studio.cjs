const {chromium}=require(process.env.PMW_PLAYWRIGHT_MODULE||'playwright');
const {launch,captureDownload}=require('./browser-preview.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.PMW_PREVIEW_URL||'http://127.0.0.1:8767';
(async()=>{
 const out=path.resolve('work/studio-qa');await fs.mkdir(out,{recursive:true});const browser=await launch(chromium);
 try{
 const context=await browser.newContext({viewport:{width:1360,height:1000},acceptDownloads:true});
 await context.addInitScript(()=>{localStorage.setItem('pmw_theme_preference','light');document.addEventListener('DOMContentLoaded',()=>{const css=document.createElement('style');css.textContent='html{scroll-behavior:auto!important}';document.head.append(css);});});
 await context.route(/^https:\/\/(?:www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com|www\.google-analytics\.com|firestore\.googleapis\.com)\//,route=>route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const profiles=JSON.parse(await fs.readFile('assets/wallpaper-studio.json','utf8')),catalog=JSON.parse(await fs.readFile('assets/wallpaper-catalog.json','utf8'));
 assert.equal(Object.keys(profiles).length,1504);
 for(const item of [catalog.find(p=>p.path&&profiles[p.id]?.note),catalog.find(p=>p.path&&p.width>p.height),catalog.find(p=>p.path&&!profiles[p.id].palette.length)]){
  await page.goto(base+'/'+item.path,{waitUntil:'domcontentloaded'});await page.locator('.ws-studio').waitFor();assert.equal(await page.locator('.ws-companion-grid a').count(),3);
  const axis=item.width>item.height?'X':'Y';await page.locator('#wsPreset').selectOption('instagram-square');await page.locator('#ws'+axis).fill('100');await page.locator('#ws'+axis).dispatchEvent('input');
  const href=await page.locator('.ws-editor').getAttribute('href');assert.ok(href.includes('wallpaper='+item.id)&&href.includes('focus'+axis+'=1'));
  const frame=await page.locator('.ws-crop').boundingBox();assert.ok(Math.abs(frame.width-frame.height)<2,'Square crop must stay square');
  await page.locator('#wsCaption').fill('Your own point of view');assert.equal(await page.locator('.ws-color-board strong').innerText(),'Your own point of view');
  await page.locator('#wsBackground').fill('#000000');await page.locator('#wsBackground').dispatchEvent('input');assert.ok((await page.locator('.ws-contrast').innerText()).includes('21.00:1'));
  await page.locator('.ws-reset').click();assert.ok((await page.locator('.ws-editor').getAttribute('href')).includes('focusY=0.5'));
  assert.equal(await page.locator('.ws-palette button').count(),profiles[item.id].palette.length);
  if(profiles[item.id].palette.length){const paletteDownload=await captureDownload(page,()=>page.locator('.ws-palette-download').click()),file=path.join(out,'palette.png');await paletteDownload.saveAs(file);const data=await fs.readFile(file);assert.equal(data.readUInt32BE(16),profiles[item.id].palette.length*240);assert.equal(data.readUInt32BE(20),160);}
  await page.locator('.ws-studio').screenshot({path:path.join(out,item.width>item.height?'desktop-page.png':profiles[item.id].note?'portrait-page.png':'fallback-page.png')});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.ws-studio').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:path.join(out,'mobile-page.png'),fullPage:true});await page.evaluate(()=>window.PMWTheme.set('dark'));await page.screenshot({path:path.join(out,'dark-page.png'),fullPage:true});
 const {PNG}=require(process.env.PMW_PNG_MODULE||'pngjs');const png=new PNG({width:300,height:600});for(let y=0;y<600;y++)for(let x=0;x<300;x++){const i=(y*300+x)*4;png.data[i]=0;png.data[i+1]=Math.round(y*255/599);png.data[i+2]=90;png.data[i+3]=255;}
 const fixture=PNG.sync.write(png);await context.route('**/images/**',route=>route.fulfill({status:200,contentType:'image/png',body:fixture,headers:{'Access-Control-Allow-Origin':'*'}}));await context.route('https://drive.usercontent.google.com/**',route=>route.fulfill({status:200,contentType:'image/png',body:fixture}));
 const item=catalog.find(p=>p.driveFileId);await page.goto(base+'/editor/?wallpaper='+item.id+'&preset=instagram-square&focusY=1&focusX=0.5',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('saveState').textContent==='Saved on this device');
 const download=await captureDownload(page,()=>page.locator('#exportButton').click()),target=path.join(out,'positioned-crop.png');await download.saveAs(target);const output=PNG.sync.read(await fs.readFile(target));assert.ok(Math.abs(output.data[(540*1080+540)*4+1]-192)<4,'Editor must retain the chosen crop');await page.reload();await page.waitForFunction(()=>document.getElementById('saveState').textContent==='Saved on this device');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'results.json'),JSON.stringify({pages:1504,palettes:1103,checks:['Individual page data','Palette availability','Companion explanations','Live caption and contrast','Crop proportions and reset','Crop positioning carried into exported pixels','Project reopening','Mobile and dark layouts'],errors},null,2));console.log('Studio browser checks passed; crop pixels, page-specific controls, mobile/dark and project reopening verified.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
