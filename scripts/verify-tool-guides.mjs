import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { siteRoot, decode } from './editorial/catalog.mjs';
import { toolPages } from './tool-guides/content.mjs';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const required={
  compressor:['toolFileInput','toolDropzone','toolAction','toolFilePreview','toolResult','toolResultImage','toolResultMeta','toolDownload','toolMessage','compressQuality','compressTargetSize','compressPresetGrid','compressEstimate','compressUsageNotice'],
  resizer:['toolFileInput','toolDropzone','toolAction','toolFilePreview','toolResult','toolResultImage','toolResultMeta','toolDownload','toolMessage','resizeWidth','resizeHeight','keepAspect','resizeFormat','resizeQuality','presetGrid','resultEmpty','batchResultList'],
  converter:['converterTitle','converterFileInput','converterDropzone','converterFormat','converterQuality','converterOption','converterFileList','converterStart','converterProgress','converterProgressBar','converterMessage','converterUsage','converterUsageText','converterUsageCount','converterUpgradeOverlay','converterUpgradeClose','converterUpgradeLater']
};
const sizes=[];
for(const [type,c] of Object.entries(toolPages)) {
  const file=`tools/${c.slug}/index.html`;
  const html=fs.readFileSync(path.join(siteRoot,file),'utf8');
  const origin='https://pmwvisuals.com';
  const canonical=`${origin}/tools/${c.slug}/`;
  check(html.includes(`<link rel="canonical" href="${canonical}">`),`${file}: canonical changed`);
  check((html.match(/<h1\b/g)||[]).length===1,`${file}: heading count`);
  check(html.includes('G-KWF3JNMHNW')&&html.includes('data-pmw-consent-default'),`${file}: tracking/consent missing`);
  check(!/noindex|vignette\.min|n6wxm\.com|al5sm\.com|nap5k\.com/.test(html),`${file}: unexpected crawl/ad change`);
  const idList=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  const ids=new Set(idList);
  check(ids.size===idList.length,`${file}: duplicate IDs`);
  for(const id of required[type])check(ids.has(id),`${file}: missing control ${id}`);
  for(const match of html.matchAll(/<(?:a|img|script|link)\b[^>]*\b(?:href|src)="([^"]+)"/g)) {
    const parsed=new URL(decode(match[1]),canonical);
    if(parsed.origin!==origin)continue;
    let relative=decodeURIComponent(parsed.pathname).replace(/^\//,'');
    if(relative.endsWith('/'))relative+='index.html';
    check(fs.existsSync(path.join(siteRoot,relative)),`${file}: broken file ${relative}`);
    if(parsed.hash&&relative===file)check(ids.has(parsed.hash.slice(1)),`${file}: missing fragment ${parsed.hash}`);
  }
  for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(!match[2].trim())continue;
    if(match[1].includes('application/ld+json')) {
      const schema=JSON.parse(match[2]);
      check(schema['@context']==='https://schema.org',`${file}: schema context`);
      check(schema['@graph'].some(x=>x['@type']==='WebApplication'&&x.url===canonical),`${file}: application schema`);
      check(!JSON.stringify(schema).includes('AggregateRating'),`${file}: invented review schema`);
    } else new vm.Script(match[2],{filename:file});
  }
  const guide=html.match(/<div class="tg-guide"[\s\S]*?<!-- pmw-tools-guide:end -->/)?.[0];
  check(guide&&guide.includes('questions answered'),`${file}: guide not in source HTML`);
  const words=guide.replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length;
  sizes.push({page:c.slug,staticGuideWords:words});
}
for(const file of ['compression','resize','conversion']) {
  const svg=fs.readFileSync(path.join(siteRoot,`assets/tools/${file}-workflow.svg`),'utf8');
  check(svg.startsWith('<svg')&&svg.endsWith('</svg>'),`${file}: SVG structure`);
  check(!/<script|https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg','')),`${file}: unexpected remote/executable graphic`);
}
for(const file of ['vendor/ffmpeg/ffmpeg/index.js','vendor/ffmpeg/util/index.js','vendor/ffmpeg/core/ffmpeg-core.js','vendor/ffmpeg/core/ffmpeg-core.wasm'])check(fs.existsSync(path.join(siteRoot,file)),`Missing converter engine: ${file}`);
const hub=fs.readFileSync(path.join(siteRoot,'tools/index.html'),'utf8');
check(hub.includes('<link rel="canonical" href="https://pmwvisuals.com/tools/">'),'Hub canonical changed');
check(hub.includes('G-KWF3JNMHNW')&&hub.includes('data-pmw-consent-default'),'Hub tracking/consent missing');
check(hub.includes('pmw-tools-hub:start')&&hub.includes('choose-a-tool'),'Hub guidance missing');
for(const match of hub.matchAll(/<a\b[^>]*href="(image-[^"]+)"/g)) {
  const url=new URL(match[1],'https://pmwvisuals.com/tools/');
  const target=path.join(siteRoot,url.pathname.slice(1),'index.html');
  check(fs.existsSync(target),`Hub destination missing: ${url.pathname}`);
  if(url.hash)check(fs.readFileSync(target,'utf8').includes(`id="${url.hash.slice(1)}"`),`Hub guide anchor missing: ${url.hash}`);
}
console.log(JSON.stringify({checksPassed:checks,pages:sizes},null,2));
