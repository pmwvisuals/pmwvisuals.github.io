# Standard light appearance — 6 October 2026

Light mode is now the default when there is no valid stored preference. An
existing explicit dark preference is respected. The operating system's dark
setting does not override the standard light default.

## Coverage

- Main wallpaper page, including hero CTA, introduction, gallery and filters.
- Wallpaper collection hubs, directory and individual artwork pages.
- Tools hub, compressor, resizer and image/video/audio converter.
- Their guide cards, controls, diagrams, navigation, account menus and footer.
- The existing profile preference continues using the same shared theme API.
- Premium wallpaper-library colors follow the choice; subscription/billing
  logic has not been changed or tested as part of this design task.

Studio, administration, premium-plan pricing and legal pages are not given a
new light design. The existing legacy wallpaper redirect remains a redirect.

## Theme selection

`js/pmw-theme.js` applies the initial theme early in the document. The shared
`pmw_theme_preference` localStorage key, `PMWTheme` API and `pmw:themechange`
event remain compatible with the existing profile preference.

`js/theme-chooser.js` adds a native modal dialog on first entry to a themed
page if there is no valid stored preference. Radio choices preview the theme.
Continue saves the choice. Closing the first prompt continues in the default
light mode; cancelling a later preview restores the previous choice.

The persistent Appearance button opens the same dialog. On mobile it is a
compact half-light/half-dark icon with an accessible label. Its position accounts
for the existing cookie banner's height. Theme selection does not grant analytics
consent, upload a file, clear an upload queue or alter account permissions.

Storage events synchronize preferences across tabs. If storage is blocked,
theme changes still work for the current page and the dialog explains that the
choice cannot be remembered.

## Files and builds

- `css/site-appearance.css`: light overrides and shared picker styling.
- `js/theme-chooser.js`: first-visit prompt, previews and persistent button.
- `js/pmw-theme.js`: early theme application and saved preference.
- `scripts/theme/markup.mjs`: shared initial-light markup, CSS/script inclusion
  and cache version used by the existing page generators.
- `scripts/update-appearance.mjs`: apply those includes to the existing pages.
- `scripts/build-tool-guides.mjs`: generates matching light/dark native SVG
  hero illustrations, selected by the current theme's CSS.

```sh
node scripts/build-tool-guides.mjs
node scripts/update-appearance.mjs
node scripts/verify-appearance.mjs
```

The editorial and gallery generators also preserve the appearance includes.
Original wallpaper files, detail URLs, download destinations, filtering and
tool-processing algorithms are unchanged by this work.

## Verification

Saved screenshots were inspected at 1440 × 1000 and 390 × 844, covering the
wallpaper hero/gallery, tools hub, all three tool heroes/workspaces, guide
diagrams, footer, theme chooser and selected collection/detail views. Optional
dark mode was inspected on desktop and mobile. The reviewed main wallpaper and
tool pages had no horizontal page overflow at those sizes.

Browser checks confirmed first-visit light selection, preview, confirmation,
saved preferences between pages, no repeated prompt after confirmation, and
restoration after Escape/Close. Native dialog behavior provides focus trapping
and radio-keyboard interaction. This is not a claim of a complete accessibility
audit.

Runtime checks cover default/invalid preferences, explicit dark, non-persisted
preview, confirmation, the existing profile toggle, cross-tab synchronization
and blocked-storage behavior. Source checks cover the 1,520 scoped pages and
the new diagrams. Existing editorial baseline checks still preserve all mapped
wallpaper URLs and original download destinations. No file-processing tests
were run, following the user's design-only instruction.

Screenshots are kept outside the deployed repository in the workspace audit
folder `audit/tools-editorial-20261006`. This work remains local until the user
requests a commit/push.
