export function creativeHubHome() {
  return `<header class="wallpaper-hero hub-hero" id="wallpaperHero" data-creative-hub>
    <div class="hub-main studio-stage">
      <div class="hub-copy">
        <span class="hub-label">PMW Creative</span>
        <h1>Make something <em>yours.</em></h1>
        <p>Start with a wallpaper. Crop it for your screen or turn it into a post.</p>
        <div class="hub-actions">
          <a class="hub-primary" href="/editor/?blank=1">Open Creative <span aria-hidden="true">↗</span></a>
          <a class="hub-template-link" href="/templates/">Browse templates</a>
        </div>
      </div>
      <nav class="hub-directory studio-deck home-shortcuts" aria-label="Explore PMW">
        <a class="hub-directory-creative" href="/editor/?blank=1">
          <span class="deck-glyph glyph-creative" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="deck-caption"><strong>PMW Creative</strong><small>Design &amp; edit</small></span>
          <span class="deck-arrow" aria-hidden="true">↗</span>
        </a>
        <a class="hub-directory-wallpapers" href="#latest-wallpapers">
          <span class="deck-glyph glyph-wallpapers" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="deck-caption"><strong>PMW Wallpapers</strong><small>Phone &amp; desktop</small></span>
          <span class="deck-arrow" aria-hidden="true">↓</span>
        </a>
        <a class="hub-directory-tools" href="/tools/">
          <span class="deck-glyph glyph-tools" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="deck-caption"><strong>PMW Tools</strong><small>Resize, convert &amp; compress</small></span>
          <span class="deck-arrow" aria-hidden="true">↗</span>
        </a>
      </nav>
    </div>
  </header>
  <div class="hub-gallery-heading">
    <h2>Explore wallpapers</h2>
    <div><a href="/?device=mobile#latest-wallpapers">Phone</a><a href="/?device=desktop#latest-wallpapers">Desktop</a><a href="/wallpapers/">All collections ↗</a></div>
  </div>`;
}
