# Editorial refactor results — 6 October 2026

## What changed

The staged pilot was completed and inspected before scaling to all 1,504 existing mapped detail pages. The homepage now exposes collection links, reasoned starting selections, mood navigation, resolution/crop guidance, an AMOLED guide and an explanation of the digital-art collection in static HTML. All eight mobile collection hubs have their own introductory focus, three visual approaches, starting artwork, screen/color guidance, FAQs and related collections before the complete static gallery.

Detail pages share one stylesheet and use seven content variants: contrast, cinematic, landscape, scenic, cosmic, illustration and atmosphere. Ten visually inspected works have specific scene/framing notes; other works use the existing catalog and measured local-preview data conservatively. This does not mean every image has received an individual visual/editorial review. The directory contains links to all 1,504 original paths; the 188 extra desktop catalog records without existing detail pages were not given new URLs.

Two inspected display names were corrected: Sunlit Forest Creek → Sunlit Alpine Creek, and Blue Mushroom Forest under the Moon → Moonlit Blue Bioluminescent Forest. Their paths/canonicals stayed identical.

Meta descriptions and social/image schema are aligned with the page content. High-resolution external sources remain in primary/social image metadata; local preview images have separate, accurate thumbnail schema. The default duplicate category description patterns no longer overwrite the editorial homepage. Breadcrumbs and related links resolve statically, and related order is based on shared scene/theme metadata rather than being shuffled on each visit.

The intrusive vignette/tag includes were removed from home, Studio, tools index, compressor and converter. The former third-party advertising `sw.js` was replaced by a retiring worker; the shared theme script unregisters only this exact same-origin worker. AdSense and GA4 were retained. The desktop detail template's missing GA4 was supplied with consent defaults. Root `ads.txt` uses the publisher ID already in the site's AdSense include.

## Verification and limits

- Full validator: 1,514 page surfaces and 90,919 checks passed, including the preservation baseline for all 1,504 URLs, canonicals, IDs and original download destinations. Static links/assets, heading count, JSON-LD, inline JavaScript syntax, GA4/consent, crawl directives and sitemap entries pass.
- Sitemap XML parsed successfully: 30 focused URLs. No double-slash paths. No blanket `noindex`; `robots.txt` and the public URL map were unchanged.
- A repeated full generation reported zero changed files.
- All eight collection hubs and the directory were inspected at 390px. Each had document width equal to its client width and no broken visible hero image. The directory contains 1,504 detail links.
- Homepage device switch still displays 24 initial cards. Its existing 12-card scroll loading is preserved. The new static editorial thumbnails use a separate scoped instance of the existing progressive loader.
- Some higher-resolution Google preview requests were inconsistent in the browser run. The shared loader now tries one alternate Google preview URL if a stage fails, while retaining the visible local preview, the 480/720 quality cap and existing queue concurrency. It does not replace original downloads or hide a loaded image while waiting.
- Main portrait and landscape previews loaded. The portrait download button was enabled; every original destination matches the baseline. One attempted Cloudinary original download timed out in the browser test environment. External-host downloads are therefore not reported as comprehensively verified; no link was changed in response to that timeout.
- Screenshot review fixed the progressive wrapper darkening entire light-mode captions, light-mode secondary-button contrast, and mobile heading placement. It does not establish full accessibility compliance.
- Total mapped detail HTML fell from about 29.82 MiB to 20.31 MiB (about 32%), before shared asset caching. Original image files and download quality were not changed.

## Captured flow and health

1. **Home → choose a collection: passed.** Accepted final dark desktop screenshot: `29-final-home-editorial.jpg`; mobile entry: `20-pilot-home-mobile.jpg`. The final DOM check showed 480px upgrades on three visible editorial previews while all stayed visible, and confirmed no gallery image was claimed by the editorial loader.
2. **Collection → guidance/gallery: passed.** Accepted narrow captures: `21-mobile-amoled.jpg`, `21-mobile-dark-fantasy.jpg`, `21-mobile-nature.jpg`, `21-mobile-romantic.jpg`, and the four `22-mobile-*` captures. Baseline: `02-before-amoled.jpg`.
3. **Detail → artwork/fit notes: passed.** Accepted screenshots: `19-pilot-nature-mobile.jpg`, `24-mobile-contrast-notes.jpg`, `25-mobile-cosmic-notes.jpg`, `27-final-framing-notes-desktop.jpg`. Baseline: `03-before-nature.jpg`.
4. **Detail → original download: exact destination preserved; external browser-download test limited by timeout.** Source and tracking hooks pass; external file availability is not inferred from a local link check.
5. **Directory → every existing detail path: passed.** `23-mobile-directory.jpg` and static link validation cover the directory.

Screenshots and the original preservation manifest are outside the deployed repository at `../../audit/editorial-20261006/`. The baseline home screenshot includes the intrusive ad overlay actually observed in this audit. Earlier captures that still measured 1280px were not used as evidence of mobile responsiveness.

## Changed file groups

- Home: `index.html`.
- Collections/directory: `wallpapers/index.html` and all eight existing `wallpapers/<collection>/index.html` files.
- Details: all 1,504 existing files named in `wallpaper-pages.js`; no files were renamed or deleted.
- Content/data: ten reviewed catalog descriptions, two display titles, `scripts/editorial/content.mjs`, `scripts/editorial/catalog.mjs`, `scripts/editorial/analyze-previews.py`, `scripts/editorial/preview-analysis.json`.
- Shared presentation/runtime: `css/pmw-editorial.css`, `js/pmw-theme.js`, `js/progressive-wallpaper-images.js`, `js/wallpaper-tools-panel.js`, `js/platform-footer.js`.
- SEO/ad cleanup: `sitemap.xml`, `ads.txt`, `sw.js`, the ad includes in Studio and the three tools pages.
- Safe generation: `scripts/build-editorial.mjs`, `scripts/verify-editorial.mjs`, guards in the legacy desktop generator and generic SEO-description updater.
- Documentation: the plan, pilot verification, results and maintenance notes in `docs/`.

## Preserved scope

Original downloads and thumbnail binaries, URL map, wallpaper IDs, existing detail canonicals, permissive robots rules, authentication/profile/admin/premium/Worker logic and legal/license text were preserved. There are no fabricated reviews, popularity counts, author biographies or new mass-generated URLs. Future individual image review is still needed before expanding the reviewed sitemap set. This refactor cannot guarantee Google indexing or AdSense approval; those external decisions are not locally testable.
