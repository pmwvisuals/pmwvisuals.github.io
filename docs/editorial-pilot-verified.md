# Pilot verified — 6 October 2026

The homepage, AMOLED collection and ten detail pages were built before scaling.

1. **Homepage / collection entry — passed.** Static collection links, starting selections, atmosphere links and screen-fit/AMOLED guidance exist in source HTML. The misleading third-party overlay captured in the baseline disappeared after its include was removed. Existing filter/gallery logic remains; the desktop toggle renders 24 initial cards.
2. **AMOLED guide — passed.** Screenshot inspection of the dark desktop layout and the 390px mobile layout shows a readable hero, artwork, collection navigation and guidance. A progressive-loader wrapper initially darkened the caption in light mode; a separate image wrapper fixed that.
3. **Portrait detail — passed.** Sunlit Alpine Creek keeps the old `sunlit-forest-creek.html` URL and original download destination. The source title was corrected after inspecting the image. On narrow screens, the heading/description precede the artwork. The browser confirms the download button is enabled.
4. **Landscape detail — passed with an external-host limitation.** Velvet Waves keeps its original Cloudinary attachment link and tracking listener. Its preview loaded and its layout fit 390px. An attempted original download timed out in the test browser; this is not reported as a verified external-host download. No destination was changed to address that timeout.
5. **Preservation and static validation — passed.** `node scripts/verify-editorial.mjs --pilot --baseline ../../audit/editorial-20261006/url-baseline.json` checked 12 pilot surfaces and the preservation manifest for all 1,504 mapped detail URLs. Canonicals, paths, IDs and original downloads match the baseline. JSON-LD, local files, links, consent and tracking hooks pass.

The accepted screenshots are stored outside the deployed repository in `../../audit/editorial-20261006/`. Key captures: `09-pilot-amoled-fixed.jpg`, `11-pilot-amoled-dark-desktop.jpg`, `18-pilot-amoled-mobile.jpg`, `19-pilot-nature-mobile.jpg`, `20-pilot-home-mobile.jpg`. Earlier captures labeled mobile but still measuring 1280px were rejected as mobile evidence; the accepted 390px captures include DOM width checks.

Screenshots establish layout/contrast evidence, not complete accessibility compliance. Login-required saves and real paid checkout are outside this editorial refactor. Full-original availability on third-party hosts remains separate from the static site link checks.
