import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { siteRoot, origin, loadCatalog, categoryKey, decode, escapeHtml as e, json } from './editorial/catalog.mjs';
import { collections, collectionFor, reviewed, PILOT_PATHS } from './editorial/content.mjs';
import { galleryLayout } from './editorial/gallery-layout.mjs';
import { appearanceMarkup } from './theme/markup.mjs';

const all = process.argv.includes('--all');
if (!all && !process.argv.includes('--pilot')) throw new Error('Choose --pilot or --all. Pilot verification must precede scaling.');
if (all && !fs.existsSync(path.join(siteRoot, 'docs/editorial-pilot-verified.md'))) throw new Error('Verify the pilot and record docs/editorial-pilot-verified.md before --all.');
const analysis = JSON.parse(fs.readFileSync(path.join(siteRoot, 'scripts/editorial/preview-analysis.json'), 'utf8'));
const { pages } = loadCatalog();
let changed = 0;
const write = (file, html) => {
  if(file.endsWith('.html')) html=html.replace(/(src="[^"]*js\/pmw-theme\.js)(?:\?[^"]*)?"/g,'$1?v=20261006"');
  html=appearanceMarkup(html,file);
  html=html.replace(/\r\n/g,'\n').replace(/[ \t]+\n/g,'\n');
  const target = path.join(siteRoot, file);
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === html) return;
  fs.writeFileSync(target, html); changed++;
};
const itemFor = (file) => {
  const item = pages.find(p => p.file === file);
  if (!item) throw new Error(`Unknown selected URL: ${file}`);
  return item;
};
const titleFor = (p) => reviewed[p.file]?.title || p.title;
const imageTag = (p, lazy = true) => {
  const dimensions = analysis[p.preview];
  return `<span class="ed-image"><img src="${e(p.preview)}"${p.driveFileId ? ` data-pmw-drive-id="${e(p.driveFileId)}"` : ''} alt="${e(titleFor(p))}"${dimensions ? ` width="${dimensions.width}" height="${dimensions.height}"` : ''} loading="${lazy ? 'lazy' : 'eager'}" decoding="async"></span>`;
};
const familyFor = (p) => collectionFor(categoryKey(p))?.family || ({ abstract:'contrast', fantasy:'cinematic', aesthetic:'scenic', cityscape:'atmosphere' }[categoryKey(p)] || 'illustration');
const collectionUrl = (p) => p.file.includes('/desktop/')
  ? `/?category=${encodeURIComponent(p.category)}&device=desktop#latest-wallpapers`
  : `/wallpapers/${categoryKey(p)}/`;
