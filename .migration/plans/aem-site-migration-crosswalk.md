# Fix Savings-Account Product Cards Grid (render as cards, not a flat list)

## Problem
On the **savings-account** page, the product cards under the heading **"Types of Savings Accounts designed to meet your personalised goals"** render as a flat vertical stack of loose paragraphs/images/lists instead of a proper card grid.

**Root cause:** The autoblock builder `buildCardCatalog` in `scripts/scripts.js` only fires for headings listed in `CARD_CATALOG_HEADINGS` (currently just `"Types of Debit cards"` and `"Solutions built around your business"`). The savings-account products heading is **not** in that list, so no `card-catalog` block is built and the content stays as default flat content.

## Source Structure (from rendered DOM)
Under the "Types of Savings Accounts…" heading, the content is:
1. A filter UI: an `h5 "Choose a filter"` + `Reset` / `Apply` link paragraphs (NOT cards — must be skipped/removed).
2. A flat run of **8 product cards**, each made of: two image `<p>`s (thumbnail + logo/offer), a title `<p>` (e.g. "811 Digital Bank Account"), optional meta `<p>`(s), a bullets `<ul>`, and `Open Savings Account` / `Know More` link `<p>`s.
3. Trailing junk: three `"Add account for comparison"` paragraphs and a `"Close CompareCompare Saving Accounts"` paragraph.
4. Ends at the next `h2` ("Explore other savings account options…").

## Approach
Reuse the existing `buildOneCardCatalog` machinery (it already groups loose paragraphs into cards by detecting image `<p>` boundaries, collects body content, and emits a `.card-catalog` block). Two adjustments needed:

1. **Register the heading** — add `"Types of Savings Accounts designed to meet your personalised goals"` to `CARD_CATALOG_HEADINGS` so `buildCardCatalog` runs on it.
2. **Skip the filter UI + compare junk** — ensure the builder does not treat the `Choose a filter` / `Reset` / `Apply` controls or the `Add account for comparison` / `Close Compare…` paragraphs as card content. Verify `buildOneCardCatalog`'s existing `JUNK` regex and start logic handle these; extend the junk filter if the filter-UI lines leak into the first card.

After building, confirm each card shows: image, title, bullets, and the Apply/Know More buttons, laid out as a responsive grid matching the live site.

## Files
- `scripts/scripts.js` — `CARD_CATALOG_HEADINGS` array (~line 140) and, if needed, the junk-skipping logic inside `buildOneCardCatalog` (~line 153).
- Possibly `blocks/card-catalog/card-catalog.css` — only if the grid styling needs tweaks for this variant (verify first; do not change preemptively).

## Checklist
- [ ] Read `buildOneCardCatalog` / `buildCardCatalog` in `scripts/scripts.js` to confirm the grouping logic fits the savings products structure
- [ ] Add the "Types of Savings Accounts designed to meet your personalised goals" heading to `CARD_CATALOG_HEADINGS`
- [ ] Ensure the filter UI (`Choose a filter`, `Reset`, `Apply`) and compare junk (`Add account for comparison`, `Close Compare…`) are excluded from card content
- [ ] Lint `scripts/scripts.js` (`npx eslint`)
- [ ] Commit and deploy to `main` (one-shot in-memory GitHub token; never written to disk/config)
- [ ] Verify on the edge: 8 product cards render as a grid with image + title + bullets + Apply/Know More buttons, no flat list, no leftover filter/compare junk
- [ ] Confirm no regressions to the already-fixed hero carousel, icons, and Benefits section

## Notes
- This is a continuation of the savings-account polish (hero carousel, broken icons, and Benefits section already fixed and deployed).
- Reminder: the GitHub token pasted earlier is exposed in the conversation and should be rotated.

> This plan is in Plan mode. Applying the code change, deploying, and verifying requires switching to **Execute mode**.
```
