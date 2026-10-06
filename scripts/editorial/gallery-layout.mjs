// Preserve the gallery's existing input IDs and listeners; move markup, not controls.
export function galleryLayout(html) {
  const heroMatch=html.match(/<header class="wallpaper-hero"[\s\S]*?<\/header>/);
  if(!heroMatch)throw new Error('Wallpaper hero not found');
  let hero=heroMatch[0];
  let controls=html.match(/<!-- pmw-gallery-controls:start -->([\s\S]*?)<!-- pmw-gallery-controls:end -->/)?.[1];
  if(controls)controls=controls.replace(/^\s*<div class="ed-gallery-controls"[^>]*>/,'').replace(/<\/div>\s*$/,'').trim();
  if(!controls) {
    const start=hero.indexOf('<label class="search-box"');
    const end=hero.lastIndexOf('</div>');
    if(start<0||end<start)throw new Error('Wallpaper filter markup not found');
    controls=hero.slice(start,end).trim();
    hero=hero.slice(0,start)+hero.slice(end);
  }
  hero=hero.replace(/<a class="ed-jump"[\s\S]*?<\/a>\s*/g,'');
  const cta=`<a class="ed-gallery-cta" href="#latest-wallpapers"><span class="ed-cta-art" aria-hidden="true"><img src="/thumbnails/google-drive/1ID8MuKp8jJ7quHvXfQdIJ1AlxrjZc2La.webp" width="60" height="106" alt=""><img src="/thumbnails/google-drive/14iXY0uyDwJ68hXvBYB0KePk80Qno3m1r.webp" width="60" height="106" alt=""><img src="/thumbnails/google-drive/1SFYebgEeRtEX-Ia-EWHSXnRqfi7FmFLA.webp" width="60" height="106" alt=""></span><span class="ed-cta-copy"><span>Find your next screen</span><strong>Explore wallpapers</strong><small>Choose a mood. Make it yours.</small></span><span class="ed-cta-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16m-6-6 6 6 6-6"/></svg></span></a>`;
  if(!hero.includes('class="ed-gallery-cta"'))hero=hero.replace(/(<p class="section-subtitle">[\s\S]*?<\/p>)/,'$1\n'+cta);
  else hero=hero.replace(/<a class="ed-gallery-cta"[\s\S]*?<\/a>/,cta);
  html=html.replace(heroMatch[0],hero);
  html=html.replace(/<!-- pmw-gallery-controls:start -->[\s\S]*?<!-- pmw-gallery-controls:end -->\s*/,'');
  const heading=`<header class="ed-gallery-heading"><div><span class="ed-eyebrow">The wallpaper gallery</span><h2 id="browseTitle">Your next wallpaper starts here.</h2><p>Browse the collection below. Filter by mood and screen, then find your favorite.</p></div><div class="ed-gallery-marker" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="10" y="16" width="36" height="38" rx="6"/><rect x="18" y="8" width="36" height="38" rx="6"/><path d="m25 36 8-10 6 6 6-9"/><circle cx="30" cy="20" r="2"/></svg><span>Scroll. Discover. Download.</span></div></header>`;
  html=html.replace(/<header class="ed-gallery-heading">[\s\S]*?<\/header>/,heading+'\n<!-- pmw-gallery-controls:start --><div class="ed-gallery-controls" id="galleryFilters" aria-label="Search and filter the wallpaper gallery">'+controls+'</div><!-- pmw-gallery-controls:end -->');
  html=html.replace(/const popularStyles = \[[^\n]+;\s*const dynamicTags =[^\n]+;\s*const styles =[^\n]+;/,`// A curated visual-style shortlist; search still covers all catalog tags.
            const styles = ['All', 'dark', 'aesthetic', 'minimal', 'neon', 'gold', 'galaxy', 'fantasy'];`);
  html=html.replace(/const styles = \[[^\n]+;/,"const styles = ['All', 'dark', 'aesthetic', 'minimal', 'neon', 'gold', 'galaxy', 'fantasy'];");
  html=html.replace("style === 'All' ? 'All styles' : escapeHtml(style)","style === 'All' ? 'All styles' : escapeHtml(style.charAt(0).toUpperCase() + style.slice(1))");
  return html.replace(/(href="\/css\/pmw-editorial\.css)(?:\?[^"]*)?"/,'$1?v=20261006-gallery"');
}
