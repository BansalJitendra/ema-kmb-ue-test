# Fix Savings-Account Product Cards Grid (render as cards, not a flat list)

## Problem
On the **savings-account** page, the product cards under the heading **"Types of Savings Accounts designed to meet your personalised goals"** render as a flat vertical stack of loose paragraphs/images/lists instead of a card grid.

**Root cause:** The autoblock builder `buildCardCatalog` in `scripts/scripts.js` only fires for headings listed in `CARD_CATALOG_HEADINGS` (currently only `"Types of Debit cards"` and `"Solutions built around your business"` — scripts.js:140‑143). The savings-account products heading is **not** in that list, so no `.card-catalog` block is built and the content stays as flat default content.

## Source Structure (from rendered DOM)
Under the "Types of Savings Accounts…" heading the content is:
1. **Filter UI** — `h5 "Choose a filter"` + `Reset` / `Apply` link paragraphs (NOT cards — must be excluded).
2. A flat run of **8 product cards**, each: two image `<p>`s (thumbnail + logo/offer), a title `<p>` (e.g. "811 Digital Bank Account"), optional meta `<p>`(s) (e.g. "Free Virtual Debit Card", "With amazing benefits!"), a bullets `<ul>`, and `Open Savings Account` / `Know More` link `<p>`s.
3. **Trailing junk** — three `"Add account for comparison"` paragraphs + a `"Close CompareCompare Saving Accounts"` paragraph.
4. Ends at the next `h2` ("Explore other savings account options…").

## Approach
Reuse the existing `buildOneCardCatalog` machinery (scripts.js:153) — it already groups loose paragraphs into cards on image‑`<p>` boundaries, drops compare junk via its `JUNK` regex, and emits a `.card-catalog` grid. Adjustments:

1. **Register the heading** — add `"Types of Savings Accounts designed to meet your personalised goals"` to `CARD_CATALOG_HEADINGS` (scripts.js:140) so `buildCardCatalog` runs on it.
2. **Exclude the filter UI** — the builder starts at `heading.nextElementSibling`, so the `Choose a filter` (`h5`), `Reset`, and `Apply` controls would currently be walked before the first image `<p>`. Since card grouping only begins once `cur` is set (first image `<p>`), confirm these leading non‑image nodes are skipped (they are not consumed/added because `cur` is null) — but they also won't be removed, so they'd remain above the grid. Decide: either (a) leave the filter line as plain text above the grid (acceptable, matches live which has a filter), or (b) strip `Choose a filter`/`Reset`/`Apply` if they look broken. Verify against live before removing.
3. **Compare junk** — the existing `JUNK` regex already matches `Add account for comparison` and `Close Compare…`; confirm they're stripped and don't leak into the last card.
4. The 8 cards each have **two** leading image `<p>`s (thumbnail + logo). `buildOneCardCatalog` keeps the first image and drops extra leading images (scripts.js:171‑175) — confirm the correct (thumbnail) image is the one kept; if the logo is first in DOM order, may need to pick the product thumbnail instead.

## Files
- `scripts/scripts.js` — `CARD_CATALOG_HEADINGS` (scripts.js:140); minor tweaks to `buildOneCardCatalog` only if filter UI or two‑image handling needs it.
- `blocks/card-catalog/card-catalog.css` — only if grid styling needs adjustment for this variant (verify first; do not change preemptively).

## Checklist
- [ ] Re-read `buildOneCardCatalog` against the savings products DOM to confirm grouping fits (8 cards, two leading images each, bullets, 2 CTAs)
- [ ] Add "Types of Savings Accounts designed to meet your personalised goals" to `CARD_CATALOG_HEADINGS`
- [ ] Confirm the filter UI (`Choose a filter`, `Reset`, `Apply`) renders acceptably (matches live) or strip it if broken
- [ ] Confirm the correct product thumbnail image is kept per card (not the logo/offer image)
- [ ] Confirm compare junk (`Add account for comparison`, `Close Compare…`) is stripped
- [ ] Lint `scripts/scripts.js` (`npx eslint`)
- [ ] Commit and deploy to `main` (one-shot in-memory GitHub token; never written to disk/config)
- [ ] Verify on the edge: 8 product cards render as a responsive grid with image + title + bullets + Open Savings Account / Know More buttons; no flat list; no leftover compare junk
- [ ] Confirm no regressions to the already-fixed hero carousel, broken icons, and Benefits carousel

## Notes
- Continuation of the savings-account polish (hero carousel, broken icons, and Benefits section already fixed and deployed).
- Reminder: the GitHub token pasted earlier is exposed in the conversation and should be rotated.

> This plan is in Plan mode. Applying the code change, deploying, and verifying requires switching to **Execute mode**.
```
