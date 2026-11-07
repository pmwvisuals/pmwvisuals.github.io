const {chromium}=require(process.env.PMW_PLAYWRIGHT_MODULE||'playwright');
const {launch,captureDownload}=require('./browser-preview.cjs');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.PMW_PREVIEW_URL||'http://127.0.0.1:8767';
(async()=>{
 const browser=await launch(chromium);
 try{
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
  page.on('requestfailed',request=>console.log('Request failed:',new URL(request.url()).hostname,request.failure()?.errorText));
  await context.addInitScript(()=>localStorage.setItem('pmw_theme_preference','light'));
  const catalog=JSON.parse(await fs.readFile(path.join(__dirname,'../assets/wallpaper-catalog.json'),'utf8'));
  for(const item of [catalog.find(p=>p.driveFileId),catalog.find(p=>p.width>p.height)]){
   await page.goto(`${base}/editor/?wallpaper=${item.id}&preset=instagram-square`,{waitUntil:'domcontentloaded'});
   try{await page.waitForFunction(()=>document.getElementById('saveState')?.textContent==='Saved on this device',{},{timeout:60000});}
   catch(error){console.log('Editor source status:',await page.locator('#sourceBanner').innerText());throw error;}
   assert.equal(await page.locator('#exportButton').isDisabled(),false);
   const download=await captureDownload(page,()=>page.locator('#exportButton').click());const file=path.resolve('work/wallpaper-qa','live-'+item.id+'.png');await download.saveAs(file);
   const png=await fs.readFile(file);assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1080);
   console.log(`Live editor original import and 1080 × 1080 PNG export: ${item.id}`);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
