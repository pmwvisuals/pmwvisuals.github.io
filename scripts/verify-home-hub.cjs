const {chromium}=require(process.env.PMW_PLAYWRIGHT_MODULE||'playwright');
const {launch,captureDownload}=require('./browser-preview.cjs'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
const base=process.env.PMW_PREVIEW_URL||'http://127.0.0.1:8767';
(async()=>{const output='work/hub-qa';await fs.mkdir(output,{recursive:true});const browser=await launch(chromium);try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}});await context.addInitScript(()=>{localStorage.setItem('pmw_theme_preference','light');document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='html{scroll-behavior:auto!important}';document.head.append(style);});});
 await context.route(/^https:\/\/(?:www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com|www\.google-analytics\.com|firestore\.googleapis\.com)\//,route=>route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const fixedPalette=()=>page.evaluate(()=>{
   // Compare authored styles; popover compositing can change Chromium's text antialiasing.
   const properties=['color','backgroundColor','backgroundImage','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','boxShadow','filter','colorScheme','fontFamily','fontSize','fontWeight','textShadow'];
   return [...document.querySelectorAll('#navbar, #navbar *, .studio-stage, .studio-stage *, .pmw-account-menu-root, .pmw-account-menu-root *, #pmwSiteMenu, #pmwSiteMenu *')]
     .filter(node=>node.getClientRects().length && getComputedStyle(node).visibility!=='hidden')
     .map(node=>({node:node.tagName+'.'+node.getAttribute('class'),palette:Object.fromEntries(properties.map(key=>[key,getComputedStyle(node)[key]]))}));
 });
 const open=async()=>{await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.locator('.wa-card-actions').first().waitFor();
 await page.locator('.hub-inline-nav').waitFor();
 await page.locator('.creative-interface-image').evaluate(image=>image.decode());
 await page.evaluate(async()=>{const image=new Image();image.src='/assets/home/wallpaper-mosaic.webp';await image.decode();});
 assert.equal(await page.locator('.pmw-site-menu-trigger').getAttribute('aria-expanded'),'false');
 assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
};
 await open();assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.hub-label').innerText(),'PMW VISUALS');assert.equal(await page.locator('[data-creative-hub]').count(),1);assert.equal(await page.locator('.hub-directory').count(),0);assert.equal(await page.locator('.hub-copy .hub-actions').count(),0);assert.equal(await page.locator('.creative-card-overlay .hub-actions a').count(),2);assert.equal(await page.locator('#home-workspace').count(),0);
 const hero=await page.locator('.hub-hero').boundingBox(),gallery=await page.locator('#latest-wallpapers').boundingBox();assert.ok(gallery.y-hero.y-hero.height<130,'Only the gallery heading may follow the hero');assert.ok(hero.height>=1100,'Hero must fill the first viewport');assert.ok(gallery.y>=1100,'Gallery must start below the first viewport');
 await page.setViewportSize({width:870,height:667});
 const copy=await page.locator('.hub-copy').boundingBox(), deck=await page.locator('.showcase-gallery').boundingBox();
 assert.ok(deck.y>=copy.y+copy.height,'Product showcase must sit below the centered headline');
 await page.screenshot({animations:'disabled',path:output+'/review-870.png'});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.hub-inline-nav').waitFor();
 await page.locator('.pmw-site-menu-trigger').click();
 await page.locator('#pmwSiteMenu[open]').waitFor();
 await page.screenshot({animations:'disabled',path:output+'/menu-default.png'});
 const menuLight=await fixedPalette();
 await page.evaluate(()=>window.PMWTheme.set('dark'));
 const menuDark=await fixedPalette();
 assert.deepEqual(menuDark,menuLight,'Hero, navigation and open drawer must keep the same palette in dark mode');
 await page.screenshot({animations:'disabled',path:output+'/menu-dark.png'});
 await page.evaluate(()=>window.PMWTheme.set('light'));
 await page.locator('.pmw-site-menu-close').click();
 await page.locator('#pmwSiteMenu:not([open])').waitFor({state:'attached'}); await page.locator('.pmw-site-menu-trigger[aria-expanded=false]').waitFor();
 await page.setViewportSize({width:1440,height:1100});
 await page.screenshot({animations:"disabled",path:output+'/home-desktop.png'});
 await page.locator('.hub-template-link').focus();await page.keyboard.press('Enter');await page.waitForURL('**/templates/');await open();await page.locator('.tools-preview-label').click();await page.waitForURL('**/tools/');await open();
 await page.locator('.wallpaper-showcase').click();await page.locator('#wallpaperSearch').fill('pmw-nothing-matches-this');await page.locator('#wallpapersGrid .empty-state').waitFor();await page.locator('#wallpaperSearch').fill('');await page.locator('.wa-card-actions').first().waitFor();
 await page.locator('.hub-gallery-heading a[href="/?device=desktop#latest-wallpapers"]').click();await page.locator('.device-toggle-btn[data-device-value=desktop][aria-pressed=true]').waitFor();
 for(const width of [320,390,620,621,768,870,1024,1366,1920]){await page.setViewportSize({width,height:844});await open();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Overflow at '+width);await page.locator('.pmw-account-trigger').waitFor();const brand=await page.locator('#navbar .nav-logo').boundingBox(),menu=await page.locator('.pmw-site-menu-trigger').boundingBox(),account=await page.locator('.pmw-account-trigger').boundingBox();assert.ok(menu.x+menu.width<=brand.x,'Sidebar trigger must sit before the logo at '+width);assert.ok(brand.x+brand.width<=account.x);
 const navigation = await page.locator('#navbar .nav-inner').boundingBox();
 assert.equal(navigation.x, 0, 'Header must touch the left viewport edge');
 assert.ok(Math.abs(navigation.width - width) <= 1, 'Header must reach the right viewport edge');
 assert.equal(navigation.y, 0, 'Header must touch the top viewport edge');
 assert.ok(Math.abs(account.y + account.height / 2 - (brand.y + brand.height / 2)) < 2, 'Profile must align vertically with the brand row at '+width);
 assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)', 'Light homepage must have a white background');
 assert.ok((await page.locator('.studio-stage').boundingBox()).height>=844,'Hero must fill the screen at width '+width);
 const leftCard=await page.locator('.wallpaper-showcase').boundingBox(),rightCard=await page.locator('.tools-showcase').boundingBox();
 assert.ok(Math.abs(leftCard.width-rightCard.width)<1,'Side cards must have equal widths at '+width);
 assert.ok(Math.abs(leftCard.height-rightCard.height)<1,'Side cards must have equal heights at '+width);
 const creativeCard=await page.locator('.creative-showcase').boundingBox();
 for(const action of await page.locator('.creative-card-overlay .hub-actions a').all()){
  const box=await action.boundingBox();assert.ok(box.height>=46,'Creative action must have a larger touch target at '+width);assert.ok(box.x>=creativeCard.x&&box.x+box.width<=creativeCard.x+creativeCard.width&&box.y>=creativeCard.y&&box.y+box.height<=creativeCard.y+creativeCard.height,'Creative actions must overlay its image at '+width);
 }
 assert.equal(await page.locator('.showcase-gallery a a').count(),0,'Card actions must not nest links');
