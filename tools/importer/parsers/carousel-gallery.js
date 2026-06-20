/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-gallery. Base: carousel.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (carousel convention): each slide = one row with 2 cells.
 *   Cell 1: image -> field:media_image (alt -> media_imageAlt).
 *   Cell 2: optional text -> field:content_text.
 * Source: owl gallery; slides carry one or more images (`.item` / figures).
 *   Cloned owl items are de-duplicated by image signature.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Prefer explicit slide items; the gallery owl uses `.item` per slide.
  let slides = Array.from(element.querySelectorAll('.owl-carousel .item'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('.owl-item'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('[class*="slide"], figure'));

  const seen = new Set();

  slides.forEach((slide) => {
    const img = slide.querySelector('img');
    if (!img) return;
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (seen.has(src)) return;
    seen.add(src);

    // Cell 1 - image.
    const imageCell = document.createDocumentFragment();
    imageCell.appendChild(document.createComment(' field:media_image '));
    imageCell.appendChild(img.cloneNode(true));

    // Cell 2 - optional caption/text (heading, paragraph, link).
    const textCell = document.createDocumentFragment();
    const parts = [];
    slide.querySelectorAll('h2, h3, h4, h5, p, a').forEach((n) => {
      const txt = n.textContent.replace(/\s+/g, ' ').trim();
      if (txt) parts.push(n.cloneNode(true));
    });
    if (parts.length) {
      textCell.appendChild(document.createComment(' field:content_text '));
      parts.forEach((n) => textCell.appendChild(n));
    }

    cells.push([imageCell, textCell]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-gallery', cells });
  element.replaceWith(block);
}
