import { SHOWCASE_DESIGNS, showcaseURL } from '../js/creative/showcase-designs.js';
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
          <a class="showcase-art wallpaper-showcase" href="#latest-wallpapers" aria-label="Browse PMW Wallpapers for phone and desktop">
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
  <div class="hub-gallery-heading">
    <h2>Explore wallpapers</h2>
    <div><a href="/?device=mobile#latest-wallpapers">Phone</a><a href="/?device=desktop#latest-wallpapers">Desktop</a><a href="/wallpapers/">All collections ↗</a></div>
  </div>`;
}
