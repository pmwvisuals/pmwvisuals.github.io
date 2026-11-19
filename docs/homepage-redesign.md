# PMW homepage research and redesign plan

Reviewed 15 November 2026. This is an information-architecture and content review of ten related public sites, not an exhaustive visual or accessibility audit. No competitor artwork, branding, copy, testimonials or performance statistics are used in PMW.

| Site | Relevant observation | PMW design decision |
| --- | --- | --- |
| [Unsplash](https://unsplash.com/) | Image search, topic links and a visible image collection support browsing. | Keep a strong wallpaper showcase and the existing searchable gallery. |
| [Pexels](https://www.pexels.com/) | Media choices, search and suggested subjects make the catalogue approachable. | Offer clear task routes rather than a wall of explanatory text. |
| [Canva](https://www.canva.com/) | The entry proposition is creating a design, with multiple output categories. | Present PMW as a creative destination before the full wallpaper feed. |
| [Adobe Express](https://www.adobe.com/express/) | Creation formats and quick image actions are distinct routes. | Show templates, editor and quick tools together beneath the artwork. |
| [Freepik / Magnific](https://www.magnific.com/) | Freepik redirected here during review; the destination separates creative tools, workflows and stock resources. | Explain PMW's existing capabilities through task choices; do not invent AI features. |
| [WallpapersCraft](https://wallpaperscraft.com/) | Category, screen resolution and sorting controls sit close to the imagery. | Retain PMW's working filters and orientation controls within the gallery. |
| [Zedge](https://www.zedge.net/) | Personalization is a clear purpose, with visual examples and content categories. | Lead with real artwork and provide phone and desktop shortcuts. |
| [Pixabay](https://pixabay.com/) | Search, media categories and curated collections coexist. | Use a curated collection row to introduce the full library. |
| [Fotor](https://www.fotor.com/) | Editing tasks and design formats link into concrete tool workflows. | Route tool choices directly to PMW's existing resizer, converter and compressor. |
| [Pixlr](https://pixlr.com/) | Product entry points distinguish editing and related image tasks. | Give visitors an immediate editor action and recognizable task labels. |

WallpaperAccess, Coolors and VistaCreate were also attempted but blocked during this review, so they are not counted among the ten reviewed sites.

## Current implementation

The selected Showcase layout uses a centered headline, black-and-gold palette and a full-screen hero. Three cards have distinct roles: Wallpapers on the left, the largest Creative editing example in the middle, and Tools on the right. The existing searchable wallpaper gallery starts below the hero.

The sidebar trigger is at the top-left before the brand, the hero label reads PMW Visuals, and the Creative action buttons have larger text and touch targets. The two side cards are enlarged and share equal widths and heights at every breakpoint. The headline button row and bottom product strip are removed. Open Creative and Browse templates overlay the editor image; the Wallpaper browsing action and Tools links stay inside their respective cards. Image links and overlay buttons are separate interactive elements, with no nested links.

The Wallpaper card uses a generated collage background with layered wallpaper cards and a live “Choose your wallpaper” heading; it leads to the gallery. The Creative card shows a polished full editor interface image derived from the actual editor screenshot, including its template library, text selection, typography controls and layers. It opens the demonstrated editable design at 1280 × 720. The Tools card adds a gold file illustration and individual action rows linking directly to the resizer, converter and compressor. The three product links remain visible in the top navigation; the compact menu button opens the full navigation on demand.

The hero, navigation, full menu and account controls retain their black-and-gold palette in both themes. The gallery follows the selected light/dark theme. Existing branding and fonts are retained. Narrow layouts preserve all three products, keyboard access and usable tool links. Short windows allow the hero to grow rather than clip content.

The editable example retains its text, decoration, source and size definitions in js/creative/showcase-designs.js. The editor embeds the original source in saved projects, preserves editable text, and reuses the existing crop/import/export flow. Failed imports disable downloading and preserve Retry and Upload original. Retry also restores the template text. Invalid showcase links cannot export an empty design. The homepage interface image is a marketing illustration; the editor retains its existing theme controls.

The original travel artwork is assets/home/somewhere-new.webp, generated with the built-in image tool and saved as WebP for delivery. It is separate from the public wallpaper catalog and image bridge. Existing artwork URLs, original downloads and premium access are unchanged.

Additional homepage artwork, created with the built-in image tool and saved as WebP: assets/home/wallpaper-mosaic.webp (a layered collection of varied wallpaper cards on black, with room for the live heading) and assets/home/creative-interface.webp (the actual editor screenshot reinterpreted in black and gold, preserving its supported editing features). The mosaic and interface total about 446 KB; the interface is preloaded and both are checked for successful decoding in browser verification.

Artwork prompt: A cinematic travel photograph of an ochre Moroccan adobe kasbah inspired by Ait Ben Haddou at golden hour, palm fronds and stone arches framing the edges, an unobstructed central village panorama and quiet peach sky, warm honey/bronze colors, natural editorial photographic detail. No text, logos, UI or people.

Verification covers responsive layouts from 320 to 1920px, full-screen hero coverage, product ordering and links, keyboard navigation, filtering, menu/profile controls, fixed theme palettes, reduced motion, editable Creative example, PNG dimensions, saved-project reopening, failed import recovery and repeatable generation.

Approved by the owner for publication after local visual review.