const fit=await page.evaluate(()=>{
 const stage=document.querySelector('.studio-stage').getBoundingClientRect();
 const links=[...document.querySelectorAll('.showcase-art')];
 return links.every(link=>{
   const box=link.getBoundingClientRect();
   return box.left>=stage.left && box.right<=stage.right && box.top>=stage.top && box.bottom<=stage.bottom;
 });
});assert.ok(fit,'Hero destination panels clipped at '+width);for(const target of ['.hub-primary','.hub-template-link','.wallpaper-showcase','.tools-preview-label'])assert.ok(await page.locator(target).isVisible());}
 for(const [width,height] of [[1535,696],[1920,1080],[870,667],[844,390]]){
  await page.setViewportSize({width,height});await open();
  const stage=await page.locator('.studio-stage').boundingBox(),heading=await page.locator('.hub-gallery-heading').boundingBox();
  assert.ok(stage.height>=height,'Hero must cover '+width+'x'+height);
  assert.ok(heading.y>=height,'Gallery must remain below '+width+'x'+height);
  if(width===1535)await page.screenshot({animations:'disabled',path:output+'/full-screen-desktop.png'});
 }
 await page.setViewportSize({width:390,height:1050});await open();await page.screenshot({animations:"disabled",path:output+'/home-mobile.png'});
 await page.locator('.pmw-account-trigger').click();
 await page.locator('.pmw-account-trigger[aria-expanded=true]').waitFor();
 await page.locator('.pmw-account-panel').waitFor({state:'visible'});
 await page.locator('.pmw-account-menu-root').evaluate(node=>Promise.all(node.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{}))));
 const accountLight=await fixedPalette();
 await page.evaluate(()=>window.PMWTheme.set('dark'));
 await page.locator('.pmw-account-menu-root').evaluate(node=>Promise.all(node.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{}))));
 assert.deepEqual(await fixedPalette(),accountLight,'Hero, navigation and open account menu must keep the same palette in dark mode');
 await page.screenshot({animations:'disabled',path:output+'/account-dark.png'});
 await page.keyboard.press('Escape');
 await page.locator('.pmw-account-trigger[aria-expanded=false]').waitFor();
 await page.locator('.pmw-account-panel').waitFor({state:'hidden'});
 await page.evaluate(()=>window.PMWTheme.set('light'));
 await page.locator('.pmw-site-menu-trigger').click();
 await page.locator('#pmwSiteMenu[open]').waitFor();
 await page.keyboard.press('Escape');
 await page.evaluate(()=>window.PMWTheme.set('dark'));await page.screenshot({animations:"disabled",path:output+'/home-dark.png'});
 assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(255, 255, 255)','Gallery still follows the selected theme');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.showcase-art').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');assert.deepEqual(errors,[]);
 await page.setViewportSize({width:1440,height:900});await open();
 assert.deepEqual(await page.locator('.showcase-gallery>figure').evaluateAll(nodes=>nodes.map(node=>node.className)),['showcase-piece showcase-portrait','showcase-piece showcase-youtube','showcase-piece showcase-tools']);
 assert.equal(await page.locator('.wallpaper-showcase').getAttribute('href'),'#latest-wallpapers');
 assert.ok((await page.locator('.wallpaper-card-copy').innerText()).includes('Choose your'));
 assert.ok(await page.locator('.wallpaper-showcase').evaluate(node=>getComputedStyle(node).backgroundImage.includes('wallpaper-mosaic.webp')));
 assert.equal(await page.locator('.showcase-tool').count(),3);
 await page.locator('.creative-interface-link').focus();await page.keyboard.press('Enter');
 const saved=()=>page.waitForFunction(()=>document.getElementById('saveState')?.textContent==='Saved on this device');
 await saved();assert.equal(await page.locator('#canvasSize').innerText(),'1280 × 720');
 const project=()=>page.evaluate(async()=>{const {getProject}=await import('/js/creative/storage.js');const project=await getProject(new URLSearchParams(location.search).get('project'));(await import('/js/creative/model.js')).validateProject(project);return project;});
 const design=await project();assert.equal(Object.keys(design.assets).length,1);assert.ok(design.scene.objects.some(object=>object.text==='NEW'));
 await page.screenshot({path:output+'/showcase-editor.png'});
 const download=await captureDownload(page,()=>page.locator('#exportButton').click());await download.saveAs(output+'/showcase-export.png');
 const png=await fs.readFile(output+'/showcase-export.png');assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),720);assert.ok(png.length>60000,'Showcase PNG must contain the artwork');
 await page.reload({waitUntil:'domcontentloaded'});await saved();assert.ok((await project()).scene.objects.some(object=>object.text==='NEW'));
 await context.route(base+'/assets/home/somewhere-new.webp',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto(base+'/editor/?showcase=youtube',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.ok(await page.locator('#exportButton').isDisabled());
 await context.unroute(base+'/assets/home/somewhere-new.webp');await page.getByRole('button',{name:'Retry',exact:true}).click();await saved();assert.ok((await project()).scene.objects.some(object=>object.text==='NEW'),'Retry must recover the editable design');
 await page.goto(base+'/editor/?showcase=invalid',{waitUntil:'domcontentloaded'});await page.locator('#sourceBanner').filter({hasText:'unavailable'}).waitFor();assert.ok(await page.locator('#exportButton').isDisabled());
 assert.deepEqual(errors,[]);
 const html=await fs.readFile('index.html','utf8');for(const [,href]of html.matchAll(/href="([^"]+)"/g)){if(!href.startsWith('/')||href.startsWith('//'))continue;const url=new URL(href,base),file='.'+url.pathname+(url.pathname.endsWith('/')?'index.html':'');assert.ok(require('node:fs').existsSync(file),'Missing destination '+href);}
 await fs.writeFile(output+'/results.json',JSON.stringify({checks:['Three named destinations, Creative dominant','Gallery directly after hero','Centered headline above Wallpapers, Creative and Tools','Keyboard templates navigation and Tools link','Gallery search and desktop filter','320–1920px full-width header, aligned controls, white page background', 'Product navigation always visible; full menu closes with Escape or close button', 'Menu and profile open and close','Dark theme and reduced motion','Internal destinations'],errors},null,2));console.log('Homepage checks passed: three destinations, Creative priority, immediate gallery, navigation, filters, responsive layout and reduced motion.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
