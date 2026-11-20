import { existsSync, readFileSync } from 'node:fs';
import { escapeHTML } from '../js/creative/model.js';
import { SHOWCASE_DESIGNS, showcaseURL } from '../js/creative/showcase-designs.js';
import { TEMPLATES } from '../js/creative/templates.js';

const desktopWallpapers = [
  'alpine-balcony-above-turquoise-lake',
  'velvet-waves-in-jewel-tones',
  'japanese-teahouse-garden-in-rain',
  'northern-lights-over-frozen-pine-lake',
  'lavender-villa-above-blue-sea',
  'neon-tokyo-skyline-at-twilight',
  'glacier-peaks-above-arctic-sea',
  'aurora-shrine-with-spirit-fox'
];
const phoneWallpapers = [
  'sunlit-forest-creek',
  'cosmic-whale-in-a-starry-ocean',
  'candlelit-library-shelves',
  'gondola-in-a-moonlit-canal',
  'black-marble-with-gold-cracks',
  'samurai-entering-lantern-village-at-night',
  'blue-mushroom-forest-under-the-moon',
  'red-sun-and-orbiting-planets',
  'boy-in-a-blue-crystal-cave-city',
  'moonlit-mountain-lake-valley',
  'moonlit-rose-garden-arch',
  'red-tree-by-a-moonlit-river',
  'black-cat-on-a-moonlit-rooftop',
  'moonlit-tropical-beach-with-footprints',
  'moonlit-mountain-peak',
  'snowy-moonlit-forest-path',
  'blue-crystal-cavern-with-luminous-shards',
  'starry-desert-dunes'
];
const featuredTemplates = [
  ['make-something', 'YouTube thumbnail'],
  ['weekend-notes', 'Photo collage'],
  ['clear-desk', 'Desktop organizer']
];

function wallpaperLane(catalog, slugs, device, heading) {
  const id = `wallpaper-row-${device}`;
  const desktop = device === 'desktop';
  const cards = slugs.map(slug => {
    const item = catalog.find(item => item.path?.endsWith(`/${slug}.html`));
    if (!item || (desktop ? item.width <= item.height : item.height <= item.width)) {
      throw new Error(`Missing or incorrect ${device} wallpaper: ${slug}`);
    }
    const preview = desktop ? `/assets/home/wallpapers/${slug}.webp` : item.preview;
    if (!existsSync(new URL(`..${preview}`, import.meta.url))) {
      throw new Error(`Missing featured wallpaper preview: ${preview}`);
    }
    return `<li><a href="/${escapeHTML(item.path)}">
        <img src="${escapeHTML(preview)}" alt="" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">
        <span>${escapeHTML(item.title)}</span>
      </a></li>`;
  }).join('\n      ');
  return `<div class="home-wallpaper-lane" data-device="${device}">
      <div class="home-lane-header">
        <h3 id="${id}-heading">${heading}</h3>
        <div class="home-strip-controls" hidden>
          <button type="button" data-strip-step="-1" aria-controls="${id}" aria-label="Previous ${device} wallpapers">←</button>
          <button type="button" data-strip-pause aria-controls="${id}" aria-label="Pause ${device} wallpaper rotation"><span aria-hidden="true">Ⅱ</span></button>
          <button type="button" data-strip-step="1" aria-controls="${id}" aria-label="Next ${device} wallpapers">→</button>
        </div>
      </div>
      <ul class="home-wallpaper-row" id="${id}" aria-labelledby="${id}-heading">
        ${cards}
      </ul>
    </div>`;
}

function wallpaperStrip() {
  const catalog = JSON.parse(readFileSync(new URL('../assets/wallpaper-catalog.json', import.meta.url)));
  return `<section class="home-wallpaper-strip" id="browse-wallpapers" aria-labelledby="wallpaperStripHeading">
    <div class="home-section-header">
      <h2 id="wallpaperStripHeading">Browse wallpapers</h2>
      <a class="home-strip-all" href="#latest-wallpapers">View all <span aria-hidden="true">↗</span></a>
    </div>
    ${wallpaperLane(catalog, desktopWallpapers, 'desktop', 'Laptop & desktop')}
    ${wallpaperLane(catalog, phoneWallpapers, 'phone', 'Mobile')}
  </section>`;
}

