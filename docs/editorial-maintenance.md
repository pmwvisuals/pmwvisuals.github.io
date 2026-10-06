# Maintaining the editorial wallpaper pages

The site is still static. Node's built-in modules generate the HTML; there is no new framework, runtime dependency, or required build step in the existing Pages workflow.

## Sources

- Keep IDs and public paths in `wallpaper-pages.js` stable. Do not generate extra pages just to increase the URL count.
- `wallpapers-data.js` / `desktop-wallpapers-data.js` remain the catalogs used by the interactive gallery.
- `scripts/editorial/content.mjs` contains the eight collection guides and the ten visually reviewed artwork notes. Correct display names here without renaming old URLs. Add a page to `reviewed` only after looking at its actual image and writing useful scene/framing notes.
- `scripts/editorial/preview-analysis.json` contains measurements of existing local WebP previews. These are preview palettes/dimensions, not original-image measurements or claimed battery benchmarks. `analyze-previews.py` regenerates this data with Pillow if local images change; it does not change or download image files.
- `css/pmw-editorial.css` is shared by home editorial sections, collection guides and detail pages. Do not reintroduce inline copies in each file.
- `scripts/editorial/gallery-layout.mjs` owns the illustrated hero CTA, gallery entrance, relocated filter markup and eight-option style shortlist (including All). Keep the existing input IDs unique so their listeners continue to work. Search still covers specific catalog tags.
- `scripts/theme/markup.mjs` preserves the standard-light markup and shared appearance assets during rebuilds. `css/site-appearance.css` designs both the light wallpaper/tools surfaces and the theme chooser; see `docs/site-appearance.md`.

## Build and verify

```text
node scripts/build-editorial.mjs --pilot
node scripts/verify-editorial.mjs --pilot
node scripts/build-editorial.mjs --all
node scripts/verify-editorial.mjs
```

The full build requires the recorded pilot verification. It changes existing mapped pages, not their URLs. Running it twice with unchanged inputs must report zero changes on the second run. When a later release materially changes reviewed content, update the sitemap's substantive modification date in the generator; do not bump dates on routine rebuilds.

For the current gallery layout and Studio unlinking pass, run
`node scripts/update-gallery-layout.mjs`. Studio's standalone HTML/assets stay
intact and remain accessible by direct URL, but inbound site navigation,
footer promotion and the sitemap entry are removed. Do not recreate those links
in templates. Removing a sitemap entry is not a search-engine deindexing request.

For a preservation comparison with the current audit's original files:

```text
node scripts/verify-editorial.mjs --baseline ../../audit/editorial-20261006/url-baseline.json
```

That baseline lives outside the deployed repository. Without it, the validator still checks paths, anchors, local assets, tracking hooks, inline JavaScript syntax, JSON-LD and sitemap URLs. The audit baseline additionally checks the exact former IDs/canonicals/download destinations.

The old generic description updater and desktop template generator now stop before writing. Their source is retained for reference. They should not overwrite the new structure or automatically add unreviewed pages to the focused sitemap.

## Image and download policy

Keep the original Google Drive / Cloudinary download destinations. Do not substitute a thumbnail for the download. Local previews stay small and fast; existing progressive image loading upgrades them according to the existing bandwidth policy. On the homepage, the shared image loader is scoped to the editorial section so it does not compete with the gallery's loader.

Primary/social image metadata retains the larger external source. Existing same-domain thumbnails are identified separately, with measured WebP dimensions in their nested ImageObject. Do not label the small preview as a full-resolution PNG or enlarge it to simulate a new original.

## Sitemap and indexing

The initial sitemap contains 30 URLs: home, the directory, eight guides, ten visually reviewed detail pages and existing platform/legal URLs. All 1,504 detail pages remain indexable, canonical and linked. Removing a URL from the sitemap neither removes its page nor requests its removal from Search. Add further artwork to the reviewed set gradually; the sitemap is a selection of pages to prioritize, not a promise of indexing.

After publishing, use Search Console URL Inspection / Test live URL on home, AMOLED and a few reviewed details. Confirm the rendered text, links and Google-selected canonical. Submit the revised root sitemap once, then request indexing for a small representative set. Do not request all pages repeatedly or use the Removals tool for unlisted pages. Crawling may take days to weeks, and a successful live test does not guarantee indexing.

Before requesting AdSense review again, verify the published version, the root `ads.txt` entry against your account, the absence of intrusive overlays/push prompts, usable mobile pages, and the content/rights of the collection. Give crawlers time to see the substantive changes. There is no guaranteed waiting period or required number of indexed pages that this refactor can establish.

Official guidance:

- [Helpful, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Sitemap inclusion and truthful modification dates](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Requesting recrawls](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Pages ready for AdSense](https://support.google.com/adsense/answer/7299563)
- [Ads.txt setup](https://support.google.com/adsense/answer/12171612)
