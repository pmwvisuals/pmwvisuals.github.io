import fs from 'node:fs';
import path from 'node:path';
import { siteRoot, escapeHtml as e, json } from './editorial/catalog.mjs';
import { toolPages, renderGuide, renderHub } from './tool-guides/content.mjs';
import { appearanceMarkup } from './theme/markup.mjs';

let changed=0;
const write=(file,source)=>{
  source=appearanceMarkup(source,file);
  const target=path.join(siteRoot,file);
  source=source.replace(/\r\n/g,'\n').replace(/[ \t]+\n/g,'\n');
  if(fs.existsSync(target)&&fs.readFileSync(target,'utf8')===source)return;
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);changed++;
};
const photo='data:image/webp;base64,'+fs.readFileSync(path.join(siteRoot,'thumbnails/google-drive/14iXY0uyDwJ68hXvBYB0KePk80Qno3m1r.webp')).toString('base64');
const defs=`<defs><radialGradient id="glow"><stop stop-color="#d1ae6335"/><stop offset="1" stop-color="#141a2300"/></radialGradient><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#24323b"/><stop offset="1" stop-color="#11181e"/></linearGradient><linearGradient id="gold" x2="1" y2="1"><stop stop-color="#f1d9a0"/><stop offset="1" stop-color="#b58d42"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-opacity=".3"/></filter><clipPath id="photo"><rect width="168" height="260" rx="12"/></clipPath><clipPath id="small-photo"><rect width="110" height="170" rx="10"/></clipPath><clipPath id="resize-photo"><rect width="168" height="299" rx="12"/></clipPath><clipPath id="resize-target"><rect width="86" height="153" rx="10"/></clipPath></defs>`;
const svg=(body,title)=>`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="440" viewBox="0 0 800 440" role="img" aria-labelledby="title"><title id="title">${e(title)}</title>${defs}<rect width="800" height="440" fill="#0b1116"/><ellipse cx="425" cy="220" rx="360" ry="220" fill="url(#glow)"/><g fill="none" stroke="#b8c9d414">${[90,180,270,360].map(y=>`<path d="M0 ${y}H800"/>`).join('')}${[100,200,300,400,500,600,700].map(x=>`<path d="M${x} 0V440"/>`).join('')}</g><g font-family="Inter,Arial,sans-serif">${body}</g></svg>`;
const arrow=`<path d="M341 220H447m-14-13 14 13-14 13" stroke="url(#gold)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
write('assets/tools/compression-workflow.svg',svg(`
<g filter="url(#shadow)"><rect x="77" y="52" width="233" height="342" rx="20" fill="url(#paper)" stroke="#62768455"/><text x="104" y="88" fill="#b8c6cd" font-size="19" letter-spacing="2">SOURCE IMAGE</text><g transform="translate(108 109)" clip-path="url(#photo)"><image href="${photo}" width="168" height="260" preserveAspectRatio="xMidYMid slice"/></g></g>${arrow}
<g filter="url(#shadow)"><rect x="481" y="82" width="237" height="294" rx="20" fill="url(#paper)" stroke="#ddc68c66"/><text x="507" y="121" fill="#ddc68c" font-size="20">A lighter export</text><g transform="translate(507 148)" clip-path="url(#small-photo)"><image href="${photo}" width="110" height="170" preserveAspectRatio="xMidYMid slice"/></g><g fill="url(#gold)"><rect x="637" y="157" width="47" height="8" rx="4"/><rect x="637" y="181" width="39" height="8" rx="4"/><rect x="637" y="205" width="29" height="8" rx="4"/></g><text x="507" y="350" fill="#b8c6cd" font-size="17">Inspect detail &amp; dimensions</text></g><text x="365" y="176" fill="#ddc68c" font-size="18">Encode</text>`, 'Compression workflow illustration; exported size and dimensions depend on settings'));
write('assets/tools/resize-workflow.svg',svg(`
<g filter="url(#shadow)"><rect x="93" y="28" width="222" height="383" rx="19" fill="url(#paper)" stroke="#62768466"/><g transform="translate(120 61)" clip-path="url(#resize-photo)"><image href="${photo}" width="168" height="299" preserveAspectRatio="xMidYMid meet"/></g><text x="204" y="392" fill="#eae6db" font-size="24" text-anchor="middle">941 × 1672</text></g>${arrow}
<g filter="url(#shadow)"><rect x="496" y="146" width="164" height="225" rx="17" fill="url(#paper)" stroke="#ddc68c88"/><g transform="translate(535 166)" clip-path="url(#resize-target)"><image href="${photo}" width="86" height="153" preserveAspectRatio="xMidYMid meet"/></g><text x="578" y="349" fill="#ddc68c" font-size="20" text-anchor="middle">480 × 853</text></g><text x="350" y="176" fill="#ddc68c" font-size="18">Same shape</text><path d="M69 61V360m-6-293 6-6 6 6m-12 287 6 6 6-6" stroke="#718c9b" fill="none" stroke-width="2"/><text x="445" y="422" text-anchor="middle" fill="#96abb7" font-size="17">Example dimensions · rounding to whole pixels</text>`, 'Example proportional resize from a 941 by 1672 portrait to 480 by 853'));
write('assets/tools/conversion-workflow.svg',svg(`
<circle cx="400" cy="220" r="85" fill="#ddc68c0a" stroke="#ddc68c55"/><circle cx="400" cy="220" r="66" fill="url(#paper)" stroke="#ddc68c88"/><text x="400" y="215" text-anchor="middle" fill="#ece7d7" font-size="25">Convert</text><text x="400" y="244" text-anchor="middle" fill="#ddc68c" font-size="16" letter-spacing="2">ON DEVICE</text>
${[['JPG','WEBP',91,'#83bcbb'],['MOV','MP4',215,'#d4b978'],['WAV','MP3',339,'#a99ccb']].map(([from,to,y,color])=>`<g filter="url(#shadow)"><rect x="70" y="${y-34}" width="165" height="73" rx="15" fill="url(#paper)" stroke="${color}66"/><text x="152" y="${y+11}" text-anchor="middle" fill="${color}" font-size="29">${from}</text><rect x="564" y="${y-34}" width="165" height="73" rx="15" fill="url(#paper)" stroke="${color}88"/><text x="647" y="${y+11}" text-anchor="middle" fill="${color}" font-size="29">${to}</text></g><path d="M235 ${y+3}C290 ${y+3},290 220,314 220M486 220C521 220,512 ${y+3},552 ${y+3}m-9-9 9 9-9 9" fill="none" stroke="${color}77" stroke-width="2"/>`).join('')}<text x="400" y="412" text-anchor="middle" fill="#96abb7" font-size="17">Illustrated examples · choose the receiving app’s format</text>`, 'Illustrated JPG to WebP, MOV to MP4 and WAV to MP3 conversion examples'));

// Theme-aware native SVG variants retain the artwork, but use a light canvas.
const lightColors={'#0b1116':'#f3f6ef','#24323b':'#ffffff','#11181e':'#e5eee3','#b8c9d4':'#315440','#627684':'#809981','#b8c6cd':'#526758','#ddc68c':'#7d6024','#eae6db':'#283d2e','#96abb7':'#526758','#ece7d7':'#283d2e','#83bcbb':'#286d65','#d4b978':'#896421','#a99ccb':'#705594','#718c9b':'#657e67'};
for(const stem of ['compression','resize','conversion']) {
  let light=fs.readFileSync(path.join(siteRoot,`assets/tools/${stem}-workflow.svg`),'utf8');
  light=light.replace(/#[\da-f]{6}/gi,color=>lightColors[color.toLowerCase()]||color).replace('flood-opacity=".3"','flood-opacity=".12"');
  write(`assets/tools/${stem}-workflow-light.svg`,light);
}
for(const [type,c] of Object.entries(toolPages)) {
  const file=`tools/${c.slug}/index.html`;
  let html=fs.readFileSync(path.join(siteRoot,file),'utf8');
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const originalIds=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  const hero=`<header class="tool-header"><div><span class="tools-kicker">${e(c.eyebrow)}</span><h1${type==='converter'?' id="converterTitle"':''}>${e(c.name)}</h1><p>${e(c.intro)}</p><span class="tg-hero-line">${e(c.promise)}</span><div class="tg-badges">${c.badges.map(x=>`<span>${e(x)}</span>`).join('')}</div><div class="tg-hero-links"><a href="#tool-workspace">Open the tool</a><a href="#tool-guide">Explore the guide</a></div></div><figure class="tg-hero-art"><img src="/assets/tools/${type==='compressor'?'compression':type==='resizer'?'resize':'conversion'}-workflow.svg" width="800" height="440" alt="${e(c.graphicAlt)}" fetchpriority="high"></figure></header>`;
  const themedHero=hero.replace(/<img src="([^"]+)-workflow\.svg"([^>]+)>/,(_,src,attrs)=>`<img class="tg-art-dark" src="${src}-workflow.svg"${attrs}><img class="tg-art-light" src="${src}-workflow-light.svg"${attrs}>`);
  html=html.replace(/<header class="tool-header">[\s\S]*?<\/header>/,themedHero);
  let start=html.indexOf('<!-- pmw-tools-guide:start -->');
  if(start<0)start=html.search(type==='converter'?/<section class="converter-categories /:/<section class="tool-info-section/);
  const end=html.indexOf('</main>',start);
  if(start<0||end<0)throw new Error(`Unsupported guide insertion: ${file}`);
  const old=html.slice(start,end);
  const legacyIds=new Set([...old.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  const guide=renderGuide(type);
  const newIds=new Set([...guide.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  const aliases=[...legacyIds].filter(x=>!newIds.has(x)).map(id=>`<span class="tg-legacy-anchor" id="${e(id)}" aria-hidden="true"></span>`).join('');
  const wrap=type==='converter'?' class="tools-shell"':'';
  html=html.slice(0,start)+`<!-- pmw-tools-guide:start --><div${wrap}>${aliases}${guide}</div><!-- pmw-tools-guide:end -->\n    `+html.slice(end);
  html=html.replace(/<body([^>]*)>/,(_,attrs)=>`<body${attrs.replace(/ class="[^"]*"/,'')} class="tg-tool-page">`);
  if(!html.includes('class="tg-skip"'))html=html.replace(/(<body[^>]*>)/,'$1\n<a class="tg-skip" href="#tool-workspace">Skip to the tool</a>');
  html=html.replace(/ id="tool-workspace"/g,'');
  const workspaceClass=type==='converter'?'converter-workbench':type==='compressor'?'compressor-layout':'resizer-layout';
  html=html.replace(new RegExp(`(<section class="${workspaceClass}"[^>]*)(>)`),'$1 id="tool-workspace"$2');
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${e(c.name)}${type==='resizer'?' &amp; Aspect Ratio Guide':type==='compressor'?' &amp; Quality Guide':' — Image, Video &amp; Audio'} | PMW Tools</title>`);
  for(const attr of ['name="description"','property="og:description"'])html=html.replace(new RegExp(`<meta ${attr}[^>]*>`),`<meta ${attr} content="${e(c.description)}">`);
  html=html.replace(/<meta property="og:title"[^>]*>/,`<meta property="og:title" content="${e(c.name+' | PMW Tools')}">`);
  for(const [name,value] of [['twitter:title',c.name+' | PMW Tools'],['twitter:description',c.description]]) {
    const tag=`<meta name="${name}" content="${e(value)}">`;
    const pattern=new RegExp(`<meta name="${name}"[^>]*>`);
    html=pattern.test(html)?html.replace(pattern,tag):html.replace('</head>',tag+'\n</head>');
  }
  html=html.replace(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/g,'');
  const schema={'@context':'https://schema.org','@graph':[{'@type':'WebApplication',name:'PMW '+c.name,url:canonical,applicationCategory:type==='converter'?'MultimediaApplication':'UtilitiesApplication',operatingSystem:'Modern web browser',description:c.description,browserRequirements:'JavaScript; browser image support'+(type==='converter'?'; WebAssembly for advanced media conversions':''),featureList:c.badges},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'PMW Visuals',item:'https://pmwvisuals.com/'},{'@type':'ListItem',position:2,name:'PMW Tools',item:'https://pmwvisuals.com/tools/'},{'@type':'ListItem',position:3,name:c.name,item:canonical}]}]};
  html=html.replace('</head>',`<script type="application/ld+json" data-tool-schema>${json(schema)}</script>\n</head>`);
  if(!html.includes('css/tool-guides.css'))html=html.replace('</head>','<link rel="stylesheet" href="/css/tool-guides.css?v=20261006-tools">\n</head>');
  if(!html.includes('js/tool-guides.js'))html=html.replace('</body>','<script src="/js/tool-guides.js?v=20261006-tools" defer></script>\n</body>');
  if(!html.includes('pmw-theme.js'))html=html.replace('<head>','<head>\n<script src="/js/pmw-theme.js?v=20261006-tools"></script>');
  html=html.replace(/(src="[^"]*pmw-theme\.js)(?:\?[^"]*)?"/g,'$1?v=20261006-tools"');
  html=html.replace(/(src="[^"]*platform-footer\.js)(?:\?[^"]*)?"/g,'$1?v=20261006-tools"');
  if(type==='compressor') {
    html=html.replace('Optional. Enter a preferred size in KB. The result will stay below the uploaded file size.','Preferred target in KB. PMW may reduce pixel dimensions; check the exported width and height as well as its size.');
    if(!html.includes('class="tg-result-empty"')) html=html.replace(/(<section class="compressor-result-panel"[^>]*>)/,'$1<div class="tg-result-empty"><i data-lucide="scan-eye" aria-hidden="true"></i><h2>Inspect your export</h2><p>The size, savings and returned dimensions appear here after compression. Keep the original until you have checked the result.</p></div>');
  }
  if(type!=='converter') {
    html=html.replace(/pmw-tools\.js(?:\?[^"]*)?"/,'pmw-tools.js?v=20261006-tools"');
    html=html.replace(/<aside class="premium-feature-card"[\s\S]*?<\/aside>/,`<aside class="premium-feature-card" aria-label="Plan limits"><i data-lucide="layers" aria-hidden="true"></i><div><h2>One image or a batch?</h2><p>Free access: ${type==='compressor'?'9 compressions':'13 resizes'} per day, one image at a time, up to 10MB. Premium enables batches and larger-image workflows. <a href="../../premium.html">Compare the current plans</a>.</p></div></aside>`);
    html=html.replace('Free users can compress one image up to 10MB. Premium users can batch compress larger images.','JPG, PNG or WebP · up to 10MB on the free plan.');
    html=html.replace('Free users can resize one image up to 10MB. Premium users can batch resize larger images.','JPG, PNG or WebP · up to 10MB on the free plan.');
    if(type==='resizer'&&!html.includes('data-preset-note'))html=html.replace(/(<div class="preset-grid" id="presetGrid">[\s\S]*?<\/div>)/,'$1<p class="tool-note" data-preset-note>Presets set both dimensions. A different ratio can stretch the image; keep aspect ratio during manual entry.</p>');
  } else {
    html=html.replace('checked aria-label="Preserve metadata"','aria-label="Strip metadata"');
    html=html.replace(/pmw-converter\.js(?:\?[^"]*)?"/,'pmw-converter.js?v=20261006-tools"');
  }
  if(!html.includes('data-tool-noscript'))html=html.replace(/(<nav class="tool-tabs"[\s\S]*?<\/nav>)/,'$1<noscript data-tool-noscript><p class="tg-callout">The tool and interactive examples need JavaScript. The guides and diagrams below remain readable.</p></noscript>');
  const nextIds=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
  for(const id of originalIds) if(!nextIds.has(id))throw new Error(`Removed existing ID ${id}: ${file}`);
  if(!html.includes(canonical)||!html.includes('G-KWF3JNMHNW')||!html.includes('data-pmw-consent-default'))throw new Error(`Preservation failed: ${file}`);
  write(file,html);
}
let hub=fs.readFileSync(path.join(siteRoot,'tools/index.html'),'utf8');
const hubSection=`<!-- pmw-tools-hub:start -->${renderHub()}<!-- pmw-tools-hub:end -->`;
hub=hub.includes('<!-- pmw-tools-hub:start -->')?hub.replace(/<!-- pmw-tools-hub:start -->[\s\S]*?<!-- pmw-tools-hub:end -->/,hubSection):hub.replace('</main>',hubSection+'\n</main>');
if(!hub.includes('css/tool-guides.css'))hub=hub.replace('</head>','<link rel="stylesheet" href="/css/tool-guides.css?v=20261006-tools">\n</head>');
hub=hub.replace(/<body[^>]*>/,'<body class="tg-hub-page">');
hub=hub.replace('Export clean files instantly.','Save your export when processing finishes.');
hub=hub.replace('Reduce image file size by adjusting output quality and compare before and after sizes before downloading the compressed result.','Reduce image file size with quality and dimension changes. Compare the returned size and pixel frame before saving the compressed copy.');
if(!hub.includes('https://pmwvisuals.com/tools/')||!hub.includes('data-pmw-consent-default')||!hub.includes('G-KWF3JNMHNW'))throw new Error('Hub preservation failed');
write('tools/index.html',hub);
const sitemapPath=path.join(siteRoot,'sitemap.xml');
let sitemap=fs.readFileSync(sitemapPath,'utf8');
for(const loc of ['https://pmwvisuals.com/tools/',...Object.values(toolPages).map(c=>`https://pmwvisuals.com/tools/${c.slug}/`)]) {
  const entry=new RegExp(`(<url>\\s*<loc>${loc.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}<\\/loc>)([\\s\\S]*?)(<\\/url>)`);
  sitemap=sitemap.replace(entry,(_,start,rest,end)=>start+rest.replace(/<lastmod>.*?<\/lastmod>/,'<lastmod>2026-10-06</lastmod>')+end);
}
write('sitemap.xml',sitemap);
console.log(`Tool-guide build: ${changed} files changed; existing tool URLs and control IDs preserved.`);
