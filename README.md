# PMW Visuals

PMW Visuals is a browser-based design and wallpaper site. Use PMW Creative to customize a template or start from a blank canvas, browse phone and desktop wallpapers, or use the image tools to resize, convert, and compress files.

[Live site](https://pmwvisuals.com/) · [Editor](https://pmwvisuals.com/editor/) · [Templates](https://pmwvisuals.com/templates/) · [Wallpaper collections](https://pmwvisuals.com/wallpapers/) · [Image tools](https://pmwvisuals.com/tools/)

## What you can do

- **Design in the browser.** Edit text, photos, shapes, backgrounds, and layers. Export PNG, JPG, or WebP, or download an editable `.pmw` project file. The editor saves projects in the current browser.
- **Browse wallpapers.** Search and filter the gallery by device, category, and style. Open a wallpaper to preview it, download it, or start a design in a preset format.
- **Prepare images.** Resize, convert, or compress files with dedicated image tools.

## Run locally

Use Node.js 24, the version used by this repository’s checks. The static frontend needs no package installation or build step.

```sh
git clone https://github.com/pmwvisuals/pmwvisuals.github.io.git
cd pmwvisuals.github.io
node scripts/serve-creative-preview.mjs
```

Open [http://127.0.0.1:8767/](http://127.0.0.1:8767/) for the homepage or [start a blank design](http://127.0.0.1:8767/editor/?blank=1). Set the `PORT` environment variable before starting the server if port 8767 is in use.

Local photo editing, project storage, and export work without a backend. Wallpaper originals can depend on external image hosts. To run your own account, premium download, or checkout services, configure your own Firebase, Cloudflare Worker, and Paddle environments as applicable. See the [premium setup notes](docs/premium-phase-2-setup.md) and [Paddle fulfillment notes](docs/paddle-fulfillment.md).

## Repository map

| Path | Contents |
| --- | --- |
| `index.html`, `wallpapers/` | Homepage gallery, collection guides, and individual artwork pages |
| `editor/`, `templates/`, `my-designs/`, `js/creative/` | Editor, templates, and local project storage |
| `tools/` | Image tools |
| `functions/`, `backend/paddle-worker/` | Firebase Functions and the Paddle fulfillment worker |
| `scripts/`, `docs/` | Catalog generators, checks, and maintenance notes |

## Contributing

Open an issue or submit a pull request with a description of the change and steps to test it. Include screenshots for visual changes. For gallery changes, keep existing artwork URLs and original download destinations intact. See the [editor notes](docs/creative-editor.md) and [editorial maintenance guide](docs/editorial-maintenance.md).

Run the core checks from the repository root:

```sh
node --test --test-isolation=none scripts/test-creative-model.mjs scripts/test-wallpaper-model.mjs
node scripts/verify-navigation.mjs
node scripts/verify-appearance.mjs
```

The [wallpaper card checks workflow](.github/workflows/wallpaper-card-checks.yml) also runs Playwright tests for the gallery and editor. Updates to `main` trigger the [GitHub Pages deployment](.github/workflows/static.yml).

## License

The [MIT License](LICENSE) applies to source code and developer documentation authored by PMW Visuals. You may use, modify, and redistribute that software, including commercially, as long as you retain the copyright and license notice.

PMW wallpaper images and their thumbnails, template and sample artwork and previews, and PMW logos and brand assets are excluded from the MIT grant, including when embedded in source files. PMW artwork remains subject to the [site’s image license](https://pmwvisuals.com/license.html) and any terms stated on the relevant artwork page. Replace restricted artwork and branding when distributing your own version unless you have permission to include them.

Third-party code and assets retain their original licenses. This includes bundled dependencies under `vendor/`, such as [Fabric.js](vendor/fabric/LICENSE) and FFmpeg components.
