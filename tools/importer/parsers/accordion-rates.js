/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-rates. Base: accordion.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Block library structure: 2 columns, multiple rows. First row = block name.
 * Each subsequent row = one accordion item: [title/summary, content].
 * UE model (accordion-rates-item): summary (text), text (richtext).
 *   Row cells: cell 1 -> field:summary, cell 2 -> field:text.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Each rate card is an accordion item. Validated against source: each
  // `.ratecard .rate-card` contains an `h2.target` (clickable title) and a
  // `.toggle-ctnt` (expandable content).
  let items = Array.from(element.querySelectorAll('.rate-card'));
  if (!items.length) {
    // Fallbacks for generic accordion markup variations.
    items = Array.from(element.querySelectorAll('.accordion-item, .faq-item, .panel'));
  }

  // Product-page accordion (`.prod-accordion`): items are NOT wrapped — the
  // title (`h2.target`) and body (`.toggle-ctnt`) are flat siblings. Pair each
  // heading with the `.toggle-ctnt` that follows it.
  if (!items.length) {
    const headings = Array.from(element.querySelectorAll('h2.target, h3.target'));
    if (headings.length) {
      headings.forEach((titleEl) => {
        // The body is the next sibling (or nearest following) `.toggle-ctnt`.
        let contentEl = titleEl.nextElementSibling;
        while (contentEl && !contentEl.classList.contains('toggle-ctnt')) {
          contentEl = contentEl.nextElementSibling;
        }

        const summaryFrag = document.createDocumentFragment();
        summaryFrag.appendChild(document.createComment(' field:summary '));
        const clone = titleEl.cloneNode(true);
        clone.querySelectorAll('figure, img, i, .icon-more-arow').forEach((n) => n.remove());
        summaryFrag.appendChild(document.createTextNode(clone.textContent.replace(/\s+/g, ' ').trim()));

        const contentFrag = document.createDocumentFragment();
        contentFrag.appendChild(document.createComment(' field:text '));
        if (contentEl) {
          const body = contentEl.querySelector('.cmp-text, .block') || contentEl;
          Array.from(body.childNodes).forEach((n) => contentFrag.appendChild(n.cloneNode(true)));
        }

        cells.push([summaryFrag, contentFrag]);
      });
    }
  }

  items.forEach((item) => {
    // Title / summary: prefer the heading text, strip icons/figures.
    const titleEl = item.querySelector('h2.target, h2, h3, .accordion-title, .faq-question');
    const contentEl = item.querySelector('.toggle-ctnt, .accordion-content, .faq-answer, .panel-body');

    // Build the summary cell: plain text label (icons/arrows excluded).
    const summaryFrag = document.createDocumentFragment();
    summaryFrag.appendChild(document.createComment(' field:summary '));
    if (titleEl) {
      // Clone so we can clean decorative nodes without mutating the source.
      const clone = titleEl.cloneNode(true);
      clone.querySelectorAll('figure, img, i, .icon-more-arow').forEach((n) => n.remove());
      const label = clone.textContent.replace(/\s+/g, ' ').trim();
      summaryFrag.appendChild(document.createTextNode(label));
    }

    // Build the content cell with the expandable body (richtext).
    const contentFrag = document.createDocumentFragment();
    contentFrag.appendChild(document.createComment(' field:text '));
    if (contentEl) {
      // Use the inner content; fall back to the element itself.
      const body = contentEl.querySelector('.block') || contentEl;
      Array.from(body.childNodes).forEach((n) => contentFrag.appendChild(n.cloneNode(true)));
    }

    cells.push([summaryFrag, contentFrag]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-rates', cells });
  element.replaceWith(block);
}