const paletteFor = (p) => reviewed[p.file]?.colors?.map(([name,hex]) => ({ name,hex })) || analysis[p.preview]?.palette || [];
const paletteMarkup = (p) => {
  const palette = paletteFor(p);
  if (!palette.length) return `<p class="ed-prose">Compare the colors in the preview with your current icon theme.</p>`;
  return `<ul class="ed-palette">${palette.map(c => `<li><span class="ed-swatch" style="--swatch:${c.hex}" aria-hidden="true"></span>${e(c.name)}</li>`).join('')}</ul><p class="ed-small">${analysis[p.preview] ? 'Palette sampled from the local preview; the original may differ slightly.' : 'Colors noted from the visible artwork preview.'}</p>`;
};
const originalFit = (p) => {
  const tall = p.height > p.width;
  return `The catalog lists an original ${p.width} × ${p.height} ${p.format} file, ${tall ? 'taller than it is wide' : 'wider than it is tall'}. ${tall ? 'Start with a portrait phone layout. A taller screen may trim the sides when set to fill.' : 'Start with a landscape monitor layout. An ultrawide display may crop the top and bottom when set to fill.'} Resizing upward does not add image detail.`;
};
const fallbackIntro = (p) => {
  const palette = paletteFor(p).map(c => c.name.toLowerCase()).slice(0,2);
  return `${titleFor(p)} is a ${p.height > p.width ? 'portrait' : 'landscape'} digital composition.${palette.length ? ` The preview combines ${palette.join(' and ')} tones.` : ''} The catalog lists a ${p.width} × ${p.height} original; compare its framing with your screen before choosing a crop.`;
};
const fitNote = (p) => reviewed[p.file]?.note || (
  analysis[p.preview]?.darkFraction > .65
    ? `The sampled preview is predominantly dark. Try light labels, but check them against any bright details in ${titleFor(p)}. A sparse layout gives those details more room.`
    : `Preview ${titleFor(p)} with your own ${p.height > p.width ? 'clock and notifications' : 'icon columns and taskbar'} visible. Place labels over calmer areas and retain the subject named in the title when cropping.`
);
function readingMarkup(p) {
  const family = familyFor(p);
  const label = { contrast:'Contrast & color', cinematic:'Read the scene', landscape:'Framing the view', scenic:'Light & atmosphere', cosmic:'An imagined sky', illustration:'Figure & setting', atmosphere:'Texture & light' }[family];
  const info = { cinematic:'Scene notes', landscape:'Crop notes', scenic:'On your lock screen', cosmic:'Display contrast', illustration:'Keep the focal point', atmosphere:'Behind your icons', contrast:'On your display' }[family];
  const scene = reviewed[p.file]?.mood || (p.tags || []).filter(t => !/wallpaper|phone|mobile|desktop|hd|4k|16:9/.test(t)).slice(-4).join(' · ');
  const imageNotes = `<div><span class="ed-eyebrow">${e(label)}</span><h2>${e(info)}</h2><p class="ed-prose">${e(fitNote(p))}</p>${paletteMarkup(p)}</div>`;
  const frame = `<div class="ed-guide"><h3>${family === 'cosmic' ? 'Artwork, not an observation' : 'Choose the screen fit'}</h3><p class="ed-prose">${family === 'cosmic' ? 'This is space-inspired digital art. The colors, scale and arrangement are not evidence of a real astronomical observation.' : e(originalFit(p))}</p>${family === 'cosmic' ? `<p class="ed-prose">${e(originalFit(p))}</p>` : ''}<dl><dt>${reviewed[p.file]?.mood ? 'Atmosphere' : 'Catalog themes'}</dt><dd>${e(scene)}</dd><dt>Orientation</dt><dd>${p.height > p.width ? 'Portrait / phone starting point' : 'Landscape / desktop starting point'}</dd><dt>More like this</dt><dd><a class="ed-link" href="${e(collectionUrl(p))}">${e(p.category)} collection</a></dd></dl><div class="ed-links"><a href="/#screen-fit">Resolution and crop guide</a><a href="/license.html">Personal-use license</a></div></div>`;
  // Variants change the reading order as well as the focus of the notes.
  return `<!-- pmw-editorial:detail:start -->
  <section class="ed-reading" id="artwork-notes" data-family="${family}" aria-label="Artwork and screen-fit notes"><div class="ed-reading-grid">${['landscape','scenic','illustration'].includes(family) ? frame + imageNotes : imageNotes + frame}</div></section>
  <!-- pmw-editorial:detail:end -->`;
}

