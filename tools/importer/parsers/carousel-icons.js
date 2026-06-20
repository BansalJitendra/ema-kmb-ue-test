/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-icons. Base: carousel.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (carousel convention): each slide = one row with 2 cells.
 *   Cell 1: icon image -> field:media_image (alt -> media_imageAlt).
 *   Cell 2: text (title + description) -> field:content_text.
 * Source: owl icon slider; each slide is `.iconsider-large` (within an anchor)
 *   with `.iconsider-large-img img`, `.iconsider-title` and `.iconsider-dec`.
 *   Cloned owl items are de-duplicated by image+title signature.
 */
export default function parse(element, { document }) {
  const cells = [];

  let slides = Array.from(element.querySelectorAll('.iconsider-large'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('.owl-item'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('[class*="slide"], li'));

  const seen = new Set();

  slides.forEach((slide) => {
    const img = slide.querySelector('img');
    const title = slide.querySelector('.iconsider-title, h3, h4, .title');
    const desc = slide.querySelector('.iconsider-dec, p, .desc');
    const link = slide.closest('a') || slide.querySelector('a');

    const sig = (img ? img.getAttribute('src') || '' : '') + '|'
      + (title ? title.textContent.replace(/\s+/g, ' ').trim() : '');
    if (sig === '|') return;
    if (seen.has(sig)) return;
    seen.add(sig);

    // Cell 1 - icon image.
    const imageCell = document.createDocumentFragment();
    if (img) {
      imageCell.appendChild(document.createComment(' field:media_image '));
      imageCell.appendChild(img.cloneNode(true));
    }

    // Cell 2 - text content (wrap title + desc in the slide link if present).
    const textCell = document.createDocumentFragment();
    const parts = [];
    if (link && (title || desc)) {
      const a = document.createElement('a');
      const href = link.getAttribute('href');
      if (href) a.setAttribute('href', href);
      if (title) a.appendChild(title.cloneNode(true));
      if (desc) a.appendChild(desc.cloneNode(true));
      parts.push(a);
    } else {
      if (title) parts.push(title.cloneNode(true));
      if (desc) parts.push(desc.cloneNode(true));
    }
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

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-icons', cells });
  element.replaceWith(block);
}
