# PMW Tools editorial redesign — 6 October 2026

## Scope

The existing `/tools/image-compressor/`, `/tools/image-resizer/` and
`/tools/image-converter/` pages now combine their existing processing workspaces
with substantial, tool-specific guides. `/tools/` has a smaller tool-selection
section and an image-workflow introduction. No alternative `/tool/` route was
created. The earlier uncommitted wallpaper editorial work remains intact.

The user requested long, visually varied pages and then explicitly asked that
the remaining work focus on design/content rather than more functional tests.
The final pass used screenshot/layout inspection and static source/link checks,
not additional uploaded-file processing.

## Content and graphics

- Compressor: a four-step workflow, local JPEG quality example, starting
  settings, format comparison, use cases, illustrative size budget, detail
  inspection checklist, second-attempt decisions and six FAQs.
- Resizer: workflow, aspect-ratio calculator, proportion/stretch comparison,
  preset guide, export considerations, worked pixel-count diagram/table,
  destination planning, inspection checklist and six FAQs.
- Converter: workflow, format finder, image/video/audio output tables,
  quality trade-offs, export checklist, container/codec track diagram,
  three practical conversion routes, misconceptions and seven FAQs.
- Hub: concise explanations of which tool changes formats, dimensions or
  file size, links to the relevant guides and an original-first workflow.

The hero illustrations are self-contained SVGs. Editorial diagrams use native
HTML/CSS with text labels. Local alpine preview artwork is reused rather than
adding large raster assets. Examples do not claim guaranteed compression
savings, universal codec compatibility or an AdSense approval word threshold.

The initial redesign retained the existing dark styling. The subsequent
standard-light implementation now supplies both themes, including matched
SVG illustrations; see `docs/site-appearance.md`. The footer, tool URLs,
canonical links, existing control IDs, consent defaults and GA4 ID are retained.
Guide text is in the initial HTML; JavaScript is needed only for the tool and
interactive examples. Existing old section fragments remain as aliases.

## Maintenance

Edit `scripts/tool-guides/content.mjs` for guide content and
`css/tool-guides.css` for styling. The shared example helpers live in
`js/tool-guides.js`. Build the four existing pages with:

```sh
node scripts/build-tool-guides.mjs
```

The builder checks preservation of the existing controls and updates only its
owned guide/hero markup and relevant metadata. Repeat builds are idempotent.
Static checks for local assets, metadata, fragments and control IDs are:

```sh
node scripts/verify-tool-guides.mjs
```

Copy about dimensions, formats, limits and codecs must follow the shipped
`js/pmw-tools.js` and `js/pmw-converter.js` implementations. In particular:
compression can downscale; resize presets can stretch; image-mode GIF exports
one frame; video-mode GIF has no audio; format conversion cannot reconstruct
discarded source detail. Ordinary library/analytics requests occur even though
file contents are processed locally.

## Visual review

Saved screenshots were inspected at desktop 1440 × 1000, mobile 390 × 844
and selected tablet views at 768 × 1024. The four pages had no horizontal
page overflow in the reviewed desktop/mobile layouts. Comparison tables
intentionally scroll inside their own regions and show a mobile scroll hint.
Cards and helpers stack, and larger editorial graphics precede their text on
smaller screens. This review is not a claim of complete accessibility coverage.

Screenshots live outside the published repository, in the workspace audit
folder `audit/tools-editorial-20261006`. The changes remain local until the
user requests a commit/push.