function creativeSection() {
  const cards = featuredTemplates.map(([id, type]) => {
    const template = TEMPLATES.find(template => template.id === id);
    if (!template) throw new Error(`Missing featured template: ${id}`);
    return `<a class="home-template-card" href="/editor/?template=${id}">
        <span class="home-template-art"><img src="/assets/creative/previews/${id}.svg" alt="" width="${template.width}" height="${template.height}" loading="lazy" decoding="async"></span>
        <span class="home-template-caption"><span><strong>${escapeHTML(template.name)}</strong><small>${type}</small></span><span aria-hidden="true">↗</span></span>
      </a>`;
  }).join('\n      ');
  return `<section class="home-creative-section" id="pmw-creative" aria-labelledby="homeCreativeHeading">
    <div class="home-section-header">
      <div><h2 id="homeCreativeHeading">PMW Creative</h2><p>Pick a template or start with a blank canvas.</p></div>
      <div class="home-creative-actions">
        <a class="home-create-button" href="/editor/?blank=1">Open editor <span aria-hidden="true">↗</span></a>
        <a href="/templates/">All templates <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <div class="home-template-grid">
      ${cards}
    </div>
  </section>`;
}
const toolIcons={
  resize:'<path d="M4 10V4h6M4 4l7 7m9 3v6h-6m6 0-7-7"/>',
  convert:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 8a7 7 0 0 1 11.6-3L20 8M4 16l2.9 3A7 7 0 0 0 18.5 16"/>',
  compress:'<path d="M8 3v5H3m18 0h-5V3M3 16h5v5m8 0v-5h5"/><path d="m3 3 5 5m8 0 5-5M3 21l5-5m8 0 5 5"/>'
};
const icon=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${toolIcons[kind]}</svg>`;
export function creativeHubHome() {
  const design=SHOWCASE_DESIGNS.find(item=>item.id==='youtube');
  return `<header class="wallpaper-hero hub-hero" id="wallpaperHero" data-creative-hub>
    <div class="hub-main studio-stage showcase-stage">
      <div class="hub-copy">
        <span class="hub-label">PMW Visuals</span>
        <h1>Make something <em>yours.</em></h1>
        <p>Discover your next wallpaper. Turn it into a design.<br class="showcase-copy-break"> Make it ready to share with our creative tools.</p>
      </div>
      <div class="showcase-gallery" aria-label="Wallpapers, Creative and Tools">
        <figure class="showcase-piece showcase-portrait">
          <a class="showcase-art wallpaper-showcase" href="#browse-wallpapers" aria-label="Browse PMW Wallpapers for phone and desktop">
            <span class="wallpaper-card-copy"><span class="wallpaper-card-kicker">PMW Wallpapers</span><strong>Choose your<br>wallpaper.</strong><small>For your phone. For your desktop.</small><span class="wallpaper-card-action">Browse wallpapers <span aria-hidden="true">↗</span></span></span>
            <span class="wallpaper-card-arrow" aria-hidden="true">↗</span>
          </a>
        </figure>
        <figure class="showcase-piece showcase-youtube">
          <div class="showcase-art creative-showcase">
            <a class="creative-interface-link" href="${showcaseURL(design)}" aria-label="Open this editable template in PMW Creative"><img class="creative-interface-image" src="/assets/home/creative-interface.webp" width="1600" height="900" alt="PMW Creative editing interface with templates, editable text, crop controls and layers" fetchpriority="high" decoding="async"></a>
            <div class="creative-card-overlay"><strong>PMW Creative</strong><div class="hub-actions"><a class="hub-primary" href="${showcaseURL(design)}">Open Creative <span aria-hidden="true">→</span></a><a class="hub-template-link" href="/templates/">Browse templates</a></div></div>
          </div>
        </figure>
        <figure class="showcase-piece showcase-tools">
          <div class="showcase-art tools-showcase">
            <a class="tools-preview-label" href="/tools/">PMW Tools <span aria-hidden="true">↗</span></a>
            <div class="tools-brand-visual" aria-hidden="true"><span class="tool-file tool-file-back"><b>JPG</b>${icon('resize')}</span><span class="tool-file tool-file-front"><b>PNG</b><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="5" y="6" width="22" height="20" rx="3"/><circle cx="12" cy="13" r="2"/><path d="m7 23 7-7 4 4 4-6 4 9"/></svg></span><span class="tool-orbit">${icon('convert')}</span></div>
            <span class="tools-preview-heading">Make it ready.</span>
            ${[['resize','Resize','Change size'],['convert','Convert','Switch formats'],['compress','Compress','Reduce file size']].map(([id,title,description])=>`<a class="showcase-tool" href="/tools/image-${id==='resize'?'resizer':id==='convert'?'converter':'compressor'}/">${icon(id)}<span><strong>${title}</strong><small>${description}</small></span><b aria-hidden="true">↗</b></a>`).join('')}
          </div>
        </figure>
      </div>
    </div>
  </header>
  ${wallpaperStrip()}
  ${creativeSection()}
  <div class="hub-gallery-heading">
    <h2>All wallpapers</h2>
    <div><a href="/?device=mobile#latest-wallpapers">Phone</a><a href="/?device=desktop#latest-wallpapers">Desktop</a><a href="/wallpapers/">All collections ↗</a></div>
  </div>`;
}
