# Left-side navigation and uploaded logo — 6 October 2026

The two primary header buttons are replaced by a Menu button on the left.
It opens a native dialog styled as a left-hand drawer. Wallpapers and Tools
are the first two destinations, with larger text, icons and gold-accented
cards. Supporting links include collections, the three tools, plans, account,
sign-in and legal information. Studio and the separate desktop page are not
reintroduced.

The drawer stays white in both light and dark mode, as requested. Escape,
the close button and clicking outside the drawer dismiss it. Native modal
focus behavior keeps keyboard navigation inside the open drawer. The header
remains available while its contents scroll. The current major section has an
additional highlight.

The uploaded PNG is copied unchanged to `assets/brand/pmw-visuals-logo.png`.
Its SHA-256 matches the supplied original:
`BB062BEE4F05C51D159787BEADA60800DC662AB4AC05FDC55EA8E4A8FB45F9E1`.
The dark transparent artwork uses a light badge for contrast in either theme.
Visible wordmarks in active headers and the footer are replaced; existing
favicon, avatar images and social-preview metadata are not rewritten.

The Free/Premium dropdown is removed from the gallery, including its obsolete
event handler and state. Category, device, style and search remain. Removing
the filter does not change account access or download permissions.

`scripts/theme/navigation.mjs` owns the markup and filter removal. It is used
by the shared appearance transform and existing generators, so rebuilding
does not restore the old header/filter. `js/site-navigation.js` handles the
drawer and `css/site-navigation.css` controls layout and logo placement.

```sh
node scripts/update-appearance.mjs
node scripts/verify-navigation.mjs
```

Visual checks cover desktop/mobile headers and the drawer, including a dark
page with the always-white drawer. Menu navigation to Tools, Escape/Close,
remaining gallery controls and the uploaded logo were checked. No file
conversion tests were run. Screenshots remain outside the deployed repository
in `audit/tools-editorial-20261006`.
