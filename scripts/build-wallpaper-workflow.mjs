import fs from 'node:fs';
import path from 'node:path';
import {loadCatalog,siteRoot,json} from './editorial/catalog.mjs';
import {hubHome} from './hub-home.mjs';
import {appearanceMarkup} from './theme/markup.mjs';

let changed=0;
function write(file,content){const target=path.join(siteRoot,file);fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target)&&fs.readFileSync(target,'utf8')===content)return;fs.writeFileSync(target,content);changed++;}
const {records,pages,pageMap}=loadCatalog();
const pageById=new Map(pages.map(p=>[p.id,p]));
const publicRecords=records.filter(p=>p.visible!==false&&p.access!=='premium'&&!p.premium&&!p.isPremium);
const catalog=publicRecords.map(p=>{
  const previewURL=new URL(pageById.get(p.id)?.preview||p.thumbnail||p.preview,'https://pmwvisuals.com/'+(pageMap[p.id]||''));
  return {id:p.id,title:p.title,width:p.width,height:p.height,preview:previewURL.origin==='https://pmwvisuals.com'?previewURL.pathname:previewURL.href,download:p.download,path:pageMap[p.id]||null,...(p.driveFileId?{driveFileId:p.driveFileId}:{}),publicCatalog:true};
});
write('assets/wallpaper-catalog.json',json(catalog)+'\n');
const manifest=Object.fromEntries(catalog.map(p=>[p.id,p.driveFileId?`https://drive.usercontent.google.com/download?id=${encodeURIComponent(p.driveFileId)}&export=download`:p.download]));
write('backend/wallpaper-image-worker/src/catalog.json',JSON.stringify(manifest,null,2)+'\n');

const root=fs.readFileSync(path.join(siteRoot,'index.html'),'utf8');
const browsePath=path.join(siteRoot,'browse/index.html');
let browse=fs.existsSync(browsePath)?fs.readFileSync(browsePath,'utf8'):root;
if(!browse.includes('data-pmw-browse')){
  if(browse.includes('data-pmw-hub'))throw new Error('The recovered gallery source is missing. Restore browse/index.html from Git.');
  const fit=browse.match(/<section class="ed-section ed-split" id="screen-fit"[\s\S]*?<\/section>/)?.[0]||'';
  browse=browse.replace('<html lang="en"','<html data-pmw-browse lang="en"')
    .replace(/<!-- pmw-creative:home:start -->[\s\S]*?<!-- pmw-creative:home:end -->/,'')
    .replace(/<!-- pmw-editorial:home:start -->[\s\S]*?<!-- pmw-editorial:home:end -->/,'')
    .replace(/<header class="wallpaper-hero"[\s\S]*?<\/header>/,'<header class="wallpaper-hero" id="wallpaperHero"><div class="wallpaper-hero-content"><span class="wallpaper-kicker">FIND YOUR NEXT STARTING POINT</span><h1 class="section-title">A wallpaper. A world of possibilities.</h1><p class="section-subtitle">Find your mood. Preview it on a screen, or choose a format to make your next post.</p></div></header>')
    .replace('</main>',`<details class="browse-help" id="screen-fit"><summary>Choosing a resolution &amp; keeping the right crop</summary><div>${fit.replace(' id="screen-fit"','')}</div></details></main>`)
    .replace('</head>','<link rel="stylesheet" href="/css/browse.css">\n</head>');
  browse=browse.replace(/(src|href)="(?:\.\/)?((?:js|css)\/[^\"]+|(?:wallpapers-data|desktop-wallpapers-data|wallpaper-pages|download-tracking|consent)\.js[^\"]*|favicon\.png|index\.html)"/g,'$1="/$2"')
    .replaceAll("import('./js/","import('/js/").replaceAll("import(\"./js/","import(\"/js/")
    .replaceAll("script.src = 'desktop-wallpapers-data.js'","script.src = '/desktop-wallpapers-data.js'");
  for(const file of ['login.html','premium.html','account.html'])browse=browse.replaceAll(`'${file}'`,`'/${file}'`);
  browse=browse.replace('function renderWallpapers() {','function renderWallpapers() {\n            window.PMW_GALLERY_ITEMS = wallpapers;\n            window.PMW_CAN_EDIT_WALLPAPER = canDownloadWallpaper;');
}
browse=browse.replace(/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="https://pmwvisuals.com/browse/">').replace(/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="https://pmwvisuals.com/browse/">');
browse=browse.replace(/<title>[\s\S]*?<\/title>/,'<title>Browse Wallpapers &amp; Create Social Designs | PMW Visuals</title>');
browse=browse.replace(/<script type="application\/ld\+json" data-seo-schema>([\s\S]*?)<\/script>/,(_,data)=>{const schema=JSON.parse(data);schema.url='https://pmwvisuals.com/browse/';schema.name='Browse PMW wallpapers';return `<script type="application/ld+json" data-seo-schema>${json(schema)}</script>`;});
const include=html=>html.includes('src="/js/wallpaper-actions.js"')?html:html.replace('</body>','<script type="module" src="/js/wallpaper-actions.js"></script>\n</body>');
write('browse/index.html',include(appearanceMarkup(browse,'browse/index.html')));
write('index.html',hubHome());
for(const file of ['pmw-desktop-wallpapers.html','account.html',...fs.readdirSync(path.join(siteRoot,'wallpapers'),{withFileTypes:true}).filter(d=>d.isDirectory()&&fs.existsSync(path.join(siteRoot,'wallpapers',d.name,'index.html'))).map(d=>`wallpapers/${d.name}/index.html`)]){
  write(file,include(fs.readFileSync(path.join(siteRoot,file),'utf8')));
}
let legacy=fs.readFileSync(path.join(siteRoot,'pmw-wallpapers.html'),'utf8');legacy=legacy.replace('href="https://pmwvisuals.com/"','href="https://pmwvisuals.com/browse/"').replace('url=/"','url=/browse/"').replace('replace("/" +','replace("/browse/" +').replace('href="/"','href="/browse/"');write('pmw-wallpapers.html',legacy);
let desktop=fs.readFileSync(path.join(siteRoot,'pmw-desktop-wallpapers.html'),'utf8');desktop=desktop.replaceAll('url=/?device=desktop','url=/browse/?device=desktop').replace("replace('/?device=desktop","replace('/browse/?device=desktop").replace('href="https://pmwvisuals.com/?device=desktop"','href="https://pmwvisuals.com/browse/?device=desktop"');write('pmw-desktop-wallpapers.html',desktop);
let sitemap=fs.readFileSync(path.join(siteRoot,'sitemap.xml'),'utf8');
if(!sitemap.includes('https://pmwvisuals.com/browse/'))sitemap=sitemap.replace('</urlset>','  <url><loc>https://pmwvisuals.com/browse/</loc></url>\n</urlset>');write('sitemap.xml',sitemap);
console.log(`Wallpaper workflow: ${changed} files changed; ${catalog.length} public originals. Main gallery: /browse/.`);
