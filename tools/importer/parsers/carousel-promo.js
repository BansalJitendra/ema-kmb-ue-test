/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-promo. Base: carousel.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (carousel convention): each slide = one row with 2 cells.
 *   Cell 1: promo image -> field:media_image (alt -> media_imageAlt).
 *   Cell 2: optional link/text -> field:content_text.
 * Source: owl carousel; each slide is `.owlcarousal-slide` wrapping an
 *   `<a><picture><img></a>`. Cloned owl items are de-duplicated by href+src.
 */
export default function parse(element, { document }) {
  const cells = [];

  let slides = Array.from(element.querySelectorAll('.owlcarousal-slide'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('.owl-item'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('[class*="slide"]'));

  const seen = new Set();

  slides.forEach((slide) => {
    const img = slide.querySelector('img');
    if (!img) return;
    const link = slide.querySelector('a');
    const href = link ? link.getAttribute('href') || '' : '';
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    const sig = `${href}|${src}`;
    if (seen.has(sig)) return;
    seen.add(sig);

    // Cell 1 - promo image.
    const imageCell = document.createDocumentFragment();
    imageCell.appendChild(document.createComment(' field:media_image '));
    imageCell.appendChild(img.cloneNode(true));

    // Cell 2 - optional CTA link (the slide is usually a linked image; keep
    // the link as the slide's text content when it carries a label).
    const textCell = document.createDocumentFragment();
    const label = link ? link.textContent.replace(/\s+/g, ' ').trim() : '';
    if (link && href && label) {
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = label;
      textCell.appendChild(document.createComment(' field:content_text '));
      textCell.appendChild(a);
    }

    cells.push([imageCell, textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-promo', cells });
  element.replaceWith(block);
}
