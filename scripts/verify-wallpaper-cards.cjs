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
 // Exercise the public static fallback without waiting on account/analytics CDNs.
 await context.route(/^https:\/\/(?:www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com|www\.google-analytics\.com|firestore\.googleapis\.com)\//,route=>route.abort());
 await context.addInitScript(()=>{localStorage.setItem('pmw_theme_preference','light');document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='html { scroll-behavior:auto!important; }';document.head.append(style);});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const open=url=>page.goto(url,{waitUntil:'domcontentloaded'});
 const originalPush=checks.push.bind(checks);checks.push=(value)=>{console.log('PASS',value);return originalPush(value);};
 const catalog=JSON.parse(await fs.readFile(path.join(__dirname,'../assets/wallpaper-catalog.json'),'utf8'));
 const portrait=catalog.find(p=>p.driveFileId),landscape=catalog.find(p=>p.width>p.height);
 const saved=()=>page.waitForFunction(()=>document.getElementById('saveState')?.textContent==='Saved on this device');
 const project=()=>page.evaluate(async()=>{const {getProject}=await import('/js/creative/storage.js');return getProject(new URLSearchParams(location.search).get('project'));});
 const shot=name=>page.screenshot({path:path.join(output,name+'.png'),fullPage:false});
 const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Horizontal overflow');
 const cardOverlays=async()=>{
  const style=await page.locator('#wallpapersGrid .wa-card').first().evaluate(card=>{
   const image=card.querySelector('img').getBoundingClientRect(),buttons=[...card.querySelectorAll('[data-wa-action]')];
   return {nameHidden:getComputedStyle(card.querySelector('.wallpaper-card-info')).display==='none',iconsOnly:buttons.every(button=>!button.textContent.trim()),onArtwork:buttons.every(button=>{const r=button.getBoundingClientRect();return r.x>=image.x&&r.right<=image.right&&r.y>=image.y&&r.bottom<=image.bottom;}),touchTargets:buttons.every(button=>button.offsetWidth>=44&&button.offsetHeight>=44)};
  });
  assert.deepEqual(style,{nameHidden:true,iconsOnly:true,onArtwork:true,touchTargets:true});
 };
 const currentHome=(await fs.readFile(path.join(__dirname,'../index.html'),'utf8')).replace(/\r\n/g,'\n').replaceAll('site-navigation.js?v=20261110-page-options','site-navigation.js?v=20261006-menu').replace('            window.PMW_GALLERY_ITEMS = wallpapers;\n            window.PMW_CAN_EDIT_WALLPAPER = canDownloadWallpaper;\n','');
 const homeBlob=require('node:crypto').createHash('sha1').update('blob '+Buffer.byteLength(currentHome)+'\0').update(currentHome).digest('hex');
 assert.equal(homeBlob,'6d4c421833620dfa0b2b8d115575d271d622ded8','Homepage markup, styles, content, and routes must remain unchanged');
 await open(base+'/');assert.equal(await page.locator('#wallpapersGrid').count(),1);await noOverflow();await shot('home-desktop');checks.push('Original homepage preserved');
 await open(base+'/?device=desktop#latest-wallpapers');await page.locator('.wa-card-actions').first().waitFor();
 await page.locator('[data-wa-action="preview"]').first().hover();await page.locator('.wa-mini-desktop').waitFor();await page.locator('[data-screen="clean"]').click();assert.equal(await page.locator('.wa-mini-device').getAttribute('data-screen'),'clean');await shot('desktop-preview');await page.keyboard.press('Escape');checks.push('Desktop hover dropdown with clean/desktop screen types');
 await open(base+'/#latest-wallpapers');await page.locator('.wa-card-actions').first().waitFor();await noOverflow();assert.equal(await page.locator('.wa-card-link button,.wa-card-link [role="button"],a a').count(),0);
 assert.equal(await page.locator('.wa-card-media > button[data-save-wallpaper]').count()>0,true,'Save controls stay independent');
 await page.locator('#wallpaperSearch').fill('pmw-test-no-artwork-has-this-name');await page.locator('#wallpapersGrid .empty-state').waitFor();await page.locator('#wallpaperSearch').fill('');await page.locator('.wa-card-actions').first().waitFor();checks.push('Existing gallery search and reset');
 await cardOverlays();await page.locator('#wallpapersGrid').scrollIntoViewIfNeeded();await shot('gallery-desktop');checks.push('Card names hidden; icon-only actions overlay artwork with 44px targets');
 const previewButton=page.locator('[data-wa-action="preview"]').first();await previewButton.hover();await page.locator('.wa-mini-phone').waitFor();
 assert.equal(await page.locator('dialog.wa-dialog').count(),0);assert.ok((await page.locator('.wa-popover').evaluate(node=>getComputedStyle(node).fontFamily)).includes('Inter'));
 const variation=await page.locator('.wa-mini-device').getAttribute('data-variation');await page.locator('button[data-screen="home"]').click();assert.equal(await page.locator('.wa-mini-device').getAttribute('data-screen'),'home');assert.equal(await page.locator('.wa-mini-device').getAttribute('data-variation'),variation);await shot('phone-preview');await page.keyboard.press('Escape');assert.equal(await previewButton.evaluate(button=>button===document.activeElement),true);assert.equal(await page.locator('.wa-popover:popover-open').count(),0);checks.push('Phone hover dropdown, stable screen layout, Escape and focus restoration');
 const formatsButton=page.locator('[data-wa-action="formats"]').first();await formatsButton.hover();await page.locator('.wa-platforms').waitFor();
 let total=0;for(const platform of ['Instagram','Facebook','TikTok','YouTube','Pinterest','Wallpaper']){await page.locator('[data-platform="'+platform+'"]').hover();await page.waitForFunction(platform=>document.querySelector('[data-platform="'+platform+'"]').getAttribute('aria-pressed')==='true',platform);total+=await page.locator('.wa-format-list a').count();}
 assert.equal(total,14);await page.locator('[data-platform="Instagram"]').hover();assert.ok((await page.locator('.wa-format-list a').filter({hasText:'Portrait post'}).getAttribute('href')).includes('preset=instagram-portrait'));await shot('formats');
 await page.keyboard.press('Escape');await formatsButton.focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('[data-platform="Instagram"]').evaluate(node=>node===document.activeElement),true);await page.keyboard.press('Escape');
 await page.mouse.move(1,1);await formatsButton.hover();await page.locator('.wa-popover:popover-open').waitFor();await page.mouse.move(1,1);await page.locator('.wa-popover:popover-open').waitFor({state:'hidden'});checks.push('All 14 sizes through platform icons, keyboard access, and hover dismissal');
 await page.evaluate(item=>{const strip=document.createElement('div');strip.id='savedWallpaperPreviewStrip';const link=document.createElement('a');link.href='/'+item.path;link.dataset.wallpaperId=item.id;link.textContent=item.title;strip.append(link);document.body.append(strip);},portrait);await page.locator('#savedWallpaperPreviewStrip .wa-card-actions').waitFor();checks.push('Saved wallpaper cards');
 await page.evaluate(()=>window.PMWTheme.set('dark'));await shot('gallery-desktop-dark');await page.evaluate(()=>window.PMWTheme.set('light'));
 await open(base+'/wallpapers/amoled/');await page.locator('.wa-card-actions').first().waitFor();checks.push('Collection cards');
 await open(base+'/'+portrait.path);await page.locator('.related-grid .wa-card-actions').first().waitFor();checks.push('Related artwork cards');
 await page.locator('.wa-detail-tools').waitFor();assert.equal(await page.locator('.wa-detail-tools button').count(),2);
 await page.locator('.wa-detail-tools [data-wa-action="formats"]').click();assert.ok((await page.locator('.wa-format-list a').first().getAttribute('href')).includes('wallpaper='+portrait.id));await page.keyboard.press('Escape');
 await page.locator('.wa-detail-tools [data-wa-action="preview"]').click();await page.locator('.wa-mini-phone').waitFor();await shot('detail-options');await page.keyboard.press('Escape');checks.push('Main artwork page controls resolve the correct image and size');
 await open(base+'/pmw-desktop-wallpapers.html');await page.waitForURL('**/?device=desktop#latest-wallpapers',{waitUntil:'domcontentloaded'});await page.locator('.wa-card-actions').first().waitFor();checks.push('Desktop entry keeps its existing destination');
 // A deterministic original with visible coordinates lets us verify the exported crop.
 let fixture=gradientPNG(300,600),failure=false;
 const originalFixture=route=>route.fulfill({status:200,contentType:failure?'text/html':'image/png',body:failure?'<html>Unavailable</html>':fixture,headers:{'Access-Control-Allow-Origin':'*'}});
 await context.route('https://drive.usercontent.google.com/download**',originalFixture);
 const {IMAGE_BRIDGE_ORIGIN}=await import('../js/creative/image-config.js');
 if(IMAGE_BRIDGE_ORIGIN)await context.route(IMAGE_BRIDGE_ORIGIN+'/images/**',originalFixture);
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
 await open(base+'/#latest-wallpapers');await page.locator('.wa-card-actions').first().waitFor();await noOverflow();await cardOverlays();await page.locator('#wallpapersGrid .wa-card').first().scrollIntoViewIfNeeded();await shot('browse-mobile');
 await page.locator('[data-wa-action="formats"]').first().click();await noOverflow();await shot('formats-mobile');await page.keyboard.press('Escape');
 failure=false;await open(`${base}/editor/?wallpaper=${portrait.id}&preset=instagram-story`);await saved();await noOverflow();await shot('editor-mobile');
 await page.evaluate(()=>window.PMWTheme.set('dark'));await shot('editor-mobile-dark');checks.push('390px mobile layouts and dark editor');
 const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await touchContext.addInitScript(()=>localStorage.setItem('pmw_theme_preference','light'));
 await touchContext.route(/^https:\/\/(?:www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com|www\.google-analytics\.com|firestore\.googleapis\.com)\//,route=>route.abort());
 const touch=await touchContext.newPage();touch.on('pageerror',error=>errors.push(error.message));
 await touch.goto(base+'/wallpapers/amoled/',{waitUntil:'domcontentloaded'});await touch.locator('[data-wa-action="formats"]').first().tap();await touch.locator('[data-platform="Pinterest"]').tap();assert.ok((await touch.locator('.wa-format-list a').getAttribute('href')).includes('pinterest-pin'));
 const bounds=await touch.locator('.wa-popover').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=0&&bounds.y+bounds.height<=844);
 await touch.screenshot({path:path.join(output,'dropdown-touch.png')});await touch.locator('.wa-dismiss').tap();assert.equal(await touch.locator('.wa-popover:popover-open').count(),0);await touchContext.close();checks.push('Touch opening, platform switching, viewport bounds, and dismissal');
 assert.deepEqual(errors,[],'Browser runtime errors');
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
