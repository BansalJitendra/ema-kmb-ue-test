# Full Site Migration Plan — Kotak Bank (Crosswalk / Universal Editor)

## Overview
Migrate the Kotak Bank website to AEM Edge Delivery Services (Universal Editor / crosswalk project). The migration covers **content, design/styling, navigation, and footer**. Work happens in the current EDS project (confirmed crosswalk project with `component-models.json`, `models/`, and `blocks/`).

**Source site URL:** `https://www.kotak.bank.in/en/home.html`

**Project type:** Crosswalk / Universal Editor (confirmed — JCR/XML content, component models present).

## Migration Stages

### Stage 1 — Scope & Discovery
- Discover all site URLs (sitemap or crawl) starting from the home page.
- Analyze pages and group them into page templates (page types).
- Catalog the blocks/components needed across templates.
- Produce a migration scope report (templates, block inventory, page counts, effort estimate).
- **Review checkpoint:** confirm template grouping and block list before building.

### Stage 2 — Site Design System
- Extract design tokens (colors, typography, spacing) from the source site.
- Apply global styles to the EDS project (styles, fonts, CSS variables).

### Stage 3 — Block Variants & Design
- For each block variant identified per template, create/style the EDS block to match the original.
- Visually verify each block against the source.

### Stage 4 — Import Infrastructure
- Generate page template skeletons (`page-templates.json`).
- Generate block parsers and page transformers.
- Build the bundled import script.
- For crosswalk: validate Universal Editor block models and field hinting (JCR/XML conversion).

### Stage 5 — Content Import
- Run the import across all discovered URLs (per template).
- Generate content documents in the project.
- Verify rendering in preview.

### Stage 6 — Navigation
- Migrate and instrument the site header/navigation (desktop, mobile, megamenu as applicable — banking sites typically have a large megamenu).
- Validate nav structure against source screenshots.

### Stage 7 — Footer
- Migrate and instrument the site footer (desktop, mobile).
- Validate appearance and behavior against source.

### Stage 8 — Validation & QA
- Full-site visual critique comparing migrated pages to originals.
- Fix styling/structure issues iteratively.
- Validate crosswalk JCR/XML output integrity.

## Checklist
- [x] **Confirm source site URL** — `https://www.kotak.bank.in/en/home.html`
- [ ] Discover all URLs via sitemap/crawl
- [ ] Analyze pages and group into page templates
- [ ] Catalog required blocks/components
- [ ] Produce migration scope report
- [ ] **Review checkpoint:** approve templates & block inventory
- [ ] Extract design tokens from source
- [ ] Apply global site design (styles, fonts, tokens)
- [ ] Create/style block variants per template
- [ ] Visually verify each block vs. source
- [ ] Generate page template skeletons (`page-templates.json`)
- [ ] Generate block parsers and page transformers
- [ ] Build bundled import script
- [ ] Validate Universal Editor block models & field hinting
- [ ] Run content import across all URLs
- [ ] Verify content rendering in preview
- [ ] Migrate & instrument navigation (desktop/mobile/megamenu)
- [ ] Validate navigation structure
- [ ] Migrate & instrument footer (desktop/mobile)
- [ ] Validate footer appearance & behavior
- [ ] Full-site visual critique vs. originals
- [ ] Fix issues iteratively
- [ ] Validate crosswalk JCR/XML output integrity

## Scope Considerations
- Kotak Bank is a large banking site — full URL discovery may return hundreds/thousands of pages. After discovery, we'll review the scope report together and decide whether to migrate all templates or prioritize a subset.
- Banking sites often have complex navigation (megamenu) and rich footers; these stages may require extra validation iterations.

## Open Items
- After Stage 1 scope report, confirm whether to proceed with the full site or a prioritized subset of templates.

> Note: This plan is in Plan mode. Execution (URL discovery, analysis, file generation, import) requires switching to **Execute mode**.
