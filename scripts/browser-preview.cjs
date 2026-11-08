// Browser-test helper. Inline mode serves the checkout through Playwright routing
// when the execution environment cannot connect to a loopback preview server.
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon','.xml':'application/xml'};
async function routeFiles(context){
 if(!process.env.PMW_INLINE_PREVIEW)return;
 const origin=new URL(process.env.PMW_PREVIEW_URL||'https://pmw.test').origin;
 await context.route(origin+'/**',async route=>{
  try{
   let file=path.resolve(root,'.'+decodeURIComponent(new URL(route.request().url()).pathname));
   if(!file.startsWith(root+path.sep)&&file!==root)return route.fulfill({status:403,body:'Forbidden'});
   if((await fs.stat(file)).isDirectory())file=path.join(file,'index.html');
   await route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:await fs.readFile(file)});
  }catch{await route.fulfill({status:404,contentType:'text/plain',body:'Not found'});}
 });
}
async function launch(chromium){
 const downloadsPath=path.resolve(process.env.PMW_QA_DIR||'work/browser-downloads');await fs.mkdir(downloadsPath,{recursive:true});
 const options={headless:true,downloadsPath,...(process.env.PMW_BROWSER_EXECUTABLE?{executablePath:process.env.PMW_BROWSER_EXECUTABLE}:{})};
 const browser=process.env.PMW_BROWSER_PROFILE
  ? (await chromium.launchPersistentContext(path.resolve(process.env.PMW_BROWSER_PROFILE)+'-'+Date.now(),options)).browser()
  : await chromium.launch(options);
 const newContext=browser.newContext.bind(browser);
 browser.newContext=async options=>{
  const context=await newContext(options);await routeFiles(context);
  if(process.env.PMW_CAPTURE_DOWNLOADS)await context.addInitScript(()=>{
    const blobs=new Map(),original=URL.createObjectURL.bind(URL);window.__pmwDownloads=[];
    URL.createObjectURL=blob=>{const url=original(blob);blobs.set(url,blob);return url;};
    document.addEventListener('click',event=>{
      const anchor=event.target.closest?.('a[download]');if(!anchor||!blobs.has(anchor.href))return;
      event.preventDefault();window.__pmwDownloads.push({name:anchor.download,blob:blobs.get(anchor.href)});
    },true);
  });
  return context;
 };
 return browser;
}
async function captureDownload(page,action){
 if(!process.env.PMW_CAPTURE_DOWNLOADS){const event=page.waitForEvent('download');await action();return event;}
 const count=await page.evaluate(()=>window.__pmwDownloads.length);await action();
 await page.waitForFunction(count=>window.__pmwDownloads.length>count,count);
 const result=await page.evaluate(async index=>{
  const {name,blob}=window.__pmwDownloads[index];
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
  return {name,data};
 },count);
 return {suggestedFilename:()=>result.name,saveAs:file=>fs.writeFile(file,Buffer.from(result.data,'base64'))};
}
module.exports={launch,routeFiles,captureDownload};
