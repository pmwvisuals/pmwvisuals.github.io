const {chromium}=require(process.env.PMW_PLAYWRIGHT_MODULE||'playwright');
const {launch,captureDownload}=require('./browser-preview.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const base=process.env.PMW_PREVIEW_URL||'http://127.0.0.1:8767';
const output=path.resolve(process.env.PMW_QA_DIR||'work/wallpaper-qa');
function gradientPNG(width,height){
 const {PNG}=require(process.env.PMW_PNG_MODULE||'pngjs');const png=new PNG({width,height});
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;png.data[i]=Math.round(x*255/(width-1));png.data[i+1]=Math.round(y*255/(height-1));png.data[i+2]=70;png.data[i+3]=255;}
 return PNG.sync.write(png);
}
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await launch(chromium),checks=[];
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await context.addInitScript(()=>localStorage.setItem('pmw_theme_preference','light'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const open=url=>page.goto(url,{waitUntil:'domcontentloaded'});
 const originalPush=checks.push.bind(checks);checks.push=(value)=>{console.log('PASS',value);return originalPush(value);};
 const catalog=JSON.parse(await fs.readFile(path.join(__dirname,'../assets/wallpaper-catalog.json'),'utf8'));
 const portrait=catalog.find(p=>p.driveFileId),landscape=catalog.find(p=>p.width>p.height);
 const saved=()=>page.waitForFunction(()=>document.getElementById('saveState')?.textContent==='Saved on this device');
 const project=()=>page.evaluate(async()=>{const {getProject}=await import('/js/creative/storage.js');return getProject(new URLSearchParams(location.search).get('project'));});
 const shot=name=>page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
 const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Horizontal overflow');
 await open(base+'/');assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('#wallpapersGrid').count(),0);await noOverflow();await shot('home-desktop');checks.push('Dedicated homepage');
 await open(base+'/?device=desktop#latest-wallpapers');await page.waitForURL('**/browse/?device=desktop#latest-wallpapers',{waitUntil:'domcontentloaded'});await page.locator('.wa-card-actions').first().waitFor();checks.push('Legacy gallery redirect');
 await page.locator('[data-wa-action="preview"]').first().click();await page.locator('.wa-desktop').waitFor();await shot('desktop-preview');await page.keyboard.press('Escape');assert.equal(await page.locator('dialog.wa-dialog[open]').count(),0);checks.push('Desktop preview and Escape');
 await open(base+'/browse/');await page.locator('.wa-card-actions').first().waitFor();await noOverflow();assert.equal(await page.locator('.wa-card-link button,.wa-card-link [role="button"],a a').count(),0);
 await page.evaluate(item=>{const strip=document.createElement('div');strip.id='savedWallpaperPreviewStrip';const link=document.createElement('a');link.href='/'+item.path;link.dataset.wallpaperId=item.id;link.textContent=item.title;strip.append(link);document.body.append(strip);},portrait);
 await page.locator('#savedWallpaperPreviewStrip .wa-card-actions').waitFor();checks.push('Saved-card component receives independent format and preview controls');
 assert.ok((await page.locator('.wa-card').first().boundingBox()).y<1000,'First cards below the viewport');
 await page.locator('[data-wa-action="preview"]').first().click();await page.locator('.wa-phone').waitFor();const dialogBounds=await page.locator('.wa-dialog').boundingBox();assert.ok(Math.abs(dialogBounds.x+dialogBounds.width/2-720)<2,'Preview must be centered');await page.locator('button[data-screen="home"]').click();assert.equal(await page.locator('.wa-phone').getAttribute('data-screen'),'home');await shot('phone-preview');await page.keyboard.press('Escape');checks.push('Centered phone preview, home/lock controls, separate actions');
 await page.locator('[data-wa-action="formats"]').first().click();assert.equal(await page.locator('.wa-formats a').count(),14);const formatLink=page.locator('.wa-formats a').filter({hasText:'Portrait post'}).first();assert.ok((await formatLink.getAttribute('href')).includes('preset=instagram-portrait'));await shot('formats');await page.keyboard.press('Escape');
 await open(base+'/wallpapers/amoled/');await page.locator('.wa-card-actions').first().waitFor();checks.push('Collection cards');
 await open(base+'/'+portrait.path);await page.locator('.related-grid .wa-card-actions').first().waitFor();checks.push('Related artwork cards');
 await open(base+'/pmw-desktop-wallpapers.html');await page.waitForURL('**/browse/?device=desktop#latest-wallpapers',{waitUntil:'domcontentloaded'});await page.locator('.wa-card-actions').first().waitFor();checks.push('Legacy desktop entry reaches the enhanced desktop gallery');
 // A deterministic original with visible coordinates lets us verify the exported crop.
 let fixture=gradientPNG(300,600),failure=false;
 await context.route('https://drive.usercontent.google.com/download**',route=>route.fulfill({status:200,contentType:failure?'text/html':'image/png',body:failure?'<html>Unavailable</html>':fixture,headers:{'Access-Control-Allow-Origin':'*'}}));
 await context.route('https://drive.google.com/uc**',route=>route.fulfill({status:403,body:'Unavailable',headers:{'Access-Control-Allow-Origin':'*'}}));
 const presets=await page.evaluate(async()=> (await import('/js/creative/presets.js')).PRESETS);
 for(const preset of presets){
  await open(`${base}/editor/?wallpaper=${encodeURIComponent(portrait.id)}&preset=${preset.id}`);await saved();
  const data=await project();assert.equal(data.width,preset.width);assert.equal(data.height,preset.height);assert.equal(data.wallpaperContext.presetId,preset.id);
  assert.equal(await page.locator('#exportButton').innerText(),'Download PNG');
  const download=await captureDownload(page,()=>page.locator('#exportButton').click());const target=path.join(output,preset.id+'.png');await download.saveAs(target);
  const png=await fs.readFile(target);assert.equal(png.readUInt32BE(16),preset.width);assert.equal(png.readUInt32BE(20),preset.height);
  assert.equal(await page.locator('#exportDialog[open]').count(),0);
 }
 checks.push('All 14 presets: automatic original import, crop, and one-click full-size PNG export');
 for(const [w,h] of [[300,600],[600,300],[300,300]]){
  fixture=gradientPNG(w,h);await open(`${base}/editor/?wallpaper=${portrait.id}&preset=instagram-square`);await saved();
  const download=await captureDownload(page,()=>page.locator('#exportButton').click());const file=path.join(output,`crop-${w}x${h}.png`);await download.saveAs(file);
  const {PNG}=require(process.env.PMW_PNG_MODULE||'pngjs'),png=PNG.sync.read(await fs.readFile(file));const center=(540*png.width+540)*4;
  assert.ok(Math.abs(png.data[center]-128)<4);assert.ok(Math.abs(png.data[center+1]-128)<4);
  const nearTop=(1*png.width+540)*4,nearLeft=(540*png.width+1)*4;
  assert.ok(Math.abs(png.data[nearTop+1]-(h>w?64:0))<5);assert.ok(Math.abs(png.data[nearLeft]-(w>h?64:0))<5);
 }
 checks.push('Exported pixels confirm centered, unstretched portrait/landscape/square crops');
 await page.reload();await saved();assert.equal((await project()).wallpaperContext.presetId,'instagram-square');assert.equal(await page.locator('#exportButton').innerText(),'Download PNG');
 await page.locator('#moreExportButton').click();await page.locator('#exportDialog[open]').waitFor();await page.locator('[data-close-dialog]').filter({hasText:'Back to editing'}).click();checks.push('Local project recovery and optional export settings');
 failure=true;await open(`${base}/editor/?wallpaper=${portrait.id}&preset=pinterest-pin`);await page.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.equal(await page.locator('#exportButton').isDisabled(),true);assert.equal(await page.locator('#canvasSize').innerText(),'1000 × 1500');
 const upload=path.join(output,'original.png');await fs.writeFile(upload,gradientPNG(300,600));await page.locator('#photoInput').setInputFiles(upload);await saved();assert.equal(await page.locator('#exportButton').isDisabled(),false);assert.equal((await project()).width,1000);checks.push('Import failure preserves preset and disables download; upload recovery');
 await open(`${base}/editor/?wallpaper=${portrait.id}&preset=unknown`);await page.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.equal(await page.locator('#exportButton').isDisabled(),true);checks.push('Invalid preset cannot export a blank canvas');
 await page.setViewportSize({width:390,height:844});await open(base+'/');await noOverflow();await shot('home-mobile');
 await open(base+'/browse/');await page.locator('.wa-card-actions').first().waitFor();await noOverflow();assert.ok((await page.locator('.wa-card').first().boundingBox()).y<844);await shot('browse-mobile');
 await page.locator('[data-wa-action="formats"]').first().click();await noOverflow();await shot('formats-mobile');await page.keyboard.press('Escape');
 failure=false;await open(`${base}/editor/?wallpaper=${portrait.id}&preset=instagram-story`);await saved();await noOverflow();await shot('editor-mobile');
 await page.evaluate(()=>window.PMWTheme.set('dark'));await shot('editor-mobile-dark');checks.push('390px mobile layouts and dark editor');
 assert.deepEqual(errors,[],'Browser runtime errors');
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
