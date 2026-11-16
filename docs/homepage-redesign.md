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

The approved homepage has a full-width cinematic forest-green hero. Creative copy and editor/template links sit on the left; three staggered perspective panels on the right lead to PMW Creative, PMW Wallpapers and PMW Tools. The wallpaper gallery follows directly. Mobile stacks the copy and compact panels without horizontal overflow.

Creative links to the existing editor. Wallpapers jumps to the gallery, and Tools opens the tools directory. Phone and desktop shortcuts retain the existing gallery filters. The hero uses CSS lighting, contour lines and small dimensional glyphs instead of a background photograph.

The full-width navigation uses a sage gradient, emerald menu button and matching profile control. The hero, navigation, drawer and account popover retain their authored colors and typography in both themes; the gallery still follows the selected theme. Existing fonts and native links are retained. Reduced-motion preferences disable panel transitions.

The navigation drawer opens on every homepage arrival and reload, with close-button, Escape, backdrop and link dismissal. Closing restores scrolling and focus. Other pages retain their normal closed-by-default navigation. Existing artwork URLs, original download destinations, premium access, gallery actions and About content are retained. No new raster assets are required.

Browser validation covers keyboard navigation, destination links, gallery search and device filtering, 320–1920px layouts, header alignment, automatic menu opening and dismissal, fixed palettes across themes, account popover and reduced motion. Generation remains repeatable.

Approved for publication after local visual review on design/creative-hub-home.
