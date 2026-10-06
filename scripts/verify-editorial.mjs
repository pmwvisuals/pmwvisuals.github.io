import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { siteRoot, origin, loadCatalog, decode } from './editorial/catalog.mjs';
import { collections, PILOT_PATHS } from './editorial/content.mjs';

const pilot = process.argv.includes('--pilot');
const { pages } = loadCatalog();
const files = ['index.html', ...collections.filter(c=>!pilot||c.slug==='amoled').map(c=>`wallpapers/${c.slug}/index.html`), ...pages.filter(p=>!pilot||PILOT_PATHS.includes(p.file)).map(p=>p.file)];
if (!pilot) files.push('wallpapers/index.html');
const baselinePath = process.argv[process.argv.indexOf('--baseline')+1];
let checks = 0;
function check(value, message) { assert.ok(value,message); checks++; }
if (process.argv.includes('--baseline')) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath,'utf8'));
  check(baseline.length===pages.length,'Mapped URL count changed');
  const byFile=new Map(pages.map(p=>[p.file,p]));
  for(const old of baseline) {
    const current=byFile.get(old.file);
    check(current,`Removed path: ${old.file}`);
    check(current.canonical===old.canonical,`Changed canonical: ${old.file}`);
    check(current.download===old.download,`Changed original download: ${old.file}`);
    check(current.id===old.id,`Changed wallpaper ID: ${old.file}`);
  }
}
function checkLocal(url, file, ids, kind) {
  if (!url || /\$\{|\{|javascript:|mailto:|data:|blob:/.test(url)) return;
  const parsed=new URL(decode(url),`${origin}/${file}`);
  if(parsed.origin!==origin)return;
  let name=decodeURIComponent(parsed.pathname).replace(/^\//,'');
  if(!name||name.endsWith('/'))name+='index.html';
  check(fs.existsSync(path.join(siteRoot,name)),`${file}: missing ${kind} ${parsed.pathname}`);
  if(parsed.hash&&name===file&&kind==='link') check(ids.has(decodeURIComponent(parsed.hash.slice(1))),`${file}: missing anchor ${parsed.hash}`);
}
for(const file of files) {
  const html=fs.readFileSync(path.join(siteRoot,file),'utf8');
  const ids=new Set([...html.matchAll(/\s+id="([^"]+)"/g)].map(m=>m[1]));
  check(!/(?:href|onclick)="[^"]*pmw-studio\.html/.test(html),`${file}: Studio navigation returned`);
  if(file==='index.html') {
    const hero=html.match(/<header class="wallpaper-hero"[\s\S]*?<\/header>/)?.[0];
    check(hero.includes('ed-gallery-cta')&&!hero.includes('wallpaperSearch'),'Hero/gallery separation changed');
    check(html.indexOf('id="latest-wallpapers"')<html.indexOf('id="wallpaperSearch"')&&html.indexOf('id="wallpaperSearch"')<html.indexOf('id="wallpapersGrid"'),'Filters are not above gallery cards');
    const idList=[...html.matchAll(/\s+id="([^"]+)"/g)].map(m=>m[1]);
    check(idList.length===ids.size,'Duplicate homepage control IDs');
    check(!html.includes('const dynamicTags'),'Style filter became uncurated');
  }
  check((html.match(/<h1\b/g)||[]).length===1,`${file}: expected one H1`);
  check(!/<meta[^>]*content="[^"]*noindex/i.test(html),`${file}: accidental noindex`);
  check(html.includes('G-KWF3JNMHNW'),`${file}: GA4 missing`);
  check(html.includes('data-pmw-consent-default'),`${file}: consent default missing`);
  check(!/vignette\.min|n6wxm\.com|al5sm\.com|nap5k\.com/.test(html),`${file}: interstitial include remains`);
  check(html.includes('/css/pmw-editorial.css'),`${file}: shared CSS missing`);
  for(const match of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g))checkLocal(match[1],file,ids,'link');
  for(const match of html.matchAll(/<(?:img|script|link)\b[^>]*\b(?:src|href)="([^"]*)"/g))checkLocal(match[1],file,ids,'asset');
  for(const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const schema=JSON.parse(match[1]);
    check(schema['@context']==='https://schema.org',`${file}: invalid schema context`);
    check(!JSON.stringify(schema).includes('&amp;'),`${file}: HTML entity inside JSON-LD URL`);
  }
  for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(!match[2].trim()||/application\/ld\+json|type="module"/.test(match[1]))continue;
    new vm.Script(match[2],{filename:file}); checks++;
  }
  if(file.includes('/01/')||file.includes('/02/')||file.includes('/desktop/')) {
    check(!/<style>/.test(html),`${file}: repeated detail CSS remains`);
    check(html.includes('data-editorial-related'),`${file}: related rationale missing`);
    check(html.includes('class="ed-reading"'),`${file}: artwork notes missing`);
    check(html.includes('id="downloadButton"')&&html.includes('download-tracking.js'),`${file}: download/tracking hook missing`);
  }
}
check(fs.readFileSync(path.join(siteRoot,'robots.txt'),'utf8').includes('Allow: /'),'robots.txt no longer allows crawling');
check(!fs.readFileSync(path.join(siteRoot,'sw.js'),'utf8').includes('importScripts'),'Advertising worker still imports remote code');
if(!pilot) {
  const sitemap=fs.readFileSync(path.join(siteRoot,'sitemap.xml'),'utf8');
  const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>decode(m[1]));
  check(urls.length===new Set(urls).size,'Duplicate sitemap URLs');
  check(!urls.includes(origin+'/pmw-studio.html'),'Studio sitemap entry returned');
  for(const url of urls) {
    check(!new URL(url).pathname.includes('//'),`Malformed sitemap path: ${url}`);
    checkLocal(url,'index.html',new Set(),'sitemap URL');
  }
  check(PILOT_PATHS.every(file=>urls.includes(origin+'/'+file)),'Reviewed sitemap pages missing');
}
console.log(`${pilot?'Pilot':'Full'} editorial verification: ${files.length} pages, ${checks} checks passed. Existing mapped URLs, canonicals and downloads preserved.`);
