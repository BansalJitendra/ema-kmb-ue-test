/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-promo. Base: hero.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Hero convention: 1 column, up to 3 rows (block name / image / text).
 * UE model (hero-promo): image (reference, alt -> imageAlt), text (richtext).
 *   Row 2 (single cell): background image -> field:image.
 *   Row 3 (single cell): title + subheading + CTA -> field:text.
 */
export default function parse(element, { document }) {
  // The hero may be a slide within a carousel; use the first meaningful slide
  // so we capture exactly one promo (CTAs/text are scoped to that slide).
  const scope = element.querySelector('.hero-carousel-item') || element;

  // Background / hero image (first within the chosen slide).
  const img = scope.querySelector('picture img, img.hs-image, img');

  // Text content: prefer a hero content container, else the heading region.
  const contentHost = scope.querySelector('.hero-container, .hero-banner-content, .details-box')
    || scope;
  const heading = contentHost.querySelector('h1, h2, h3, .hero-banner-title, .em-title');
  const desc = contentHost.querySelector('.hero-banner-desc, .info-box, p');
  const ctas = Array.from(contentHost.querySelectorAll('.btn-box a, a.btn, a.em-cta, .link-box a'));

  if (!img && !heading && !desc) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2 - image (single cell).
  if (img) {
    const imageCell = document.createDocumentFragment();
    imageCell.appendChild(document.createComment(' field:image '));
    imageCell.appendChild(img.cloneNode(true));
    cells.push([imageCell]);
  }

  // Row 3 - text (single cell): title + subheading + CTA(s).
  const textCell = document.createDocumentFragment();
  const parts = [];
  if (heading) parts.push(heading.cloneNode(true));
  if (desc) parts.push(desc.cloneNode(true));
  ctas.forEach((a) => parts.push(a.cloneNode(true)));
  if (parts.length) {
    textCell.appendChild(document.createComment(' field:text '));
    parts.forEach((n) => textCell.appendChild(n));
    cells.push([textCell]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-promo', cells });
  element.replaceWith(block);
}
