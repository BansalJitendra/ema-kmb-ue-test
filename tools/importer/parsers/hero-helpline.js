/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-helpline. Base: hero.
 * Source: Kotak Bank (ema-kmb-ue-test). Generated for xwalk import.
 *
 * Hero convention: 1 column, up to 3 rows (block name / image / text).
 * UE model (hero-helpline): image (reference, alt -> imageAlt), text (richtext).
 *   Row 2 (single cell): banner image -> field:image.
 *   Row 3 (single cell): heading + supporting text + CTA -> field:text.
 * Source: a thin carousel banner — typically a single linked image, sometimes
 *   accompanied by a heading/description (`.hero-banner` content).
 */
export default function parse(element, { document }) {
  // Use the first slide if this is a rotating banner, else the element itself.
  const scope = element.querySelector('.owlcarousal-slide, .hero-carousel-item') || element;

  const img = scope.querySelector('picture img, img.slider-img, img.hs-image, img');

  const contentHost = element.querySelector('.hero-container, .hero-banner-content, .details-box')
    || element;
  const heading = contentHost.querySelector('h1, h2, h3, .hero-banner-title');
  const desc = contentHost.querySelector('.hero-banner-desc, p');
  const ctas = Array.from(contentHost.querySelectorAll('.btn-box a, a.btn, a.em-cta, .link-box a'));

  if (!img && !heading && !desc) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2 - banner image.
  if (img) {
    const imageCell = document.createDocumentFragment();
    imageCell.appendChild(document.createComment(' field:image '));
    imageCell.appendChild(img.cloneNode(true));
    cells.push([imageCell]);
  }

  // Row 3 - text (heading + description + CTA), only when present.
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

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-helpline', cells });
  element.replaceWith(block);
}
