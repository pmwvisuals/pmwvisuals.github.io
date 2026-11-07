# Wallpaper-to-design workflow

The homepage is now a hub. `/browse/` is the interactive gallery; `/wallpapers/`
remains the collection directory. Legacy gallery query links and the old mobile
and desktop entry pages forward to the new gallery without removing artwork URLs.

Wallpaper cards offer Formats and Preview. There are 14 named presets across
Instagram, Facebook, TikTok, YouTube, Pinterest, and phone/desktop wallpapers.
Reel and TikTok options create still images. A format opens
`/editor/?wallpaper=<catalog-id>&preset=<preset-id>`, loads the original, and
centers a proportional fill crop. Download PNG exports immediately; the adjacent
more button opens JPG/WebP and other export settings. Crops and original image
pixels remain editable. Enlarging an image does not add source detail.

The registry lives in `js/creative/presets.js`. Optional `wallpaperContext`
metadata survives local saves, history, and portable version-1 `.pmw` files.
Older project files remain supported. Failed original imports cannot export an
empty canvas; Retry and Upload original retain the selected canvas dimensions.

## Building and checking

Run from the repository root with Node 24:

```text
node scripts/build-wallpaper-workflow.mjs
node --test --test-isolation=none scripts/test-creative-model.mjs scripts/test-wallpaper-model.mjs
node --test backend/wallpaper-image-worker/src/index.test.mjs
node scripts/verify-editorial.mjs
node scripts/verify-navigation.mjs
node scripts/verify-appearance.mjs
```

The workflow builder generates the public editor catalog and Worker allowlist
from visible, nonpremium static records. Regenerate them after catalog changes.
Editorial and creative-entry rebuilds preserve the new homepage/gallery split.
Running the workflow builder twice with unchanged inputs must report zero
changes on the second run. Public catalog and bridge manifest IDs must match.

For browser checks, install Playwright and pngjs as development tools outside
the deployed site, start `node scripts/serve-creative-preview.mjs`, then run:

```text
node scripts/verify-wallpaper-workflow.cjs
node scripts/verify-creative-browser.cjs
```

Use `PMW_PLAYWRIGHT_MODULE` and `PMW_PNG_MODULE` for existing module paths,
`PMW_BROWSER_EXECUTABLE` for Chrome/Edge, `PMW_PREVIEW_URL`, and `PMW_QA_DIR` as
needed. Browser assertions inspect exact output dimensions and gradient pixels
for portrait, landscape, and square source crops. They also cover mobile,
previews, import recovery, and existing editor/project behavior.

Restricted Windows environments can use `PMW_INLINE_PREVIEW=1` with
`PMW_PREVIEW_URL=https://pmw.test`; Playwright then serves files from the checkout
through request interception. `PMW_BROWSER_PROFILE` puts the test profile in the
workspace. If native browser downloads are blocked, `PMW_CAPTURE_DOWNLOADS=1`
captures the real generated Blob and download filename through the click path
and writes its bytes for inspection. This verifies image generation but does
not verify the operating system's download dialog or file-saving behavior.

## Separate image Worker

`backend/wallpaper-image-worker` is isolated from Paddle and needs no billing,
Firebase, Google account, or private-image credentials. It serves only originals
whose IDs occur in its generated public manifest. No arbitrary URL parameter is
accepted, and dynamic premium artwork is excluded. It checks redirect hosts,
MIME types and file signatures, a 25 MB limit, and a 15-second timeout. Valid
images are cached for 24 hours. CORS origins include the production domains and
the standard local preview at port 8767.

Deploy using an authenticated Cloudflare session:

```text
cd backend/wallpaper-image-worker
npm install
npx wrangler login
npx wrangler deploy
```

Copy the actual returned HTTPS Worker origin into `IMAGE_BRIDGE_ORIGIN` in
`js/creative/image-config.js`; do not guess a workers.dev hostname. From the
repository root, verify the deployed service:

```text
node scripts/verify-wallpaper-originals.mjs --release
```

Both a real Drive original and a real Cloudinary original must pass. The
`/health` endpoint reports the public manifest count. Without `--release`, the
same check exercises the Worker handler locally against the live upstreams.
The deployed verification is a release gate before merging the frontend.

Until the bridge is configured, the editor uses the public original hosts
directly. Drive uses its original-download usercontent endpoint, never a
thumbnail. Once configured, Drive imports try the bridge first; Cloudinary uses
the bridge as a fallback. Host outages or quotas can still require Retry or
manual upload. Nothing migrates or duplicates the original collection.

## Access, rights, and rollout

Public wallpaper editing needs no account. Dynamic premium IDs require an
authenticated eligible account before their source is resolved. Existing plan
and billing behavior is preserved. Wallpaper-based designs may be shared in
personal, noncommercial social posts; business use and source resale or
redistribution still require permission. Uploaded material retains its owners'
rights.

Review the feature branch and browser QA artifacts, deploy and verify the
Worker, then merge the frontend. `main` still triggers GitHub Pages. Rollback is
a revert of the feature merge; the separate Worker does not alter Paddle or
existing original download URLs. AdSense approval is not implied by this release.
