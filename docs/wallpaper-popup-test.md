# Temporary wallpaper popup test

Wallpaper links open their existing full page in a modal. The original HTML,
canonical URLs, download checks, studio, descriptions, and sitemap are preserved.
The modal does not recreate or shorten the page content. Related wallpaper links
stay in the modal; editor, account, and collection links navigate normally.
Ctrl/Cmd-click, middle-click, and opening a link in a new tab retain normal behavior.

To restore separate-page browsing site-wide, change `WALLPAPER_VIEW` from `'popup'`
to `'page'` in `js/wallpaper-view-config.js` and deploy that change.

For a single visit, compare `/?wallpaperView=popup#latest-wallpapers` with
`/?wallpaperView=page#latest-wallpapers`. There is no saved preference to clear.
Direct wallpaper URLs continue to work in both modes.

Run `node scripts/verify-wallpaper-popup.cjs` using the same Playwright environment
as the other browser checks. No pages need deleting or regenerating for this test.
