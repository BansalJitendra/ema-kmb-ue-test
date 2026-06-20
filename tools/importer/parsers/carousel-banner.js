/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-banner. Base: carousel.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Container block (carousel convention): each slide = one row with 2 cells.
 *   Cell 1: background image -> field:media_image (alt -> media_imageAlt).
 *   Cell 2: text (title + description + CTAs) -> field:content_text.
 * Source: owl carousel; real slides are `.hero-carousel-item`. Cloned owl
 *   items (`.owl-item.cloned`) are excluded to avoid duplicate slides.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Collect slides. The owl carousel duplicates slides as `.owl-item.cloned`
  // (and JS may not have run during import), so gather all candidate slides and
  // de-duplicate by content signature below rather than relying on owl classes.
  let slides = Array.from(element.querySelectorAll('.hero-carousel-item'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('.owl-item'));
  if (!slides.length) slides = Array.from(element.querySelectorAll('.hero-slider, [class*="slide"]'));

  // De-duplicate identical slides (owl can mark several as active).
  const seen = new Set();

  slides.forEach((slide) => {
    const img = slide.querySelector('picture img, img.hs-image, img');
    const content = slide.querySelector('.hero-container, .hero-banner-content');

    // Build a signature to skip duplicates.
    const sig = (img ? img.getAttribute('src') || '' : '') + '|'
      + (content ? content.textContent.replace(/\s+/g, ' ').trim() : '');
    if (seen.has(sig)) return;
    seen.add(sig);

    // Cell 1 - image.
    const imageCell = document.createDocumentFragment();
    if (img) {
      imageCell.appendChild(document.createComment(' field:media_image '));
      imageCell.appendChild(img.cloneNode(true));
    }

    // Cell 2 - text content (title, description, CTAs).
    const textCell = document.createDocumentFragment();
    const parts = [];
    if (content) {
      const title = content.querySelector('h1, h2, h3, .hero-banner-title');
      const desc = content.querySelector('.hero-banner-desc');
      const ctas = Array.from(content.querySelectorAll('.btn-box a, a.btn'));
      if (title) parts.push(title.cloneNode(true));
      if (desc) parts.push(desc.cloneNode(true));
      ctas.forEach((a) => parts.push(a.cloneNode(true)));
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

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-banner', cells });
  element.replaceWith(block);
}
