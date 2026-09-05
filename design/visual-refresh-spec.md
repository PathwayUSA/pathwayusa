# Visual refresh — PathwayUSA

A design-token pass, not a rebuild. Screen structure, navigation, and content stay exactly as they are. What changes is typography, color depth, spacing, and card treatment.

## Hard constraints — read first

**Do not copy any content from the reference designs.** The reference is a Figma Make generation full of fabricated providers, fake attorneys, invented clients, and placeholder phone numbers. We removed exactly this category of content from the app in an earlier phase. Take the visual language only.

**Do not change layouts to multi-column.** The reference is a desktop web layout. Every screen here is a ~380px phone. Five tiles across becomes two. Three cards across becomes a vertical stack. If a change only looks good at desktop width, it doesn't ship.

**Do not reduce accessibility.** Icons stay paired with text labels. Status is never conveyed by color alone. Touch targets stay at current size or larger. Contrast ratios must hold — check any text placed on a gradient.

**Keep the semantic color system from the earlier phase.** Teal is progress, amber is time-sensitive, red is errors and destructive actions only. This refresh adds visual weight; it does not reintroduce decorative color.

## 1. Typography — the biggest single change

The current app reads flat because headings are barely heavier than body text. Establish a real scale with a display face.

- Add one display typeface for headings only. Something geometric with a heavy weight available — the reference uses that kind of face at very large sizes with tight letter-spacing. Body text stays on the current sans for legibility.
- Screen titles: large and heavy. Roughly 30–34px at weight 700–800, letter-spacing around -0.02em. The reference gets its confidence almost entirely from this.
- Section headings: ~20px, weight 700.
- Body: unchanged size, unchanged weight. Do not make body text heavier — the contrast between heavy headings and normal body is what creates the effect.
- Line height on large headings drops to ~1.1. Tight headings, loose body.

Tell me which typeface you propose and confirm it loads correctly on web before applying it everywhere.

## 2. Hero treatment

Build one reusable hero component and use it at the top of Home, Study, Path, Documents, and Help.

- Deep teal-to-navy gradient background, bridging our existing brand colors rather than introducing new ones.
- Optional very low-contrast pattern overlay. Subtle enough that text contrast is unaffected — if it reads as texture rather than decoration, it's right.
- An amber accent pill above the heading for context ("Step 3 of 11", "Today", "Free · unlimited practice"). Small caps, ~11px, letter-spacing ~0.08em.
- Large display heading below, white.
- One line of supporting copy in a lighter tint.
- Hero content is left-aligned, not centered.

The existing navy header becomes this component. Same information, more presence.

## 3. Cards

Current cards are flat white rectangles with hairline borders. Give them depth.

- Soft shadow instead of border. Low opacity, generous blur, small vertical offset — the goal is separation from the background, not a visible drop shadow.
- Corner radius up to 16px from the current 12px.
- More internal padding — roughly 20px instead of 14px.
- Page background stays a light warm neutral so white cards read as raised.

## 4. Icon chips

Where icons currently sit bare in list rows, wrap them in a soft tinted square — rounded ~12px, tinted background from the same family as the icon color, icon centered. This is the single cheapest change that adds polish, and it's already the pattern on the app's tile grid.

Apply to: list row leading icons, resource category entries, and step markers.

## 5. Section headers

Add a short vertical accent bar before section headings — a few px wide, full text height, in teal. Small detail, and it gives long scrolling screens rhythm.

## 6. Buttons

- Primary buttons become fully rounded pills rather than 10px radius.
- Increase vertical padding slightly.
- Keep exactly one primary button per screen. Everything else is secondary or a plain row.

## 7. Photography — optional, later

The reference uses real photos in its event cards. If we ever add imagery, it must be properly licensed stock and must depict something the app actually offers. Do not add decorative photography to fill space, and do not add it in this pass.

## What I am not asking for

- The percentage-based "integration milestone" scoring from the reference. Scoring someone's social integration as a percentage is condescending to this audience.
- The AI assistant panel in the legal portal.
- Multi-column grids.
- Any content, names, ratings, or phone numbers from the reference screens.

## Order of work

1. Typography scale first, applied globally. Report back with a screenshot before continuing — this alone changes the feel of every screen and I want to see it before more changes land.
2. Hero component, applied to the five main screens.
3. Card elevation and radius, globally.
4. Icon chips.
5. Section header accents and button shape.

Commit after each step. Build must pass on both web and iOS exports at every stage.

## Report

For each step: files changed, whether any new dependency was added, whether contrast ratios still pass on text over the gradient, and confirmation that no touch target shrank.
