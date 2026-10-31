# PMW Create — first release

The creative platform adds a template library, a shared image editor, and projects saved on the visitor's device. It runs as static files on the existing GitHub Pages site. Image editing and export do not require Firebase, Cloud Functions, a paid API, or a server upload.

## Visitor entry points

- `/templates/`: 16 editable designs, category filters, and text search.
- `/editor/`: a starting template; `?blank=1` opens a blank canvas and `?template=make-something` opens a named template.
- `/my-designs/`: locally saved projects, duplication, deletion, and project-file import.
- The homepage, Tools page, shared navigation, footer, and wallpaper customization panel link into the creative workflow.

## Editor behavior

Text, shapes, and images remain individual layers. The workspace supports image replacement, proportional resizing, frame cropping with horizontal/vertical focus, rotation, flipping, text styling, layer ordering, locking/hiding, undo/redo, and canvas alignment. Backgrounds provide solid colors, gradients, orbits, waves, grids, and optional grain. Desktop organizer areas are artwork in the exported wallpaper, not operating-system folders.

Changing the canvas uses proportional fit or fill. It does not stretch photos or claim to automatically redesign text for another platform. PNG, JPG, and WebP exports use the full canvas dimensions, independent of the zoom used in the editor. PNG/WebP can omit background layers for transparency; JPG composites transparent areas over white. The user's source image is retained at its original resolution. An enlarged export does not create new photo detail.

The starter collection contains four thumbnail layouts, four collages, four desktop organizers, and four backgrounds. Placeholder landscapes are original geometric illustrations, replaceable with user photos. System fonts avoid an external font request. Fabric 6.7.1 is pinned and served locally, with its MIT license in `vendor/fabric/`.

## Project storage and file format

IndexedDB database `pmw-creative-projects` stores projects under independent IDs. The editor URL changes to a project ID after a successful save, allowing reload recovery. Save failure is visible, and a new design cannot replace the current one through the switch dialog until it has been saved.

Portable `.pmw` files are JSON: format `pmw-design`, version `1`, dimensions, title, background settings, a Fabric scene, and an embedded image-asset dictionary. Scene image sources are asset references rather than repeated image data. Imports validate dimensions, supported layer types, and embedded PNG/JPG/WebP images. They reject remote image URLs, arbitrary nested objects, unsupported versions, and oversized projects. Opening a portable file creates an independent project ID.

Projects are local to the browser and device; this is not account-based cloud storage. Clearing site data removes them. Downloaded project files retain the embedded images and can be opened on another device.

Limits: 64–8192 pixels per canvas side, at most 16,777,216 output pixels; image input up to 25 MB and 50 megapixels. Project imports allow at most 250 scene objects and about 60 MB of embedded image data. These are browser-resource bounds, not paid-plan limits.

## Wallpaper originals

The shared customization panel passes the wallpaper's original download source, title, and ID. The editor accepts same-origin originals and the existing Drive/Google image and Cloudinary hosts. It does not silently use a low-resolution gallery thumbnail. If the original host blocks browser access or returns a non-image response, the editor offers an original-file upload. This does not use a proxy or change the existing download system.

Existing wallpaper licensing has not changed. Publishing or commercial reuse permissions for the existing artwork need a separate owner decision; the editor does not grant rights to uploaded images.

## Preview and verification

Run from the repository root with Node:

```text
node scripts/serve-creative-preview.mjs
```

Open `http://127.0.0.1:8767/templates/` or `/editor/`. Set `PORT` if that port is already in use.

Pure behavior checks:

```text
node --test --test-isolation=none scripts/test-creative-model.mjs
```

Browser checks use a development installation of Playwright; it is not shipped to visitors. With the preview server running:

```text
node scripts/verify-creative-browser.cjs
```

Optional environment variables: `PMW_PLAYWRIGHT_MODULE` for an existing Playwright module, `PMW_BROWSER_EXECUTABLE` for a browser executable, `PMW_PREVIEW_URL`, and `PMW_QA_DIR`. Exports and screenshots default to the ignored `work/creative-qa/` directory.

The browser checks cover all templates, search/filtering, text edits, duplication and history, original-photo replacement, ratio changes, image exports, project portability to a fresh browser, local recovery, background controls, mobile editing, dark mode, and the white navigation drawer.

Verified locally on 2026-10-31 in headless Microsoft Edge (Chromium), at 1440-pixel desktop and 390-pixel mobile viewports: all listed workflows passed with no page runtime errors. The three pure model tests also passed. Additional checks covered rejected-image recovery, layer locking/hiding, original-wallpaper import failure messaging, homepage/Tools entry links, mobile overflow, and idempotent homepage regeneration. Screenshots of the library, editor, theme variants, mobile controls, and example collections were visually inspected. Safari and Firefox have not been exercised in this environment.

## Maintaining the entry points

`node scripts/build-creative-entry.mjs` regenerates template preview SVGs and updates the homepage and Tools entry sections. The editorial generator calls the same homepage integration function so editorial refreshes retain the creative entry points. No existing URL or indexing rule is removed. The sitemap adds the template library and editor.

The first release uses local projects and image exports. Cloud synchronization, live collaboration, video editing, and paid AI features are outside this implementation. Review the local editor and screenshots before merging into `main`, because that branch triggers the existing GitHub Pages deployment.
