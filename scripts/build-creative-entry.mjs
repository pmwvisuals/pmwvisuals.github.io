// Idempotent entry-point updates. Existing gallery markup and indexing are retained.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES, templateSVG } from '../js/creative/templates.js';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const title='PMW Visuals | Editable Templates, Wallpapers & Creative Tools';
const description='Create thumbnails, collages, desktop organizers, and backgrounds with editable PMW designs. Explore wallpapers and customize your next idea online.';
const cards=[['make-something','YouTube thumbnails','A headline, a photo, a reason to click.'],['slow-days','Collages & vision boards','A space for your favorite moments.'],['clear-desk','Desktop organizers','Make room for a clearer day.'],['soft-horizon','Original backgrounds','Color, pattern, and a little possibility.']];
const section=`<!-- pmw-creative:home:start --><section class="pmw-create-section" aria-labelledby="creativeStartTitle"><div class="pmw-create-head"><div><span class="pmw-create-eyebrow">Find a starting point. Make it yours.</span><h2 id="creativeStartTitle">What will you create today?</h2><p>Bring your photos, change the words, and explore a new palette. Start with an editable design or a blank canvas.</p></div><a class="pmw-create-link secondary" href="/templates/">Explore all templates ↗</a></div><div class="pmw-create-grid">${cards.map(([id,name,copy])=>`<a class="pmw-create-card" href="/editor/?template=${id}"><img src="/assets/creative/previews/${id}.svg" alt="${name} editable example" width="400" height="300"><strong>${name} ↗</strong><small>${copy}</small></a>`).join('')}</div></section><!-- pmw-creative:home:end -->`;
export function creativeHome(html){
  html=html.replace(/<h1 class="section-title">[\s\S]*?<\/h1>/,'<h1 class="section-title">Find your inspiration.<br>Make something of your own.</h1>');
  html=html.replace(/<p class="section-subtitle">[\s\S]*?<\/p>/,`<p class="section-subtitle">Editable templates, original backgrounds, and artwork for your screen. Your next idea starts here.</p>`);
  html=html.replace(/<span class="wallpaper-kicker">[\s\S]*?<\/span>/,'<span class="wallpaper-kicker">Your space to discover & create</span>');
  html=html.replace(/<a class="ed-gallery-cta"[\s\S]*?<\/a>/,'');
  const actions='<div class="pmw-create-actions"><a class="pmw-create-link" href="/templates/">Explore editable templates ↗</a><a class="pmw-create-link secondary" href="/editor/?blank=1">Start creating +</a><a class="pmw-create-link secondary" href="#latest-wallpapers">Browse wallpapers ↓</a></div>';
  html=html.replace(/<div class="pmw-create-actions">[\s\S]*?<\/div>/,'');
  html=html.replace(/(<p class="section-subtitle">[\s\S]*?<\/p>)/,`$1${actions}`);
  html=html.replace(/<!-- pmw-creative:home:start -->[\s\S]*?<!-- pmw-creative:home:end -->\s*/,'');
  html=html.replace('<!-- pmw-editorial:home:start -->',`${section}\n<!-- pmw-editorial:home:start -->`);
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${title}</title>`);
  for(const attr of ['name="description"','property="og:description"','name="twitter:description"'])html=html.replace(new RegExp(`<meta ${attr}[^>]*>`),`<meta ${attr} content="${description}">`);
  for(const attr of ['property="og:title"','name="twitter:title"'])html=html.replace(new RegExp(`<meta ${attr}[^>]*>`),`<meta ${attr} content="${title}">`);
  html=html.replaceAll('PMW Wallpapers | Digital Art, Collections &amp; Screen-Fit Guides',title).replaceAll('PMW Wallpapers | Digital Art, Collections & Screen-Fit Guides',title);
  html=html.replaceAll('Explore PMW wallpaper collections, compare digital artwork and choose a readable mobile or desktop background with resolution, crop and color guidance.',description);
  if(!html.includes('/css/creative-entry.css'))html=html.replace('</head>','<link rel="stylesheet" href="/css/creative-entry.css?v=20261030">\n</head>');
  return html;
}
export function buildCreativeEntries(){
  fs.mkdirSync(path.join(root,'assets/creative/previews'),{recursive:true});
  for(const t of TEMPLATES)fs.writeFileSync(path.join(root,`assets/creative/previews/${t.id}.svg`),templateSVG(t));
  const home=path.join(root,'index.html');fs.writeFileSync(home,creativeHome(fs.readFileSync(home,'utf8')));
  const file=path.join(root,'tools/index.html');let html=fs.readFileSync(file,'utf8');
  const tools='<section class="pmw-create-section pmw-create-tools" aria-labelledby="toolsEditorTitle"><div class="pmw-create-head"><div><span class="pmw-create-eyebrow">Give your ideas a little room</span><h2 id="toolsEditorTitle">Meet your creative workspace.</h2><p>Build a thumbnail, arrange a collage, or create a background. Add your photos and text, choose a ratio, and download your design.</p></div><a class="pmw-create-link" href="/editor/">Open PMW Editor ↗</a></div><div class="pmw-create-grid"><a class="pmw-create-card" href="/templates/"><img src="/assets/creative/previews/make-something.svg" width="600" height="225" alt="Editable thumbnail template"><strong>Start with a template ↗</strong></a><a class="pmw-create-card" href="/my-designs/"><img src="/assets/creative/previews/clear-desk.svg" width="600" height="225" alt="Personalized desktop organizer"><strong>Continue a saved design ↗</strong></a></div></section>';
  html=html.replace(/<!-- pmw-creative:tools:start -->[\s\S]*?<!-- pmw-creative:tools:end -->\s*/,'');
  html=html.replace('<section class="tools-card-grid',`<!-- pmw-creative:tools:start -->${tools}<!-- pmw-creative:tools:end -->\n<section class="tools-card-grid`);
  if(!html.includes('/css/creative-entry.css'))html=html.replace('</head>','<link rel="stylesheet" href="/css/creative-entry.css?v=20261030">\n</head>');
  fs.writeFileSync(file,html);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildCreativeEntries();
