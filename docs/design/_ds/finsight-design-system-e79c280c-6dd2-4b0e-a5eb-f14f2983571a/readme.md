# Finsight Design System

## Context
Finsight's system is an editorial retail language: photography speaks, the chrome doesn't. Pages stack like a printed catalog — campaign hero, product grid, sport rail, category strip, footer — with towering uppercase display headlines burned into full-bleed imagery and everything else reduced to neutral type and pill geometry on white and soft-cloud grey.

**Sources.** The only input was a written design specification (pasted text, "Create design system" brief) describing tokens, typography, components, breakpoints and do/don'ts for a retail web surface: home, listing (PLP), product detail (PDP) and membership pages. No codebase, Figma file, logo, fonts, icons or photography were provided. Brand-specific names in the brief were not carried over; the system is branded only as **finsight**.

**Products represented.** One surface: the retail website (`ui_kits/website`).

## Index
- `styles.css` — entry point (imports only) → `tokens/` (`fonts`, `colors`, `typography`, `spacing`, `radii`, `elevation`, `motion`, `base`)
- `components/` — React primitives (see below), each with `.jsx`, `.d.ts`, `.prompt.md`, one `*.card.html` per folder
- `guidelines/` — foundation specimen cards (colors, type, spacing, radii, elevation, states, brand)
- `ui_kits/website/` — click-through recreation: home, listing, detail, membership
- `thumbnail.html` — project tile · `SKILL.md` — agent skill entry
- `assets/` — intentionally empty: no logo, imagery or icon files were supplied

## Components
- **core/** — Icon, Button, IconButton, Badge, SwatchDot, PriceRow
- **filters/** — FilterChip, FilterSidebar
- **forms/** — SearchPill
- **cards/** — ProductCard, CampaignTile, CategoryIconCard, MemberBenefitCard
- **navigation/** — UtilityBar, PrimaryNav, NavDrawer, SubNav, Footer
- **disclosure/** — DisclosureRow (pdp + faq variants)

Spec mapping: button-primary / secondary / outline-on-image → `Button variant`; button-icon-circular → IconButton; filter-chip(-active) → FilterChip; search-pill(-focused) → SearchPill; badge-promo → Badge; badge-sale-text → PriceRow; swatch-dot(-active) → SwatchDot; pdp-disclosure-row + faq-row → DisclosureRow; Top Nav (Mobile) drawer → NavDrawer.

**Intentional additions**
- `Icon` — wrapper for the Lucide CDN glyphs that substitute for the missing icon set.
- `PriceRow` — packages the price-row rules (regular / sale / strike / % off) used by cards and detail pages.

## Content fundamentals
- **Voice:** short, declarative, imperative. Second person implied, rarely stated ("Become a Member for the best products…"). No "we" in chrome.
- **Casing:** Title Case for nav, buttons and section headers ("Trending Now", "Shop by Sport", "Add to Bag", "Hide Filters"). UPPERCASE only in display campaign headlines (set via `text-transform`, write copy in sentence case).
- **CTAs:** one or two words — Shop, Buy, Join Us, Sign In, Notify Me, Explore, Continue.
- **Product metadata:** name → category subtitle ("Men's Trail Running Shoes") → color count ("3 Colors") → price. Sale: "$97.97 $140 30% off".
- **Badges:** Just In, Coming Soon, Recycled Materials, Member Exclusive.
- **Counts** in parentheses: "Reviews (128)", "Trail Shoes (24)".
- **No emoji**, no exclamation marks in chrome, no decorative unicode. Separators are " / " (breadcrumbs) and "|" (utility bar).

## Visual foundations
- **Color:** ink `#111111` + white + soft-cloud `#f5f5f5` carry ~95% of chrome. Sale red appears only in price rows. Success/info are signals, not decoration. Category accents (pink, purple, teal) are swatch dots and soft tile fills only — never text or CTAs. Primary CTA is always true ink, never charcoal.
- **Type:** extreme contrast — one 96px/0.9 uppercase display tier for campaign heroes (64px tablet, 48px mobile) and a quiet 12–16px Medium tier for everything else; 32px and 24px headings in between. Letter-spacing 0.
- **Spacing:** 8px base (2/4/8/12/18/24/30/48). Section rhythm 48px → 32px tablet → 24px mobile. Grid gutters 8px (4px mobile). Content max ~1440px; gutters grow to 80px at 1920+.
- **Backgrounds:** white pages; soft-cloud is the "studio" behind every product photo. Full-bleed cinematic photography for campaigns. No gradients, patterns, textures or illustrations-as-backgrounds.
- **Imagery:** product 1:1 (4:5 tall crops) on flat soft-cloud; campaign 16:9 desktop → 4:5 mobile art-direction; sport rail 4:5. Depth comes from photography only.
- **Corners:** containers, cards, images, nav, footer are square (0). Every CTA is a 30px pill; search 24px; icon buttons and swatches fully round; 18px only for avatar/icon containers.
- **Cards:** no radius, no shadow, no border, no internal padding. Metadata sits directly below the image at 8px rhythm.
- **Borders & elevation:** no drop shadows anywhere. 1px `#cacacb` hairlines divide filter groups, footer and disclosure rows; sticky bars get `inset 0 -1px 0 #e5e5e5`.
- **Focus:** search pill flips to white with a 2px ink border and a 12px soft-cloud halo.
- **Hover:** not documented by the source. Components ship without hover styling; links darken to charcoal.
- **Press:** primary pills collapse to `scale(0.5)` + `opacity 0.5` (spec'd "tap collapse"); icon buttons drop to 50% opacity.
- **Selection:** filter chips invert fully to ink; swatches get a concentric 2px white + 2px ink ring with no size change; active nav gets a 2px ink underline.
- **Motion:** minimal — 150–300ms standard ease for press, chevron rotation and drawer slide. No bounces, no scroll-triggered animation.
- **Transparency/blur:** none, except the 40% ink scrim behind the mobile drawer (an addition; not in the source).
- **Layout:** utility bar (36px) + primary nav (60px) on top; listing sub-nav may stick with inset hairline. One campaign tile per row; alternate with 2-/3-/4-up grids.

## Iconography
- No icon files were supplied. **Substitution:** [Lucide](https://lucide.dev) via `lucide-static@0.460.0` on unpkg, rendered as a CSS mask so glyphs inherit `currentColor` (`<Icon name="search" />`). Lucide's 2px stroke is slightly heavier than a typical retail chrome set — replace with the real set when available.
- Icons used: search, heart, shopping-bag, menu, x, chevron-left/right/down, arrow-right, share, sliders-horizontal, plus category glyphs (shirt, footprints, backpack, watch) standing in for category illustrations.
- Icon-only controls sit in 40px circles (IconButton). No emoji; no unicode glyphs as icons.

## Brand mark
No logo was provided. The name **finsight** is set in Inter 700, lowercase, −0.03em, wherever a mark would go. Do not draw a logo.

## Fonts — substitutions
The source specifies proprietary faces (a geometric display face and Helvetica Now Display/Text). Substitutes per the brief, loaded from Google Fonts:
- Display campaign → **Bebas Neue** (400 only; the spec's 500 weight is not available)
- Headings / UI / body → **Inter** 400 / 500 / 700
- Legal 9px row → Helvetica Neue system stack
Supply licensed font files to replace these.
