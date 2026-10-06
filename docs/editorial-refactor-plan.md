# Editorial refactor: implementation plan and audit

## Architecture found before edits (6 October 2026)

- Static GitHub Pages deployment; no site build or framework. `index.html` contains the interactive gallery and its filter/download logic.
- `wallpapers-data.js` has 1,103 mobile records. `desktop-wallpapers-data.js` has 589 desktop records, of which 401 have static detail URLs in `wallpaper-pages.js`. The other 188 stay in the existing interactive gallery; this refactor must not generate extra pages for them.
- `wallpaper-pages.js` maps 1,504 public detail URLs. Eight mobile collection pages and a long wallpaper directory already exist.
- Detail pages repeat inline CSS, a short category template, keyword pills, and the same metadata description. Some source breadcrumbs use `../index.html` from a `/01/` or `/02/` folder rather than the collection root.
- Mobile previews have same-domain WebP files in `thumbnails/google-drive/`; original downloads remain external. Desktop previews/downloads use the existing Cloudinary URLs. The original files are not available locally.
- `js/wallpaper-protection.js`, `download-tracking.js`, saved-wallpaper and wallpaper-tools scripts handle downloads, analytics, saves, and editing. Preserve their hooks and original download destinations.
- GA4 `G-KWF3JNMHNW` and consent scripts exist in mobile pages; the desktop template omits GA4. Preserve existing tracking and add the same consent-aware setup to desktop details.
- `sw.js` imports a third-party advertising worker. Replace it with an unregistering worker and retire only registrations for that exact same-origin script.
- `sitemap.xml` lists 1,524 URLs, including malformed doubled slashes on collection URLs. `robots.txt` allows crawling.
- Third-party interstitial scripts exist on the home, Studio, tools index, converter, and compressor pages. The baseline homepage capture displayed a misleading missed-call/payout promotion. Remove those includes while retaining AdSense and GA4.

## Implementation sequence

1. **Pilot:** add one shared editorial stylesheet and a safe static generator. Add visible homepage collection links, reasoned starting selections, screen-fit/AMOLED guidance and an honest catalog explanation. Preserve the interactive gallery and its 24/12-card behavior. Upgrade AMOLED and ten representative detail pages before touching other detail pages.
2. **Pilot verification:** inspect desktop and mobile screenshots; check navigation, image loading, download destinations, tracking, canonicals, JSON-LD and no-JavaScript content. Fix the pilot before scaling.
3. **Scale:** apply the verified transformation to the remaining mapped pages, using category-specific structures, existing metadata and measured local-preview palettes. Replace repeated detail CSS with shared files. Fail on unsupported source structure; do not silently recreate pages or alter URLs. Give the eight collections distinct guidance and related collection links. Turn the giant directory into a collection-first directory while retaining links to every existing detail page.

## Content rules

- Handwritten notes for the ten visually inspected pilot images; other pages use factual catalog/frame/palette notes, not fabricated scene stories or popularity claims.
- Titles and tags describe digital artwork, not verified locations, real people, named characters, or astronomy. Do not infer authenticity or a real location from an image.
- Only label dimensions as original dimensions where they are already in the catalog. Report local preview dimensions separately in image schema.
- Do not call a 941×1672 image 4K. Upscaling is not new detail. Do not claim a black pixel percentage or battery saving unless supported; AMOLED guidance explains the limitation.
- There is no reliable added date for many static pages. Use "Starting selections" and theme-based navigation rather than fake new/popular labels or fake editor biographies.
- Any palette is sampled from the local preview, not the original file. Crop/label guidance is conditional and identifies when the actual phone layout must be checked.

## Sitemap decision

Use a focused sitemap initially: the homepage, useful existing platform/legal pages, collection hubs, and the ten visually reviewed detail pages. Keep every other detail URL indexable, canonical, and linked in the collection galleries/directory. Sitemap inclusion is a prioritization signal, not an indexing guarantee or a deindexing mechanism. Do not issue blanket `noindex`. Add other detail pages to the reviewed set only after an actual image/content review. Use truthful modification dates only for pages substantively updated by this refactor.

## Acceptance

- All 1,504 existing mapped paths still exist; all existing canonical URLs and download destinations are preserved.
- Shared CSS loads at every folder depth, all generated internal links/files exist, one H1 per page, valid JSON-LD, and matching image dimensions/format.
- No accidental `noindex`, no doubled sitemap slashes, no intrusive ad include, GA4 and consent retained.
- Homepage/collections expose meaningful text and collection links in source HTML. Gallery, device toggle, saves and downloads remain usable.
- Screenshots cover the home, collection and representative portrait/landscape detail layouts on desktop and narrow mobile widths. Screenshots alone do not establish complete accessibility compliance.
