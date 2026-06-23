# Fix Credit-Cards "3 Easy Steps" Icons (broken tokenized step glyphs)

## Problem
On the **credit-cards** page, under the heading **"Get an instant Credit Card in just 3 easy steps!"**, the three step icons do not appear — they render as empty/broken boxes.

**Root cause:** The three icons migrated as tokenized icons that EDS resolves to missing local files. In the rendered DOM they appear as:
- `<span class="icon icon-cc-step-1">`, `icon-cc-step-2`, `icon-cc-step-3`, each producing `<img src="/icons/cc-step-1.svg">` … which **404** (`naturalWidth = 0`, broken).

These three tokens (`cc-step-1`, `cc-step-2`, `cc-step-3`) are **not** in the `ICON_FIX` map in `scripts/scripts.js` (scripts.js:402), so `fixTokenizedIcons` leaves them pointing at the broken local paths.

## Verified Source URLs (from live Kotak page)
The live site serves these icons from:
- `https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-1.svg`
- `https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-2.svg`
- `https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-3.svg`

(Live `<img>` `src`/`alt` confirmed as `/content/dam/Kotak/svg-icons/cc-step-{1,2,3}.svg`.)

## Approach
Reuse the existing icon-fix machinery — no new function needed. `fixTokenizedIcons` (scripts.js:426) already:
1. Rewrites `span.icon icon-NAME` whose `NAME` is in `ICON_FIX`, and
2. Rewrites broken `<img src="/icons/NAME.svg">` whose `NAME` is in `ICON_FIX` (the broken-`<img>` branch added earlier),
and it runs on every page via `buildAutoBlocks`.

So the only change is to **add the three step tokens** to the `ICON_FIX` map:
```js
'cc-step-1': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-1.svg',
'cc-step-2': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-2.svg',
'cc-step-3': 'https://www.kotak.bank.in/content/dam/Kotak/svg-icons/cc-step-3.svg',
```
The tokens are specific (`cc-step-*`), so this is safe site-wide — no risk of clobbering icons on other pages.

## Files
- `scripts/scripts.js` — add three entries to the `ICON_FIX` object (scripts.js:402‑414). No other changes.

## Checklist
- [ ] Confirm the three live source URLs resolve (HTTP 200, image/svg) before adding them
- [ ] Add `cc-step-1`, `cc-step-2`, `cc-step-3` entries to `ICON_FIX` in `scripts/scripts.js`
- [ ] Lint `scripts/scripts.js` (`npx eslint scripts/scripts.js`)
- [ ] Commit and deploy to `main` (one-shot in-memory GitHub token; never written to disk/config; redact token in output)
- [ ] Wait for deploy, then verify on the edge: the three step icons under "Get an instant Credit Card in just 3 easy steps!" load (no broken images; `naturalWidth > 0`)
- [ ] Confirm no regression to other already-fixed icons (savings-account feature/offer glyphs, car-loan apply/TIP icons) — they share the same `ICON_FIX` map and `fixTokenizedIcons` path

## Notes
- Same class of issue as the earlier savings-account and car-loan broken-icon fixes: tokenized icons resolving to missing local `/icons/*.svg`, fixed by mapping the token to the real Kotak DAM SVG URL.
- This is a client-side render fix (autoblock), not an authored-content change — it deploys via the code push to the Edge Delivery site, not to AEM Author.
- Reminder: the GitHub and AEM Author tokens pasted earlier in this conversation are exposed and should be rotated when convenient.

> This plan is in Plan mode. Applying the code change, deploying, and verifying requires switching to **Execute mode**.