const ignoredTokens = new Set('wallpaper wallpapers mobile desktop phone hd free high quality background portrait landscape art illustration digital image with the and under over above below on in at a an of to for'.split(' '));
const tokenCache = new Map();
function tokens(p) {
  if(!tokenCache.has(p.id)) tokenCache.set(p.id,new Set(`${titleFor(p)} ${(p.tags || []).join(' ')}`.toLowerCase().match(/[a-z]{3,}/g)?.filter(t => !ignoredTokens.has(t)) || []));
  return tokenCache.get(p.id);
}
function relatedFor(p) {
  const own = tokens(p);
  return pages.filter(q => q.id !== p.id && (q.height > q.width) === (p.height > p.width)).map(q => {
    const common = [...tokens(q)].filter(t => own.has(t));
    const shared = common.filter(t => !/dark|fantasy|nature|anime|romantic|space|cosmic|amoled|scenic/.test(t));
    return { item:q, shared, score:shared.length * 5 + common.length + (categoryKey(p) === categoryKey(q) ? 3 : 0) };
  }).sort((a,b) => b.score - a.score || a.item.file.localeCompare(b.item.file)).slice(0,6);
}
function detail(p) {
  let html = p.html;
  const title = titleFor(p);
  const intro = reviewed[p.file]?.intro || fallbackIntro(p);
  if (title !== p.title) html = html.replaceAll(p.title, title);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${e(title)}${p.file.includes('/desktop/') ? ' — Desktop wallpaper' : ' — Wallpaper'} | PMW Visuals</title>`);
  const description = reviewed[p.file]?.intro.split(/(?<=\.)\s+/)[0] || `${title}. ${p.width}×${p.height} ${p.category.toLowerCase()} digital artwork with preview, color notes, screen-fit guidance and related scenes.`;
  for (const attr of ['name="description"','property="og:description"','name="twitter:description"']) {
    html = html.replace(new RegExp(`<meta ${attr}[^>]*>`), `<meta ${attr} content="${e(description)}">`);
  }
  for (const attr of ['property="og:title"','name="twitter:title"']) html = html.replace(new RegExp(`<meta ${attr}[^>]*>`), `<meta ${attr} content="${e(title + ' | PMW Visuals')}">`);
  const stableImage = p.local ? origin + p.preview : p.preview;
  const socialImage = p.local ? p.image : p.preview;
  for (const attr of ['property="og:image"','name="twitter:image"']) html = html.replace(new RegExp(`<meta ${attr}[^>]*>`), `<meta ${attr} content="${e(socialImage)}">`);
  html = html.replace(/<script type="application\/ld\+json"([^>]*)>([\s\S]*?)<\/script>/g, (whole, attrs, raw) => {
    const schema = JSON.parse(raw);
    if (schema['@type'] === 'ImageObject') {
      schema.name = title; schema.description = description;
      // Keep the higher-resolution source for the primary image; local previews
      // are intentionally small browsing assets, not replacement originals.
      schema.contentUrl = p.image || p.preview;
      schema.thumbnailUrl = stableImage;
      const measured = analysis[p.preview];
      if (measured) {
        schema.thumbnail = {'@type':'ImageObject',contentUrl:stableImage,width:measured.width,height:measured.height,encodingFormat:measured.format};
        delete schema.width; delete schema.height; delete schema.encodingFormat;
      }
      // Do not describe preview pixels using the original download's dimensions/format.
    }
    if (schema['@type'] === 'BreadcrumbList') {
      schema.itemListElement[1].item = origin + collectionUrl(p);
      schema.itemListElement.at(-1).name = title;
    }
    return `<script type="application/ld+json"${attrs}>${json(schema)}</script>`;
  });
  if (!html.includes('BreadcrumbList')) html=html.replace('</head>', `<script type="application/ld+json" data-breadcrumb-schema>${json({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Wallpapers',item:origin+'/'},{'@type':'ListItem',position:2,name:p.category,item:origin+collectionUrl(p)},{'@type':'ListItem',position:3,name:title,item:p.canonical}]})}</script>\n</head>`);
  if (!html.includes('G-KWF3JNMHNW')) html=html.replace('</head>', `<script data-pmw-consent-default>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});</script><script async src="https://www.googletagmanager.com/gtag/js?id=G-KWF3JNMHNW"></script><script>gtag('js',new Date());gtag('config','G-KWF3JNMHNW');</script>\n</head>`);
  html = html.replace(/<style>[\s\S]*?<\/style>\s*/g, '');
  if (!html.includes('/css/pmw-editorial.css')) html = html.replace('</head>', '  <link rel="stylesheet" href="/css/pmw-editorial.css?v=20261006">\n</head>');
  html = html.replace(/<body(?: class="[^"]*")?>/, `<body class="editorial-detail${p.width > p.height ? ' ed-landscape' : ''}">`);
  html = html.replace(/<main(?: id="mainContent")?>/, '<main id="mainContent">');
  html = html.replace(/<p class="ed-note-link">[\s\S]*?<\/p>\s*/,'');
  html = html.replace(/<p class="description">[\s\S]*?<\/p>/, `<p class="description">${e(intro)}</p><p class="ed-note-link"><a class="ed-link" href="#artwork-notes">Color and framing notes</a></p>`);
  html = html.replace(/<div class="nav-links">[\s\S]*?<\/div>/,'<div class="nav-links"><a href="/">Wallpapers</a><a href="/wallpapers/">Collections</a><a href="/tools/">PMW Tools</a></div>');
  html = html.replace(/const shareText = "(?:\\.|[^"\\])*";/, `const shareText = ${JSON.stringify(intro)};`);
  html = html.replace(/(navigator\.share\(\{[^}]*?\btext:\s*)"(?:\\.|[^"\\])*"/, (_,prefix)=>prefix+JSON.stringify(intro));
  html = html.replace(/<div class="breadcrumb">[\s\S]*?<\/div>/, `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Wallpapers</a><span>/</span><a href="${e(collectionUrl(p))}">${e(p.category)}</a><span>/</span><span aria-current="page">${e(title)}</span></nav>`);
  // Existing pages already refactored have a nav breadcrumb rather than a div.
  html = html.replace(/<nav class="breadcrumb"[^>]*>[\s\S]*?<\/nav>/, `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Wallpapers</a><span>/</span><a href="${e(collectionUrl(p))}">${e(p.category)}</a><span>/</span><span aria-current="page">${e(title)}</span></nav>`);
  html = html.replace(/<div class="tags">[\s\S]*?<\/div>/, `<div class="tags" aria-label="Visual themes">${[...tokens(p)].slice(-5).map(t => `<span class="tag">${e(t)}</span>`).join(' · ')}</div>`);
  html = html.replace(/<img([^>]*src="[^"]+"[^>]*)>/g, (whole, attrs) => {
    const src = decode(attrs.match(/src="([^"]+)"/)?.[1]);
    const dim = analysis[src];
    if (!dim || attrs.includes('width=')) return whole;
    return `<img${attrs} width="${dim.width}" height="${dim.height}" decoding="async">`;
  });
  html = html.replace(/<!-- pmw-editorial:detail:start -->[\s\S]*?<!-- pmw-editorial:detail:end -->\s*/, '');
  const relatedMarker = /<section class="related"/;
  if (!relatedMarker.test(html)) throw new Error(`No related insertion point: ${p.file}`);
  html = html.replace(relatedMarker, `${readingMarkup(p)}\n    <section class="related"`);
  const related = relatedFor(p);
  html = html.replace(/<div class="related-grid"[^>]*>[\s\S]*?<\/div>/, `<div class="related-grid" data-editorial-related>${related.map(({item:q,shared}) => `<a class="related-card" href="/${e(q.file)}">${imageTag(q)}<span>${e(titleFor(q))}<small>${e(shared.length ? `Compare ${shared.slice(0,2).join(' / ')} themes` : `${q.category} · ${q.width}×${q.height}`)}</small></span></a>`).join('')}</div>`);
  html = html.replace(/(<a class="secondary-link"[^>]*href=")[^"]*("[^>]*>)[^<]*(<\/a>)/, `$1${e(collectionUrl(p))}$2Browse ${e(p.category)}$3`);
  if (p.html.includes('data-protected-wallpaper') && !html.includes('data-editorial-noscript')) html = html.replace(/(<button class="download-btn"[^>]*>[\s\S]*?<\/button>)/, `$1<noscript data-editorial-noscript><a class="ed-link" href="${e(p.download)}">Download original image</a></noscript>`);
  html = html.replace(/js\/wallpaper-tools-panel\.js(?:\?[^"\s]*)?/, 'js/wallpaper-tools-panel.js?v=20261006');
  if (!html.includes('G-KWF3JNMHNW') || !html.includes(e(p.canonical)) || !html.includes(e(p.download))) throw new Error(`Preservation guard failed: ${p.file}`);
  write(p.file, html);
}

const brandNav = `<nav class="ed-nav" aria-label="Primary"><a class="ed-brand" href="/"><img src="/pmw-wordmark.png" alt="PMW"><span>Visuals</span></a><div class="ed-nav-links"><a href="/">Wallpapers</a><a href="/wallpapers/">Collections</a><a href="/tools/">PMW Tools</a></div></nav>`;
const card = (p, reason = '') => `<a class="ed-art-card" href="/${e(p.file)}">${imageTag(p)}<span><strong>${e(titleFor(p))}</strong><small>${e(reason || reviewed[p.file]?.reason || `${p.width} × ${p.height} · ${p.category}`)}</small></span></a>`;
function category(c) {
  const file = `wallpapers/${c.slug}/index.html`;
  let html = fs.readFileSync(path.join(siteRoot,file),'utf8');
  const categoryPages = pages.filter(p => !p.file.includes('/desktop/') && categoryKey(p) === c.slug);
  const hero = itemFor(c.hero);
  const featured = [hero, ...categoryPages.filter(p => p.file !== hero.file).map(p => ({ p, score:c.themes.reduce((s,theme) => s + Number(new RegExp(theme[2],'i').test(p.title)),0) })).sort((a,b) => b.score-a.score || a.p.file.localeCompare(b.p.file)).slice(0,3).map(x=>x.p)];
  const main = `<main class="ed-wrap" id="mainContent">${brandNav}
  <nav class="ed-crumbs" aria-label="Breadcrumb"><a href="/">Wallpapers</a><span>/</span><a href="/wallpapers/">Collections</a><span>/</span><span aria-current="page">${e(c.name)}</span></nav>
  <header class="ed-collection-hero"><div><span class="ed-eyebrow">${e(c.label)}</span><h1>${e(c.name)}</h1><p class="ed-prose">${e(c.intro)}</p><div class="ed-links"><a href="#gallery">Browse ${categoryPages.length} wallpapers</a><a href="#screen-notes">Screen notes</a></div></div><figure class="ed-hero-figure">${imageTag(hero,false)}<figcaption><strong>${e(titleFor(hero))}</strong>${e(reviewed[hero.file].reason)}<br><a class="ed-link" href="/${hero.file}">View artwork and fit notes</a></figcaption></figure></header>
  <section class="ed-section" aria-labelledby="themeTitle"><span class="ed-eyebrow">Find a direction</span><h2 id="themeTitle">Three ways into the collection</h2><div class="ed-theme-grid">${c.themes.map(([name,copy,pattern]) => { const example=categoryPages.find(p=>new RegExp(pattern,'i').test(p.title)); return `<article><h3>${e(name)}</h3><p>${e(copy)}</p>${example?`<a class="ed-link" href="/${example.file}">Compare ${e(titleFor(example))}</a>`:''}</article>`; }).join('')}</div></section>
  <section class="ed-section" aria-labelledby="compareTitle"><div class="ed-section-head"><div><span class="ed-eyebrow">A few places to start</span><h2 id="compareTitle">Scenes to compare</h2></div><p>Different focal points and textures, selected to help you compare the look of this collection.</p></div><div class="ed-featured-grid">${featured.map(p=>card(p)).join('')}</div></section>
  <section class="ed-section ed-split" id="screen-notes"><div><span class="ed-eyebrow">Screen and crop</span><h2>Make room for your layout</h2><p class="ed-prose">${e(c.fit)}</p><a class="ed-link" href="/?device=desktop#latest-wallpapers">Compare landscape desktop artwork</a></div><div class="ed-guide"><h3>Color and mood</h3><p class="ed-prose">${e(c.use)}</p><a class="ed-link" href="/#screen-fit">Choose a resolution and crop</a></div></section>
  <section class="ed-section ed-faq" aria-labelledby="faqTitle"><h2 id="faqTitle">Before you set your wallpaper</h2>${c.faq.map(([q,a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('')}<div class="ed-links">${c.related.map(slug => `<a href="/wallpapers/${slug}/">Explore ${e(collectionFor(slug).name)}</a>`).join('')}<a href="/license.html">Read the personal-use license</a></div></section>
  <section class="ed-section" id="gallery" aria-labelledby="galleryTitle"><div class="ed-section-head"><div><span class="ed-eyebrow">The complete collection</span><h2 id="galleryTitle">${e(c.name)}</h2></div><p>${categoryPages.length} portrait artworks. Open a page for original file dimensions, the preview and download.</p></div><div class="ed-grid">${categoryPages.sort((a,b)=>titleFor(a).localeCompare(titleFor(b))).map(p=>`<a class="wallpaper-card" href="/${p.file}">${imageTag(p)}<span>${e(titleFor(p))}</span></a>`).join('\n')}</div></section>
  </main>`;
  html = html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<main[\s\S]*?<\/main>/, main);
  html = html.replace('<body>', '<body class="editorial-collection">');
  if (!html.includes('/css/pmw-editorial.css')) html=html.replace('</head>','<link rel="stylesheet" href="/css/pmw-editorial.css?v=20261006">\n</head>');
  html = html.replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${e(c.description)}">`);
  for(const attr of ['property="og:description"','name="twitter:description"']) html=html.replace(new RegExp(`<meta ${attr}[^>]*>`),`<meta ${attr} content="${e(c.description)}">`);
  for(const attr of ['property="og:image"','name="twitter:image"']) html=html.replace(new RegExp(`<meta ${attr}[^>]*>`),`<meta ${attr} content="${e(hero.image)}">`);
  html=html.replace(/<script type="application\/ld\+json" data-seo-schema>[\s\S]*?<\/script>/, `<script type="application/ld+json" data-seo-schema>${json({'@context':'https://schema.org','@type':'CollectionPage',name:c.name,url:`${origin}/wallpapers/${c.slug}/`,description:c.description,isPartOf:{'@type':'WebSite',name:'PMW Visuals',url:origin+'/'},mainEntity:{'@type':'ItemList',itemListElement:featured.map((p,i)=>({'@type':'ListItem',position:i+1,url:p.canonical,name:titleFor(p)}))}})}</script>`);
  write(file,html);
}

function home() {
  const file='index.html'; let html=fs.readFileSync(path.join(siteRoot,file),'utf8');
  const featured=collections.filter(c=>['amoled','nature','dark-fantasy','romantic'].includes(c.slug));
  const selected=PILOT_PATHS.filter(p=>/blue-comet|sunlit-forest|gondola/.test(p)).map(itemFor);
  const section=`<!-- pmw-editorial:home:start -->
  <div class="editorial-home" id="editorialHome">
  <section class="ed-section" aria-labelledby="collectionsTitle"><div class="ed-section-head"><div><span class="ed-eyebrow">Collections with a point of view</span><h2 id="collectionsTitle">Find the mood. Then find the fit.</h2></div><p>Start with a visual world, compare a few scenes, and check the original dimensions before you download.</p></div><div class="ed-collection-grid">${featured.map(c=>`<a class="ed-collection-card" href="/wallpapers/${c.slug}/">${imageTag(itemFor(c.hero))}<span class="ed-card-copy"><strong>${e(c.name)}</strong><span>${e(c.label)}</span></span></a>`).join('')}</div><div class="ed-links">${collections.filter(c=>!featured.includes(c)).map(c=>`<a href="/wallpapers/${c.slug}/">${e(c.name)}</a>`).join('')}<a href="/wallpapers/">All collections and artwork pages</a></div></section>
  <section class="ed-section" aria-labelledby="startingTitle"><div class="ed-section-head"><div><span class="ed-eyebrow">Starting selections</span><h2 id="startingTitle">Three different screens</h2></div><p>A quiet black field, an open valley, and a lantern-lit canal. Compare their space, light and framing.</p></div><div class="ed-starting-grid">${selected.map(p=>card(p)).join('')}</div></section>
  <section class="ed-section" aria-labelledby="moodTitle"><h2 id="moodTitle">Browse by atmosphere</h2><div class="ed-mood-list"><a href="/wallpapers/dark-aesthetic/"><strong>Quiet & textured</strong><span>Shadowed interiors, books and small pools of warm light.</span></a><a href="/wallpapers/space-and-galaxy/"><strong>Cosmic & vivid</strong><span>Imagined stars, planets and clouds of nebula color.</span></a><a href="/wallpapers/anime/"><strong>Illustrated worlds</strong><span>Characters and environments with a sense of scale.</span></a><a href="/wallpapers/celestial-samurai/"><strong>Paths & journeys</strong><span>Lantern villages, silhouettes and distant skies.</span></a></div></section>
  <section class="ed-section ed-split" id="screen-fit" aria-labelledby="fitTitle"><div><span class="ed-eyebrow">A better fit, not just a bigger file</span><h2 id="fitTitle">Choose your wallpaper resolution</h2><p class="ed-prose">Match width, height and shape to your display. Many portrait artworks here are 941 × 1672; many landscape files are 1672 × 941. Those sizes are close to 9:16 and 16:9, respectively. Each artwork page lists its actual catalog dimensions.</p><p class="ed-prose">A phone that is taller than 9:16 may crop the sides. An ultrawide monitor may crop a 16:9 scene. Resizing to 4K makes more pixels, but it cannot recover detail missing from the original.</p><div class="ed-links"><a href="/?device=mobile#latest-wallpapers">Browse portrait artwork</a><a href="/?device=desktop#latest-wallpapers">Browse landscape artwork</a><a href="/tools/image-resizer/">Preview a crop in PMW Resizer</a></div></div><div class="ed-guide"><h3>Before you set it</h3><ol><li><strong>Check your display size.</strong> Find its native resolution or use the wallpaper preview in your device settings.</li><li><strong>Keep the focal point.</strong> Test fill versus fit, then reposition the image.</li><li><strong>Place your labels.</strong> A clock, widgets and icon grid cover different areas.</li><li><strong>Use the original download.</strong> The gallery preview is smaller and is intended for browsing.</li></ol></div></section>
  <section class="ed-section ed-split" aria-labelledby="amoledGuideTitle"><div><span class="ed-eyebrow">Dark screens, readable details</span><h2 id="amoledGuideTitle">What makes an AMOLED-style wallpaper useful?</h2><p class="ed-prose">A black or nearly black field can leave space around a luminous subject. It does not guarantee a measured battery saving: OLED power depends on the actual pixels, brightness and device. Fine bright lines can still interfere with small text.</p><a class="ed-link" href="/wallpapers/amoled/">Compare isolated light, neon portraits and dark textures</a></div><div><span class="ed-eyebrow">About this collection</span><h2>Artwork for the screen you use</h2><p class="ed-prose">PMW Visuals organizes digital artwork by scene, visual theme and orientation. Collection guides help you compare compositions; detail pages bring the preview, file dimensions, color or framing notes, and related artwork together.</p><p class="ed-prose">Names describe the artwork rather than verified locations, astronomical observations or official characters. Start with a style you like, check how it fits your own screen, and read the personal-use license before downloading.</p><div class="ed-links"><a href="/license.html">Wallpaper license</a><a href="/tools/">Tools for cropping and converting</a></div></div></section>
  </div>
  <!-- pmw-editorial:home:end -->`;
  html=html.replace(/<!-- pmw-editorial:home:start -->[\s\S]*?<!-- pmw-editorial:home:end -->\s*/, '');
  html=html.replace(/(<section class="wallpaper-section wallpaper-results-section")/, `${section}\n            $1`);
  html=html.replace(/<h1 class="section-title">[\s\S]*?<\/h1>/,'<h1 class="section-title">Find a wallpaper that feels like you.</h1>');
  html=html.replace(/<p class="section-subtitle">[\s\S]*?<\/p>/,'<p class="section-subtitle">Explore digital art by mood, composition and screen shape. Compare the original size before you download.</p>');
  html=html.replace(/<button class="filter-chip"[^>]*data-filter-value="4k"[^>]*>4K<\/button>/,'<a class="filter-chip" href="#screen-fit">Screen fit</a>');
  if(!html.includes('/css/pmw-editorial.css')) html=html.replace('</head>','<link rel="stylesheet" href="/css/pmw-editorial.css?v=20261006">\n</head>');
  if(!html.includes('data-pmw-editorial-only')) html=html.replace('</head>','<script src="js/progressive-wallpaper-images.js?v=20261006" data-pmw-editorial-only defer></script>\n</head>');
  const homeTitle='PMW Wallpapers | Digital Art, Collections & Screen-Fit Guides';
  const homeDescription='Explore PMW wallpaper collections, compare digital artwork and choose a readable mobile or desktop background with resolution, crop and color guidance.';
  html=html.replace(/<title>.*?<\/title>/,`<title>${e(homeTitle)}</title>`);
  html=html.replace(/((?:src|href)="(?:desktop-)?wallpapers-data\.js)(?:\?[^"]*)?"/g,'$1?v=20261006"');
  for(const attr of ['name="description"','property="og:description"','name="twitter:description"']) html=html.replace(new RegExp(`<meta ${attr}[^>]*>`),`<meta ${attr} content="${e(homeDescription)}">`);
  for(const attr of ['property="og:title"','name="twitter:title"']) html=html.replace(new RegExp(`<meta ${attr}[^>]*>`),`<meta ${attr} content="${e(homeTitle)}">`);
  html=html.replace(/function updateCategorySeo\(category\) \{[\s\S]*?\n        \}/, `function updateCategorySeo(category) {
            document.title = category === 'All' ? ${JSON.stringify(homeTitle)} : category + ' Wallpapers | PMW Visuals';
            document.querySelector('meta[name="description"]').setAttribute('content', category === 'All' ? ${JSON.stringify(homeDescription)} : 'Explore ' + category + ' digital artwork and compare wallpaper dimensions, previews and screen-fit notes.');
        }`);
  if(!html.includes('id="browseTitle"')) html=html.replace(/(<section class="wallpaper-section wallpaper-results-section"[^>]*>)/, `$1<header class="ed-gallery-heading"><h2 id="browseTitle">Browse wallpapers</h2><p>Use the filters above. More artwork loads as you scroll.</p></header><noscript><p>Browse the <a href="/wallpapers/">static collections</a> for all artwork, notes and downloads.</p></noscript>`);
  html=html.replace(/<script type="application\/ld\+json" data-seo-schema>[\s\S]*?<\/script>/, `<script type="application/ld+json" data-seo-schema>${json({'@context':'https://schema.org','@type':'CollectionPage',name:'PMW Wallpapers',description:homeDescription,url:origin+'/',isPartOf:{'@type':'WebSite',name:'PMW Visuals',url:origin+'/'},mainEntity:{'@type':'ItemList',itemListElement:collections.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,url:`${origin}/wallpapers/${c.slug}/`}))}})}</script>`);
  write(file,galleryLayout(html));
}

function directory() {
  const file='wallpapers/index.html'; let html=fs.readFileSync(path.join(siteRoot,file),'utf8');
  html=html.replace(/<style>[\s\S]*?<\/style>/g,'');
  const groups=[...collections.map(c=>({name:c.name,slug:c.slug,items:pages.filter(p=>!p.file.includes('/desktop/')&&categoryKey(p)===c.slug)})),{name:'Landscape desktop artwork',slug:null,items:pages.filter(p=>p.file.includes('/desktop/'))}];
  html=html.replace(/<body[\s\S]*?<\/body>/,`<body class="editorial-collection"><main class="ed-wrap">${brandNav}<header class="ed-section"><span class="ed-eyebrow">The collection directory</span><h1>Choose a visual world.</h1><p class="ed-prose">Start with a collection guide to compare scenes, screen layouts and color. The complete artwork directory remains below, grouped by collection. All existing artwork URLs are preserved.</p></header><div class="ed-collection-grid">${collections.map(c=>`<a class="ed-collection-card" href="/wallpapers/${c.slug}/">${imageTag(itemFor(c.hero))}<span class="ed-card-copy"><strong>${e(c.name)}</strong><span>${e(c.label)}</span></span></a>`).join('')}</div><div class="ed-links"><a href="/?device=desktop#latest-wallpapers">Browse desktop artwork in the gallery</a><a href="/#screen-fit">Choose a resolution</a></div><section class="ed-section ed-directory" aria-labelledby="directoryTitle"><h2 id="directoryTitle">All artwork pages</h2><p class="ed-prose">Expand a collection to see its complete list. These are individual artwork pages, not extra versions of the same URL.</p>${groups.map(g=>`<details><summary>${e(g.name)} · ${g.items.length} pages</summary>${g.slug?`<p><a class="ed-link" href="/wallpapers/${g.slug}/">Read the collection guide</a></p>`:''}<ul>${g.items.sort((a,b)=>titleFor(a).localeCompare(titleFor(b))).map(p=>`<li><a href="/${p.file}">${e(titleFor(p))}</a></li>`).join('')}</ul></details>`).join('')}</section></main><script src="/consent.js" defer></script><script src="/js/account-menu.js" defer></script><script src="/js/platform-footer.js" defer></script></body>`);
  if(!html.includes('/css/pmw-editorial.css')) html=html.replace('</head>','<link rel="stylesheet" href="/css/pmw-editorial.css?v=20261006">\n</head>');
  html=html.replace('All existing artwork URLs are preserved.','Use the desktop toggle in the gallery for landscape artwork.').replace('These are individual artwork pages, not extra versions of the same URL.','Open a page for the preview, original dimensions, screen notes and download options.');
  html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>Wallpaper Collections &amp; Artwork Directory | PMW Visuals</title>');
  const directoryDescription='Explore PMW wallpaper collection guides, compare scenes and screen-fit notes, and browse the complete portrait and landscape artwork directory.';
  for(const attr of ['name="description"','property="og:description"','name="twitter:description"']) html=html.replace(new RegExp(`<meta ${attr}[^>]*>`),`<meta ${attr} content="${e(directoryDescription)}">`);
  html=html.replace(/<script type="application\/ld\+json" data-seo-schema>[\s\S]*?<\/script>/,`<script type="application/ld+json" data-seo-schema>${json({'@context':'https://schema.org','@type':'CollectionPage',name:'Wallpaper collections and artwork directory',url:origin+'/wallpapers/',description:directoryDescription,mainEntity:{'@type':'ItemList',itemListElement:collections.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,url:origin+'/wallpapers/'+c.slug+'/'}))}})}</script>`);
  write(file,html);
}

function sitemap() {
  // Reviewed pages are prioritized; nonlisted pages remain linked and indexable.
  const old=fs.readFileSync(path.join(siteRoot,'sitemap.xml'),'utf8');
  const platform=[...old.matchAll(/<url>\s*<loc>(.*?)<\/loc>([\s\S]*?)<\/url>/g)].filter(([,url])=>!url.includes('/wallpapers/')&&url!==origin+'/'&&url!==origin+'/pmw-studio.html');
  const roots=[origin+'/',origin+'/wallpapers/',...collections.map(c=>`${origin}/wallpapers/${c.slug}/`),...PILOT_PATHS.map(file=>itemFor(file).canonical)];
  const urls=roots.map(url=>`  <url><loc>${e(url)}</loc><lastmod>2026-10-06</lastmod></url>`).concat(platform.map(([,url,rest])=>`  <url><loc>${e(decode(url))}</loc>${rest.trim()}</url>`));
  write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<!-- Focused on collection hubs and visually reviewed artwork. See docs/editorial-refactor-plan.md. Other detail pages remain indexable and internally linked. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}

function removeInterstitials() {
  for(const file of ['index.html','pmw-studio.html','tools/index.html','tools/image-converter/index.html','tools/image-compressor/index.html']) {
    const html=fs.readFileSync(path.join(siteRoot,file),'utf8').replace(/^\s*<script>\(function\(s\)\{s\.dataset\.zone=[\s\S]*?<\/script>\s*$/gm,'');
    write(file,html);
  }
}

function updateReviewedCatalog() {
  for(const [file,key] of [['wallpapers-data.js','PMW_WALLPAPERS'],['desktop-wallpapers-data.js','PMW_DESKTOP_WALLPAPERS']]) {
    const source=fs.readFileSync(path.join(siteRoot,file),'utf8');
    const context={window:{}}; vm.runInNewContext(source,context);
    let updated=false;
    for(const record of context.window[key]) {
      const page=pages.find(p=>p.id===record.id); const notes=page&&reviewed[page.file];
      if(!notes) continue;
      if(record.description!==notes.intro) { record.description=notes.intro; updated=true; }
      if(notes.title&&record.title!==notes.title) { record.title=notes.title; updated=true; }
    }
    if(updated) write(file,`window.${key} = ${JSON.stringify(context.window[key],null,2)};\n`);
    else write(file,source);
  }
}

removeInterstitials();
home();
for(const c of collections.filter(c=>all||c.slug==='amoled')) category(c);
for(const p of pages.filter(p=>all||PILOT_PATHS.includes(p.file))) detail(p);
if(all) { directory(); sitemap(); }
updateReviewedCatalog();
console.log(`${all?'Full':'Pilot'} static editorial build: ${changed} files changed; no public URL or original download destination renamed.`);
